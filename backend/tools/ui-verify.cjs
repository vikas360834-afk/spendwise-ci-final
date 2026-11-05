/* Final comprehensive UI verification: every page, expected content, no console errors. */
const BASE = 'http://localhost:4000';
const CDP = 'http://localhost:9225';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { ensureServer } = require('./_harness.cjs');

async function apiCall(method, p, body, token) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  let d; try { d = JSON.parse(t); } catch { d = t; }
  return { status: res.status, data: d };
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id);
        if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); } }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`timeout ${method}`)); } }, 30000); }); }
}
const connect = (url) => new Promise((resolve, reject) => { const ws = new WebSocket(url);
  ws.addEventListener('open', () => resolve(new Cdp(ws))); ws.addEventListener('error', () => reject(new Error('ws'))); });

(async () => {
  const server = await ensureServer();
  const email = `final_${Date.now()}@spendwise.test`;
  let r = await apiCall('POST', '/api/auth/register', { name: 'Final Tester', email, password: 'Passw0rd!23' });
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

  const profile = path.join(os.tmpdir(), 'spendwise-cdp-final');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=9225', `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch {} });

  for (let i = 0; i < 40; i += 1) { try { await (await fetch(`${CDP}/json/version`)).json(); break; } catch { await sleep(500); } }
  const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); await cdp.send('Page.enable');

  const errors = [];
  cdp.ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(`EXCEPTION: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(`CONSOLE.error: ${m.params.args.map(a => a.value ?? a.description).join(' ')}`);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`LOG: ${m.params.entry.text}`); });

  const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  fs.writeFileSync(path.join(distDir, '__seed.html'), `<!doctype html><meta charset="utf-8"><script>
    localStorage.setItem('token', ${JSON.stringify(token)});
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(r.data.user))});
    location.replace('/');</script>`);

  await cdp.send('Page.navigate', { url: `${BASE}/__seed.html` });
  await sleep(4500);

  const evalJs = async (e) => cdp.send('Runtime.evaluate', { expression: e, returnByValue: true }).then(x => x.result?.value);
  const canvas = async () => evalJs(`document.querySelector('.content-canvas')?.innerText?.replace(/\\s+/g,' ') || ''`);

  const pages = [
    { nav: 'Overview', expect: ['Total balance', 'Total income', 'Total expenses', 'Savings rate', 'Budget utilization', 'Recent transactions', 'Financial insights'] },
    { nav: 'Transactions', expect: ['Groceries', 'Concert tickets', 'Add transaction'] },
    { nav: 'Analytics', expect: ['Analytics Workspace', 'Avg. monthly spending', 'Top spending category', 'Largest transaction', 'MoM expense change', 'Expense distribution by category', 'Income vs expenses', 'Spending trend', 'Category breakdown'] },
    { nav: 'Budgets', expect: ['Budgets', 'TOTAL BUDGETED', 'CATEGORY CAPS', 'Food'] },
    { nav: 'Categories', expect: ['Categories', 'Spend distribution', 'Category ranking', 'Category totals'] },
    { nav: 'Savings Goals', expect: ['Savings goals', 'Emergency fund', 'TOTAL TARGET', 'Add goal'] },
    { nav: 'Recurring', expect: ['Recurring payments', 'Netflix', 'Monthly outflow', 'All recurring rules'] },
    { nav: 'Reports', expect: ['Reports', 'Total income', 'Net savings', 'Category summary', 'Monthly history'] },
    { nav: 'AI Assistant', expect: ['AI Financial Intelligence', 'How much did I spend this month?', 'Give suggestions to reduce unnecessary expenses', 'Deterministic'] },
    { nav: 'Settings', expect: ['Settings & security', 'Base currency', 'Colour theme', 'Profile & identity', 'Data & privacy'] },
    { nav: 'DevOps', expect: ['DevOps', 'API status', 'Storage driver', 'AI engine mode', 'Runtime'] },
  ];

  let failures = 0;
  for (const p of pages) {
    const before = errors.length;
    const clicked = await evalJs(`(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent||'').trim() === ${JSON.stringify(p.nav)});
      if (b) { b.click(); return true; } return false; })()`);
    await sleep(3000);
    const txt = await canvas();
    const missing = p.expect.filter((needle) => !txt.toLowerCase().includes(needle.toLowerCase()));
    const pageErrors = errors.slice(before);
    const ok = clicked && !missing.length && !pageErrors.length && txt.length > 200;
    if (!ok) failures += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${p.nav.padEnd(14)} len=${String(txt.length).padEnd(5)} missing=[${missing.join(', ')}] errors=${pageErrors.length}`);
    pageErrors.forEach((e) => console.log('        ' + e));
  }

  console.log(`\n${pages.length - failures}/${pages.length} pages verified`);
  console.log('=== ALL CONSOLE ISSUES ===');
  console.log(errors.length ? errors.join('\n') : 'none');

  fs.rmSync(path.join(distDir, '__seed.html'), { force: true });
  try { chrome.kill(); } catch {}
  if (server) server.kill();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
