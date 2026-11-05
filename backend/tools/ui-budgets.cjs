/* Focused debug of the Budgets page rendering. */
const BASE = 'http://localhost:4000';
const CDP = 'http://localhost:9224';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const email = `ui3_${Date.now()}@spendwise.test`;
  let r = await apiCall('POST', '/api/auth/register', { name: 'Budget Tester', email, password: 'Passw0rd!23' });
  const token = r.data.token;
  await apiCall('POST', '/api/expenses', { title: 'Groceries', amount: 6400, type: 'expense', category: 'Food', date: '2026-10-03', paymentMethod: 'UPI', tags: [] }, token);
  await apiCall('POST', '/api/budgets', { category: 'Food', month: '2026-10', limit: 10000 }, token);

  const profile = path.join(os.tmpdir(), 'spendwise-cdp-profile3');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=9224', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch {} });

  for (let i = 0; i < 40; i += 1) { try { await (await fetch(`${CDP}/json/version`)).json(); break; } catch { await sleep(500); } }
  const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); await cdp.send('Page.enable');

  const errors = [];
  cdp.ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(`EXCEPTION: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled') errors.push(`CONSOLE.${m.params.type}: ${m.params.args.map(a => a.value ?? a.description).join(' ')}`);
    if (m.method === 'Log.entryAdded') errors.push(`LOG(${m.params.entry.level}): ${m.params.entry.text}`); });

  const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  fs.writeFileSync(path.join(distDir, '__seed.html'), `<!doctype html><meta charset="utf-8"><script>
    localStorage.setItem('token', ${JSON.stringify(token)});
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(r.data.user))});
    location.replace('/');</script>`);

  await cdp.send('Page.navigate', { url: `${BASE}/__seed.html` });
  await sleep(4000);

  const evalJs = async (e) => cdp.send('Runtime.evaluate', { expression: e, returnByValue: true }).then(x => x.result?.value);

  await evalJs(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent||'').trim() === 'Budgets'); if (b) { b.click(); return true; } return false; })()`);
  for (const wait of [1000, 2000, 4000]) {
    await sleep(wait);
    const txt = await evalJs(`document.querySelector('.content-canvas')?.innerText?.replace(/\\s+/g,' ')`);
    console.log(`after ~${wait}ms cumulative: len=${(txt||'').length}`);
    console.log('  ', (txt || '').slice(0, 700));
  }

  console.log('\n=== ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'none');

  fs.rmSync(path.join(distDir, '__seed.html'), { force: true });
  try { chrome.kill(); } catch {}
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
