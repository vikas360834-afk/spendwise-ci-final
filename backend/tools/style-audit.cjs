/* Style audit: verifies the glass design tokens actually resolve in the browser. */
const BASE = 'http://localhost:4000';
const CDP = 'http://localhost:9227';
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
  const email = `audit_${Date.now()}@spendwise.test`;
  let r = await apiCall('POST', '/api/auth/register', { name: 'Audit', email, password: 'Passw0rd!23' });
  const token = r.data.token;
  await apiCall('POST', '/api/expenses', { title: 'Salary', amount: 128000, type: 'income', category: 'Salary', date: '2026-10-01', paymentMethod: 'Bank Transfer', tags: [] }, token);
  await apiCall('POST', '/api/expenses', { title: 'Groceries', amount: 8450, type: 'expense', category: 'Food', date: '2026-10-04', paymentMethod: 'Card', tags: [] }, token);
  await apiCall('POST', '/api/expenses', { title: 'Rent', amount: 42000, type: 'expense', category: 'Bills', date: '2026-10-02', paymentMethod: 'Bank Transfer', tags: [] }, token);

  const profile = path.join(os.tmpdir(), 'spendwise-cdp-audit');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=9227', `--user-data-dir=${profile}`, '--window-size=1500,1100', 'about:blank'], { stdio: 'ignore' });
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

  const evalJs = async (e) => cdp.send('Runtime.evaluate', { expression: e, returnByValue: true }).then(x => {
    if (x?.exceptionDetails) return `EXC: ${x.exceptionDetails.text} ${x.exceptionDetails.exception?.description || ''}`;
    return x?.result?.value;
  });

  const diag = await evalJs(`({ href: location.href, title: document.title, nodes: document.querySelectorAll('*').length, body: (document.body?.innerText||'').replace(/\\s+/g,' ').slice(0,300), cards: document.querySelectorAll('.glass-card').length, rootBg: getComputedStyle(document.documentElement).getPropertyValue('--accent-violet') })`);
  console.log('--- diagnostics ---');
  console.log(JSON.stringify(diag, null, 2));

  const tokenReport = await evalJs(`(() => {
    const root = getComputedStyle(document.documentElement);
    const names = ['--bg-deep','--bg-base','--bg-elevated','--accent-violet','--accent-cyan','--accent-blue',
      '--success','--danger','--warning','--info',
      '--text-strong','--text','--text-muted','--text-dim',
      '--glass-1','--glass-2','--glass-3','--glass-inset','--glass-border','--glass-border-strong',
      '--r-xs','--r-sm','--r-md','--r-lg','--r-xl','--r-pill',
      '--ease','--ring','--shadow-sm','--shadow-md','--shadow-lg','--accent-gradient','--blur'];
    const out = {};
    for (const n of names) {
      const v = root.getPropertyValue(n).trim();
      out[n] = v === '' ? 'MISSING' : v;
    }
    return out;
  })()`);
  console.log('--- design tokens ---');
  Object.entries(tokenReport).forEach(([k, v]) => console.log(`  ${v === 'MISSING' ? 'MISS' : ' OK '}  ${k.padEnd(16)} ${v}`));

  const surfaceReport = await evalJs(`(() => {
    const card = document.querySelector('.glass-card');
    const btn = document.querySelector('.glass-btn');
    const input = document.querySelector('.glass-input, .chat-input');
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 70), border: cs.borderColor,
        radius: cs.borderRadius, backdrop: cs.backdropFilter, shadow: cs.boxShadow.slice(0, 60),
        color: cs.color, font: cs.fontFamily.split(',')[0], size: cs.fontSize,
      };
    };
    return { card: pick(card), btn: pick(btn), input: pick(input), theme: document.documentElement.getAttribute('data-theme') };
  })()`);
  console.log('--- surfaces ---');
  console.log(JSON.stringify(surfaceReport, null, 2));

  // light theme check
  await evalJs(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /theme|mode|light|moon|sun/i.test(x.getAttribute('aria-label')||'')); if (b) { b.click(); return true; } return false; })()`);
  await sleep(1200);
  const theme = await evalJs(`({ theme: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor })`);
  console.log('--- theme after toggle ---');
  console.log(JSON.stringify(theme));

  // focus visibility check (keyboard Tab so :focus-visible matches)
  await cdp.send('Runtime.evaluate', { expression: 'document.body.focus(); window.scrollTo(0,0);' });
  for (let i = 0; i < 4; i += 1) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await sleep(120);
  }
  const focus = await evalJs(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { none: true };
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName, cls: el.className?.toString().slice(0, 40),
      outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor,
      borderRadius: cs.borderRadius, matchesFocusVisible: el.matches(':focus-visible'),
    };
  })()`);
  console.log('--- keyboard focus ring ---');
  console.log(JSON.stringify(focus, null, 2));

  // contrast sample for muted text on card background
  const contrast = await evalJs(`(() => {
    function lum(rgb) {
      const m = rgb.match(/[\\d.]+/g).map(Number);
      const c = m.slice(0,3).map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
      return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
    }
    const card = document.querySelector('.glass-card');
    const muted = Array.from(document.querySelectorAll('.panel-sub, .text-muted, [style*="--text-muted"]')).find(e => e.offsetParent);
    if (!card || !muted) return null;
    const bg = getComputedStyle(card).backgroundColor;
    const fg = getComputedStyle(muted).color;
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return { fg, bg, ratio: Math.round(ratio * 100) / 100 };
  })()`);
  console.log('--- contrast (muted text on glass card) ---');
  console.log(JSON.stringify(contrast));

  fs.rmSync(path.join(distDir, '__seed.html'), { force: true });
  try { chrome.kill(); } catch {}
  if (server) server.kill();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
