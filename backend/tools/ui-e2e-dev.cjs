/* End-to-end UI verification against the Vite dev server (http://localhost:5173).
 * Seeds a user via the API, injects the session into localStorage, then walks
 * every sidebar page collecting render text and console/page errors. */
const API = process.env.API || 'http://localhost:4000';
const APP = process.env.APP || 'http://localhost:5173';
const CDP = process.env.CDP || 'http://localhost:9229';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiCall(method, p, body, token) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`timeout: ${method}`)); }
      }, 30000);
    });
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(new Cdp(ws)));
    ws.addEventListener('error', () => reject(new Error('ws error')));
  });
}

const IGNORED = [/favicon\.ico/i];

(async () => {
  // ---------- seed a fresh user with representative data ----------
  const email = `e2e_${Date.now()}@spendwise.test`;
  let r = await apiCall('POST', '/api/auth/register', { name: 'E2E Tester', email, password: 'Passw0rd!23' });
  if (![200, 201].includes(r.status)) throw new Error(`register failed ${JSON.stringify(r.data)}`);
  const token = r.data.token;
  const user = r.data.user;

  const txns = [
    { title: 'Salary', amount: 120000, type: 'income', category: 'Salary', date: '2026-10-01', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Groceries', amount: 6400, type: 'expense', category: 'Food', date: '2026-10-03', paymentMethod: 'UPI', tags: ['groceries'] },
    { title: 'Metro pass', amount: 1800, type: 'expense', category: 'Transport', date: '2026-10-05', paymentMethod: 'Card', tags: [] },
    { title: 'Rent', amount: 32000, type: 'expense', category: 'Bills', date: '2026-10-02', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Concert tickets', amount: 4200, type: 'expense', category: 'Entertainment', date: '2026-09-12', paymentMethod: 'UPI', tags: [] },
    { title: 'Freelance payout', amount: 22000, type: 'income', category: 'Freelance', date: '2026-09-20', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Dining out', amount: 2600, type: 'expense', category: 'Food', date: '2026-08-14', paymentMethod: 'Card', tags: [] },
  ];
  for (const t of txns) await apiCall('POST', '/api/expenses', t, token);
  await apiCall('POST', '/api/budgets', { category: 'Food', month: '2026-10', limit: 10000 }, token);
  await apiCall('POST', '/api/budgets', { category: 'Bills', month: '2026-10', limit: 30000 }, token);
  await apiCall('POST', '/api/goals', { title: 'Emergency fund', targetAmount: 200000, currentAmount: 45000, targetDate: '2026-12-31', category: 'General' }, token);
  await apiCall('POST', '/api/recurring', { title: 'Netflix', amount: 649, type: 'expense', category: 'Other', frequency: 'monthly', day: 5, paymentMethod: 'Card' }, token);

  // ---------- launch chrome ----------
  const profile = path.join(os.tmpdir(), 'spendwise-e2e-profile');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${new URL(CDP).port || 9229}`,
    `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank',
  ], { stdio: 'ignore' });
  const cleanup = () => { try { chrome.kill(); } catch {} };
  process.on('exit', cleanup);

  for (let i = 0; i < 40; i += 1) { try { await (await fetch(`${CDP}/json/version`)).json(); break; } catch { await sleep(500); } }
  const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);

  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');

  const errors = [];
  const failedRequests = [];
  cdp.ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(`EXCEPTION: ${d.exception?.description || d.text}`);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const line = `CONSOLE.error: ${msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ')}`;
      if (!IGNORED.some((re) => re.test(line))) errors.push(line);
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      const line = `LOG: ${msg.params.entry.text} ${msg.params.entry.url || ''}`;
      if (!IGNORED.some((re) => re.test(line))) errors.push(line);
    }
    if (msg.method === 'Network.responseReceived') {
      const { response } = msg.params;
      if (response.status >= 400 && !/favicon\.ico/i.test(response.url)) {
        failedRequests.push(`${response.status} ${response.url}`);
      }
    }
  });

  const evalJs = (expression) => cdp.send('Runtime.evaluate', { expression, returnByValue: true })
    .then((x) => (x?.exceptionDetails ? { __exc: x.exceptionDetails.text } : x?.result?.value))
    .catch((e) => ({ __exc: e.message }));

  // Load the app (login screen), then inject the session same-origin and reload.
  await cdp.send('Page.navigate', { url: APP });
  await sleep(3000);
  // Drop any stale session left in the persistent Chrome profile, then start
  // measuring from a clean slate.
  await evalJs(`(() => { localStorage.clear(); sessionStorage.clear(); return true; })()`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(3000);
  errors.length = 0;
  failedRequests.length = 0;
  await evalJs(`(() => {
    localStorage.setItem('token', ${JSON.stringify(token)});
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user))});
    return true;
  })()`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(4500);

  const shell = await evalJs(`(() => ({
    href: location.href,
    title: document.title,
    hasSidebar: !!document.querySelector('.floating-sidebar, .sidebar'),
    hasCanvas: !!document.querySelector('.content-canvas'),
    navCount: document.querySelectorAll('.sidebar-nav .sidebar-link').length,
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 220),
  }))()`);
  console.log('SHELL:', JSON.stringify(shell, null, 2));
  if (!shell.hasSidebar || !shell.hasCanvas) {
    console.log('\n=== ERRORS ===');
    errors.slice(0, 30).forEach((e) => console.log(e));
    console.log('\n=== FAILED REQUESTS ===');
    failedRequests.slice(0, 30).forEach((e) => console.log(e));
    cleanup();
    process.exit(1);
  }

  const pages = [
    { id: 'overview', label: 'Overview', expect: /balance|income|expense/i },
    { id: 'transactions', label: 'Transactions', expect: /transaction|amount/i },
    { id: 'analytics', label: 'Analytics', expect: /analytics|trend|spending/i },
    { id: 'budgets', label: 'Budgets', expect: /budget/i },
    { id: 'goals', label: 'Savings Goals', expect: /goal/i },
    { id: 'categories', label: 'Categories', expect: /categor/i },
    { id: 'ai', label: 'AI Assistant', expect: /ai|assistant|insight/i },
    { id: 'recurring', label: 'Recurring', expect: /recurring|subscription/i },
    { id: 'reports', label: 'Reports', expect: /report|export/i },
    { id: 'settings', label: 'Settings', expect: /setting|profile|theme/i },
  ];

  const results = [];
  for (const p of pages) {
    const beforeErr = errors.length;
    const beforeReq = failedRequests.length;
    const clicked = await evalJs(`(() => {
      const links = Array.from(document.querySelectorAll('.sidebar-nav .sidebar-link'));
      const el = links.find((b) => (b.textContent || '').trim().toLowerCase() === ${JSON.stringify(p.label.toLowerCase())});
      if (!el) return false;
      el.click();
      return true;
    })()`);
    await sleep(1800);
    const info = await evalJs(`(() => {
      const text = document.body.innerText || '';
      const flat = text.replace(/\\s+/g, ' ');
      return {
        len: text.length,
        sample: flat.slice(0, 180),
        body: flat.slice(0, 6000),
        emptyState: !!document.querySelector('.empty-state'),
        errorText: /something went wrong|failed to load|session expired/i.test(text),
      };
    })()`);
    results.push({
      page: p.label,
      clicked: !!clicked,
      ok: clicked && info && info.len > 120 && !info.errorText && p.expect.test(info.body),
      info,
      errors: errors.slice(beforeErr),
      failed: failedRequests.slice(beforeReq),
    });
  }

  console.log('\n=== PAGE RESULTS ===');
  for (const r of results) {
    const status = r.ok ? 'OK  ' : 'FAIL';
    console.log(`${status} ${r.page.padEnd(16)} clicked=${r.clicked} len=${r.info?.len ?? '?'} :: ${r.info?.sample ?? ''}`);
    r.errors.forEach((e) => console.log(`      ${e}`));
    r.failed.forEach((e) => console.log(`      REQ ${e}`));
  }

  // Interaction: open the global add-transaction modal from the topbar.
  const modalBefore = errors.length;
  await evalJs(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const el = btns.find((b) => /add|new transaction|quick/i.test(b.textContent || '') && !/budget|goal/i.test(b.textContent || ''));
    if (el) { el.click(); return true; }
    return false;
  })()`);
  await sleep(900);
  const modal = await evalJs(`(() => ({
    open: !!document.querySelector('.modal-card, [role="dialog"]'),
    inputs: document.querySelectorAll('.modal-card input, [role="dialog"] input').length,
  }))()`);
  console.log('\nADD-MODAL:', JSON.stringify(modal));

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(1000);
  const mobile = await evalJs(`(() => ({
    bottomBar: !!document.querySelector('.mobile-bottom-bar'),
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
    viewport: window.innerWidth,
  }))()`);
  console.log('MOBILE:', JSON.stringify(mobile));
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await sleep(500);

  const shotPath = path.join(os.tmpdir(), 'spendwise-e2e.png');
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  console.log('SCREENSHOT:', shotPath);

  const modalErrors = errors.slice(modalBefore);
  console.log('\n=== CONSOLE / PAGE ERRORS ===');
  if (!errors.length) console.log('none');
  else errors.slice(0, 40).forEach((e) => console.log(e));
  console.log('=== FAILED REQUESTS ===');
  if (!failedRequests.length) console.log('none');
  else failedRequests.slice(0, 40).forEach((e) => console.log(e));

  const failedPages = results.filter((r) => !r.ok);
  cleanup();
  process.exit(errors.length || failedPages.length ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
