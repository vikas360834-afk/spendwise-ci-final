/* Verify the Vite dev server renders the SPA without runtime errors. */
const URL_TO_TEST = process.env.URL || 'http://localhost:5173';
const CDP = 'http://localhost:9228';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const profile = path.join(os.tmpdir(), 'spendwise-cdp-dev');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=9228', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch {} });

  for (let i = 0; i < 40; i += 1) { try { await (await fetch(`${CDP}/json/version`)).json(); break; } catch { await sleep(500); } }
  const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');

  const issues = [];
  cdp.ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') issues.push(`EXCEPTION: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') issues.push(`CONSOLE.error: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') issues.push(`LOG: ${m.params.entry.text}`);
  });

  await cdp.send('Page.navigate', { url: URL_TO_TEST });
  await sleep(6000);

  const evalJs = async (e) => cdp.send('Runtime.evaluate', { expression: e, returnByValue: true })
    .then((x) => (x?.exceptionDetails ? `EXC ${x.exceptionDetails.text}` : x?.result?.value));

  const info = await evalJs(`(() => ({
    href: location.href,
    title: document.title,
    nodes: document.querySelectorAll('*').length,
    text: (document.body?.innerText || '').replace(/\\s+/g, ' ').slice(0, 400),
    hasSidebar: !!document.querySelector('.sidebar, .app-sidebar'),
    hasAuthForm: !!document.querySelector('form, .auth-card, .glass-input'),
  }))()`);

  console.log('URL   :', URL_TO_TEST);
  console.log('INFO  :', JSON.stringify(info, null, 2));
  console.log('ISSUES:', issues.length ? '\n' + issues.join('\n') : 'none');

  try { chrome.kill(); } catch {}
  process.exit(issues.length ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
