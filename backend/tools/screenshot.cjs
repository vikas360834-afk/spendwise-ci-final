/* Capture screenshots of key pages for visual review. */
const BASE = 'http://localhost:4000';
const CDP = 'http://localhost:9226';
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
  const email = `shot_${Date.now()}@spendwise.test`;
  let r = await apiCall('POST', '/api/auth/register', { name: 'Aarav Sharma', email, password: 'Passw0rd!23' });
  const token = r.data.token;
  const txns = [
    { title: 'Monthly salary', amount: 128000, type: 'income', category: 'Salary', date: '2026-10-01', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Freelance payout', amount: 18500, type: 'income', category: 'Freelance', date: '2026-10-14', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Whole Foods groceries', amount: 8450, type: 'expense', category: 'Food', date: '2026-10-04', paymentMethod: 'Card', tags: ['weekly'] },
    { title: 'Uber rides', amount: 1240, type: 'expense', category: 'Transport', date: '2026-10-06', paymentMethod: 'UPI', tags: [] },
    { title: 'Apartment rent', amount: 42000, type: 'expense', category: 'Bills', date: '2026-10-02', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Concert tickets', amount: 4200, type: 'expense', category: 'Entertainment', date: '2026-10-11', paymentMethod: 'UPI', tags: [] },
    { title: 'Pharmacy', amount: 1650, type: 'expense', category: 'Health', date: '2026-10-09', paymentMethod: 'Cash', tags: [] },
    { title: 'New headphones', amount: 12999, type: 'expense', category: 'Shopping', date: '2026-10-16', paymentMethod: 'Card', tags: [] },
    { title: 'Dining out', amount: 3100, type: 'expense', category: 'Food', date: '2026-10-17', paymentMethod: 'UPI', tags: [] },
    { title: 'Electricity bill', amount: 2480, type: 'expense', category: 'Bills', date: '2026-10-08', paymentMethod: 'Netbanking', tags: [] },
    { title: 'Flight to Pune', amount: 21500, type: 'expense', category: 'Travel', date: '2026-09-21', paymentMethod: 'Card', tags: [] },
    { title: 'Groceries', amount: 7100, type: 'expense', category: 'Food', date: '2026-09-12', paymentMethod: 'UPI', tags: [] },
    { title: 'Electricity bill', amount: 2950, type: 'expense', category: 'Bills', date: '2026-08-09', paymentMethod: 'Netbanking', tags: [] },
    { title: 'Internet bill', amount: 1199, type: 'expense', category: 'Bills', date: '2026-07-09', paymentMethod: 'Card', tags: [] },
    { title: 'Dining out', amount: 2740, type: 'expense', category: 'Food', date: '2026-06-18', paymentMethod: 'UPI', tags: [] },
    { title: 'Monthly salary', amount: 118000, type: 'income', category: 'Salary', date: '2026-09-01', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Monthly salary', amount: 118000, type: 'income', category: 'Salary', date: '2026-08-01', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Monthly salary', amount: 115000, type: 'income', category: 'Salary', date: '2026-07-01', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Monthly salary', amount: 115000, type: 'income', category: 'Salary', date: '2026-06-01', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Monthly salary', amount: 112000, type: 'income', category: 'Salary', date: '2026-05-01', paymentMethod: 'Bank Transfer', tags: [] },
  ];
  for (const t of txns) await apiCall('POST', '/api/expenses', t, token);
  await apiCall('POST', '/api/budgets', { category: 'Food', month: '2026-10', limit: 15000 }, token);
  await apiCall('POST', '/api/budgets', { category: 'Bills', month: '2026-10', limit: 45000 }, token);
  await apiCall('POST', '/api/budgets', { category: 'Transport', month: '2026-10', limit: 3000 }, token);
  await apiCall('POST', '/api/budgets', { category: 'Shopping', month: '2026-10', limit: 10000 }, token);
  await apiCall('POST', '/api/goals', { title: 'Emergency fund', targetAmount: 500000, currentAmount: 185000, targetDate: '2027-04-30', category: 'General' }, token);
  await apiCall('POST', '/api/goals', { title: 'Japan trip', targetAmount: 250000, currentAmount: 62000, targetDate: '2027-01-15', category: 'Travel' }, token);
  await apiCall('POST', '/api/recurring', { title: 'Apartment rent', amount: 42000, type: 'expense', category: 'Bills', frequency: 'monthly', day: 2, paymentMethod: 'Bank Transfer' }, token);
  await apiCall('POST', '/api/recurring', { title: 'Netflix Premium', amount: 649, type: 'expense', category: 'Other', frequency: 'monthly', day: 12, paymentMethod: 'Card' }, token);
  await apiCall('POST', '/api/recurring', { title: 'Gym membership', amount: 1500, type: 'expense', category: 'Health', frequency: 'weekly', day: 1, paymentMethod: 'UPI' }, token);

  const profile = path.join(os.tmpdir(), 'spendwise-cdp-shot');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=9226', `--user-data-dir=${profile}`, '--window-size=1500,1100', 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch {} });

  for (let i = 0; i < 40; i += 1) { try { await (await fetch(`${CDP}/json/version`)).json(); break; } catch { await sleep(500); } }
  const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');

  const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  fs.writeFileSync(path.join(distDir, '__seed.html'), `<!doctype html><meta charset="utf-8"><script>
    localStorage.setItem('token', ${JSON.stringify(token)});
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(r.data.user))});
    location.replace('/');</script>`);

  await cdp.send('Page.navigate', { url: `${BASE}/__seed.html` });
  await sleep(4500);

  const evalJs = async (e) => cdp.send('Runtime.evaluate', { expression: e, returnByValue: true }).then(x => x.result?.value);
  const outDir = path.join(os.tmpdir(), 'spendwise-shots');
  fs.mkdirSync(outDir, { recursive: true });

  const shots = ['Overview', 'Analytics', 'Transactions', 'Budgets', 'Categories', 'Savings Goals', 'Recurring', 'Reports', 'AI Assistant', 'Settings'];
  for (const nav of shots) {
    await evalJs(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent||'').trim() === ${JSON.stringify(nav)}); if (b) { b.click(); return true; } return false; })()`);
    await sleep(2600);
    const s = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(outDir, `${nav.replace(/\s+/g, '-').toLowerCase()}.png`);
    fs.writeFileSync(file, Buffer.from(s.data, 'base64'));
    console.log('shot', file);
  }

  fs.rmSync(path.join(distDir, '__seed.html'), { force: true });
  try { chrome.kill(); } catch {}
  if (server) server.kill();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
