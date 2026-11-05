/* Browser-level smoke test using Chrome DevTools Protocol (no extra deps). */
const BASE = process.env.BASE || 'http://localhost:4000';
const CDP = process.env.CDP || 'http://localhost:9222';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiCall(method, p, body, token) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
    this.events = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 30000);
    });
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(new Cdp(ws)));
    ws.addEventListener('error', (e) => reject(new Error(`ws error ${e.message || ''}`)));
  });
}

(async () => {
  // ---------- seed a user with data ----------
  const email = `ui_${Date.now()}@spendwise.test`;
  let r = await apiCall('POST', '/api/auth/register', { name: 'UI Tester', email, password: 'Passw0rd!23' });
  if (r.status !== 200 && r.status !== 201) throw new Error(`register failed ${JSON.stringify(r.data)}`);
  const token = r.data.token;

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
  const profile = path.join(os.tmpdir(), 'spendwise-cdp-profile');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profile}`,
    '--window-size=1440,1000',
    'about:blank',
  ], { stdio: 'ignore' });

  const cleanup = () => { try { chrome.kill(); } catch {} };
  process.on('exit', cleanup);

  // wait for devtools
  let ver = null;
  for (let i = 0; i < 40; i += 1) {
    try { ver = await (await fetch(`${CDP}/json/version`)).json(); break; } catch { await sleep(500); }
  }
  if (!ver) throw new Error('chrome devtools did not start');

  const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);

  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');

  // Seed the session via a same-origin bootstrap page.
  const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  const bootstrap = `<!doctype html><meta charset="utf-8"><script>
    localStorage.setItem('token', ${JSON.stringify(token)});
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(r.data.user))});
    location.replace('/');
  </script>`;
  fs.writeFileSync(path.join(distDir, '__seed.html'), bootstrap);

  const problems = [];
  const consoleErrors = [];

  cdp.ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleErrors.push(`EXCEPTION: ${d.exception?.description || d.text}`);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
      consoleErrors.push(`CONSOLE.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ')}`);
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push(`LOG: ${msg.params.entry.text}`);
    }
  });

  const pages = [
    { key: 'overview', label: 'Overview' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'budgets', label: 'Budgets' },
    { key: 'categories', label: 'Categories' },
    { key: 'goals', label: 'Goals' },
    { key: 'recurring', label: 'Recurring' },
    { key: 'reports', label: 'Reports' },
    { key: 'ai', label: 'AI Assistant' },
    { key: 'settings', label: 'Settings' },
    { key: 'devops', label: 'DevOps' },
  ];

  const results = [];

  // Navigate to the bootstrap once (sets localStorage, redirects to app)
  await cdp.send('Page.navigate', { url: `${BASE}/__seed.html` });
  await sleep(4000);

  for (const p of pages) {
    const before = consoleErrors.length;
    // navigate inside the SPA by clicking the nav item when possible
    const clicked = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const el = btns.find(b => (b.textContent || '').trim().toLowerCase() === ${JSON.stringify(p.label.toLowerCase())});
        if (el) { el.click(); return true; }
        return false;
      })()`,
      returnByValue: true,
    }).then((x) => x.result?.value).catch(() => false);

    if (!clicked) {
      // fallback: full reload (SPA state is internal, so re-navigate via hash not supported) -> report skip
      results.push({ page: p.label, skipped: true });
      continue;
    }
    await sleep(2200);
    const text = await cdp.send('Runtime.evaluate', {
      expression: 'document.body.innerText',
      returnByValue: true,
    }).then((x) => x.result?.value || '');
    const errs = consoleErrors.slice(before);
    results.push({ page: p.label, textLen: text.length, sample: text.slice(0, 160).replace(/\s+/g, ' '), errors: errs });
  }

  console.log('\n=== RENDER RESULTS ===');
  for (const r of results) {
    if (r.skipped) { console.log(`SKIP  ${r.page} (nav item not found)`); continue; }
    console.log(`${r.errors.length ? 'WARN' : 'OK  '}  ${r.page}  len=${r.textLen}  :: ${r.sample}`);
    r.errors.forEach((e) => console.log(`        ${e}`));
  }

  // ---------- interaction test: add a transaction from the Transactions page ----------
  const before = consoleErrors.length;
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const el = btns.find(b => /add transaction/i.test(b.textContent || ''));
      if (el) { el.click(); return true; } return false;
    })()`,
    returnByValue: true,
  });
  await sleep(1200);
  const modalOpen = await cdp.send('Runtime.evaluate', {
    expression: `!!document.querySelector('.modal-card')`,
    returnByValue: true,
  }).then((x) => x.result?.value).catch(() => false);
  console.log(`\nMODAL open after "Add transaction": ${modalOpen ? 'YES' : 'NO'}`);

  // ---------- charts present on analytics ----------
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const el = btns.find(b => (b.textContent||'').trim().toLowerCase() === 'analytics');
      if (el) { el.click(); return true; } return false;
    })()`,
    returnByValue: true,
  });
  await sleep(2500);
  const chartInfo = await cdp.send('Runtime.evaluate', {
    expression: `(() => ({
      svgs: document.querySelectorAll('.recharts-wrapper').length,
      paths: document.querySelectorAll('.recharts-pie-sector, .recharts-rectangle, .recharts-area-area').length,
      kpi: document.querySelectorAll('.kpi-grid > *').length,
      tables: document.querySelectorAll('.glass-table').length,
    }))()`,
    returnByValue: true,
  }).then((x) => x.result?.value);
  console.log('ANALYTICS charts:', JSON.stringify(chartInfo));

  // ---------- mobile viewport ----------
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(1200);
  const mobileInfo = await cdp.send('Runtime.evaluate', {
    expression: `(() => ({
      bottomBar: !!document.querySelector('.mobile-bottom-bar, .bottom-nav, nav.mobile'),
      bodyWidth: document.body.scrollWidth,
      viewport: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
    }))()`,
    returnByValue: true,
  }).then((x) => x.result?.value);
  console.log('MOBILE:', JSON.stringify(mobileInfo));

  // screenshot desktop + mobile
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await sleep(800);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(os.tmpdir(), 'spendwise-analytics.png'), Buffer.from(shot.data, 'base64'));
  console.log(`screenshot -> ${path.join(os.tmpdir(), 'spendwise-analytics.png')}`);

  console.log('\n=== CONSOLE ISSUES ===');
  if (!consoleErrors.length) console.log('none');
  consoleErrors.slice(0, 40).forEach((e) => console.log(e));

  fs.rmSync(path.join(distDir, '__seed.html'), { force: true });
  cleanup();
  process.exit(0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
