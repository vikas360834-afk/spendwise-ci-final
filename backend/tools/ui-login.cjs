/* Real login-form test: types into the actual Sign In form and submits it. */
const API = process.env.API || 'http://localhost:4000';
const APP = process.env.APP || 'http://localhost:5173';
const CDP = process.env.CDP || 'http://localhost:9230';
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
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id);
        if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); } }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`timeout: ${method}`)); } }, 30000); }); }
}
const connect = (url) => new Promise((resolve, reject) => { const ws = new WebSocket(url);
  ws.addEventListener('open', () => resolve(new Cdp(ws))); ws.addEventListener('error', () => reject(new Error('ws'))); });

(async () => {
  const email = process.env.EMAIL || `login_${Date.now()}@spendwise.test`;
  const password = process.env.PASSWORD || 'Passw0rd!23';
  if (!process.env.EMAIL) {
    const r = await apiCall('POST', '/api/auth/register', { name: 'Login Tester', email, password });
    if (![200, 201].includes(r.status)) throw new Error(`register failed ${JSON.stringify(r.data)}`);
    console.log('registered test user:', email);
  } else {
    console.log('logging in as:', email);
  }

  const profile = path.join(os.tmpdir(), 'spendwise-login-profile');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${new URL(CDP).port || 9230}`,
    `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  const cleanup = () => { try { chrome.kill(); } catch {} };
  process.on('exit', cleanup);

  for (let i = 0; i < 40; i += 1) { try { await (await fetch(`${CDP}/json/version`)).json(); break; } catch { await sleep(500); } }
  const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');

  const errors = [], reqs = [];
  cdp.ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(`EXCEPTION: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(`CONSOLE.error: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon/i.test(m.params.entry.text)) errors.push(`LOG: ${m.params.entry.text}`);
    if (m.method === 'Network.requestWillBeSent' && /\/api\//.test(m.params.request.url)) reqs.push(`REQ ${m.params.request.method} ${m.params.request.url}`);
    if (m.method === 'Network.responseReceived' && /\/api\//.test(m.params.response.url)) reqs.push(`RES ${m.params.response.status} ${m.params.response.url}`);
    if (m.method === 'Network.loadingFailed') reqs.push(`FAILED ${m.params.errorText}`);
  });

  const evalJs = (expression, awaitPromise = false) => cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
    .then((x) => (x?.exceptionDetails ? { __exc: x.exceptionDetails.text } : x?.result?.value))
    .catch((e) => ({ __exc: e.message }));

  await cdp.send('Page.navigate', { url: APP });
  await sleep(3000);
  // Clear any session left in the persistent Chrome profile so we always test
  // the real login form.
  await evalJs(`(() => { localStorage.clear(); sessionStorage.clear(); return true; })()`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(4000);

  const before = await evalJs(`(() => ({
    hasForm: !!document.querySelector('form'),
    inputs: document.querySelectorAll('form input').length,
    button: (Array.from(document.querySelectorAll('button')).find(b => /sign in to dashboard/i.test(b.textContent || '')) || {}).textContent || null,
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 200),
  }))()`);
  console.log('LOGIN SCREEN:', JSON.stringify(before, null, 2));

  // Fill via native setters so React's onChange fires.
  const filled = await evalJs(`(() => {
    const setVal = (el, v) => {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      desc.set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const email = document.querySelector('input[type="email"]');
    const pass = document.querySelector('input[type="password"]');
    if (!email || !pass) return { ok: false, reason: 'inputs missing' };
    setVal(email, ${JSON.stringify(email)});
    setVal(pass, ${JSON.stringify(password)});
    return { ok: true, email: email.value, passLen: pass.value.length };
  })()`, false).catch((e) => ({ __exc: e.message }));

  // Re-fill (the block above referenced vars incorrectly); do it explicitly.
  const filled2 = await evalJs(`(() => {
    const setVal = (el, v) => {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      desc.set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const email = document.querySelector('input[type="email"]');
    const pass = document.querySelector('input[type="password"]');
    if (!email || !pass) return { ok: false, reason: 'inputs missing' };
    setVal(email, ${JSON.stringify(email)});
    setVal(pass, ${JSON.stringify(password)});
    return { ok: true, email: email.value, passLen: pass.value.length };
  })()`);
  console.log('FILLED:', JSON.stringify(filled2));

  await sleep(300);
  const clicked = await evalJs(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /sign in to dashboard/i.test(b.textContent || ''));
    if (!btn) return false;
    btn.click();
    return true;
  })()`);
  console.log('SUBMITTED:', clicked);

  await sleep(5000);
  const after = await evalJs(`(() => ({
    hasSidebar: !!document.querySelector('.floating-sidebar, .sidebar'),
    hasCanvas: !!document.querySelector('.content-canvas'),
    hasForm: !!document.querySelector('form'),
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 260),
    token: (localStorage.getItem('token') || '').slice(0, 12) + '...',
    err: (document.querySelector('form [style*="f87171"], form [style*="244, 63, 94"]') || {}).innerText || null,
  }))()`);
  console.log('AFTER LOGIN:', JSON.stringify(after, null, 2));

  console.log('\nAPI TRAFFIC:');
  reqs.forEach((x) => console.log('  ' + x));
  console.log('\nERRORS:');
  if (!errors.length) console.log('  none'); else errors.forEach((x) => console.log('  ' + x));

  cleanup();
  process.exit(after && after.hasSidebar ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
