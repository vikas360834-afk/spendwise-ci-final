/* Focused browser test: Goals + DevOps pages, mobile layout, AI chat, filters. */
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
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`timeout ${method}`)); } }, 30000);
    });
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(new Cdp(ws)));
    ws.addEventListener('error', (e) => reject(new Error('ws error')));
  });
}

(async () => {
  const email = `ui2_${Date.now()}@spendwise.test`;
  let r = await apiCall('POST', '/api/auth/register', { name: 'UI Tester', email, password: 'Passw0rd!23' });
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
  await apiCall('POST', '/api/goals', { title: 'Emergency fund', targetAmount: 200000, currentAmount: 45000, targetDate: '2026-12-31', category: 'General' }, token);
  await apiCall('POST', '/api/recurring', { title: 'Netflix', amount: 649, type: 'expense', category: 'Other', frequency: 'monthly', day: 5, paymentMethod: 'Card' }, token);

  const profile = path.join(os.tmpdir(), 'spendwise-cdp-profile2');
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=9223', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  const cleanup = () => { try { chrome.kill(); } catch {} };
  process.on('exit', cleanup);

  const CDP2 = 'http://localhost:9223';
  let ver = null;
  for (let i = 0; i < 40; i += 1) {
    try { ver = await (await fetch(`${CDP2}/json/version`)).json(); break; } catch { await sleep(500); }
  }
  if (!ver) throw new Error('chrome did not start');

  const target = await (await fetch(`${CDP2}/json/new?about:blank`, { method: 'PUT' })).json();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');

  const errors = [];
  cdp.ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(`EXCEPTION: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(`CONSOLE.error: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(`LOG: ${msg.params.entry.text}`);
  });

  const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  fs.writeFileSync(path.join(distDir, '__seed.html'), `<!doctype html><meta charset="utf-8"><script>
    localStorage.setItem('token', ${JSON.stringify(token)});
    localStorage.setItem('user', ${JSON.stringify(JSON.stringify(r.data.user))});
    location.replace('/');
  </script>`);

  await cdp.send('Page.navigate', { url: `${BASE}/__seed.html` });
  await sleep(4000);

  const clickByText = async (text) => cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('button, a'));
      const el = els.find(b => (b.textContent || '').trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())}));
      if (el) { el.click(); return el.textContent.trim(); } return null;
    })()`, returnByValue: true,
  }).then((x) => x.result?.value);

  const bodyText = async () => cdp.send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true }).then((x) => x.result?.value || '');
  const evalJs = async (expression) => cdp.send('Runtime.evaluate', { expression, returnByValue: true }).then((x) => x.result?.value);

  // --- Goals page (nav label "Savings Goals") ---
  let before = errors.length;
  console.log('clicked nav:', await clickByText('savings goals'));
  await sleep(2200);
  let t = await bodyText();
  console.log(`GOALS  len=${t.length} hasGoal=${/Emergency fund/i.test(t)} errors=${errors.length - before}`);
  console.log('   ', t.replace(/\s+/g, ' ').slice(200, 420));

  // --- DevOps page ---
  before = errors.length;
  console.log('clicked nav:', await clickByText('devops'));
  await sleep(2200);
  t = await bodyText();
  console.log(`DEVOPS len=${t.length} hasHealth=${/Healthy|Degraded/i.test(t)} errors=${errors.length - before}`);
  console.log('   ', t.replace(/\s+/g, ' ').slice(200, 420));

  // --- AI assistant: send a message ---
  before = errors.length;
  console.log('clicked nav:', await clickByText('ai assistant'));
  await sleep(1800);
  const sent = await evalJs(`(() => {
    const ta = document.querySelector('.chat-input');
    if (!ta) return 'no input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'How much did I spend this month?');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return 'typed';
  })()`);
  console.log('typed:', sent);
  await sleep(400);
  await evalJs(`(() => { const b = document.querySelector('.chat-send-btn'); if (b) b.click(); return !!b; })()`);
  await sleep(2500);
  t = await bodyText();
  console.log(`AI     hasReply=${/Actual Data|Verified figures/i.test(t)} hasActualTag=${!!(await evalJs(`!!document.querySelector('.chat-tag.actual')`))} errors=${errors.length - before}`);

  // --- Analytics: change the date preset and confirm the chart updates ---
  before = errors.length;
  await clickByText('analytics');
  await sleep(2500);
  const beforeKpi = await evalJs(`document.querySelector('.kpi-grid .metric-card-value')?.innerText`);
  await evalJs(`(() => { const b = Array.from(document.querySelectorAll('.segmented button')).find(x => /last 3 months/i.test(x.textContent)); if (b) { b.click(); return true; } return false; })()`);
  await sleep(2500);
  const afterKpi = await evalJs(`document.querySelector('.kpi-grid .metric-card-value')?.innerText`);
  const summaryLine = await evalJs(`document.querySelector('.filter-summary')?.innerText?.replace(/\\s+/g,' ')`);
  console.log(`ANALYTICS preset switch: before=${beforeKpi} after=${afterKpi} changed=${beforeKpi !== afterKpi}`);
  console.log('   filter summary:', summaryLine);

  // category filter
  await evalJs(`(() => {
    const sel = Array.from(document.querySelectorAll('select')).find(s => Array.from(s.options).some(o => o.textContent === 'Food'));
    if (!sel) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, 'Food');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await sleep(2500);
  const catKpi = await evalJs(`document.querySelector('.kpi-grid .metric-card-value')?.innerText`);
  const catRows = await evalJs(`document.querySelectorAll('.glass-table tbody tr').length`);
  console.log(`ANALYTICS category=Food: kpi=${catKpi} rows=${catRows} errors=${errors.length - before}`);

  // --- mobile layout ---
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(1500);
  const m = await evalJs(`(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    bottomBar: !!document.querySelector('.mobile-bottom-bar'),
    visibleTables: Array.from(document.querySelectorAll('.table-container')).filter(e => e.offsetParent !== null).length,
    cards: document.querySelectorAll('.mobile-only, .mobile-card, .txn-mobile-card').length,
  }))()`);
  console.log('MOBILE analytics:', JSON.stringify(m));
  await evalJs(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent||'').trim().toLowerCase() === 'transactions'); if (b) { b.click(); return true; } return false; })()`);
  await sleep(2200);
  const m2 = await evalJs(`(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    bottomBar: !!document.querySelector('.mobile-bottom-bar'),
    visibleTables: Array.from(document.querySelectorAll('.table-container')).filter(e => e.offsetParent !== null).length,
    mobileCards: Array.from(document.querySelectorAll('.mobile-only')).filter(e => e.offsetParent !== null).length,
  }))()`);
  console.log('MOBILE transactions:', JSON.stringify(m2));

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(os.tmpdir(), 'spendwise-mobile.png'), Buffer.from(shot.data, 'base64'));

  console.log('\n=== ERRORS ===');
  console.log(errors.length ? errors.slice(0, 30).join('\n') : 'none');

  fs.rmSync(path.join(distDir, '__seed.html'), { force: true });
  cleanup();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
