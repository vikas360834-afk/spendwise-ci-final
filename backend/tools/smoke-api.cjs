/* End-to-end smoke test against a running backend. */
const BASE = process.env.BASE || 'http://localhost:4000';
const { ensureServer } = require('./_harness.cjs');

let token = null;

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }
  return { status: res.status, data };
}

function ok(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ` :: ${extra}` : ''}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  const server = await ensureServer();
  // 1. health
  let r = await call('GET', '/health');
  ok('GET /health', r.status === 200 && r.data?.status === 'ok', JSON.stringify(r.data));

  // 2. register
  const email = `smoke_${Date.now()}@spendwise.test`;
  r = await call('POST', '/api/auth/register', { name: 'Smoke Tester', email, password: 'Passw0rd!23' });
  ok('POST /api/auth/register', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 160));
  token = r.data?.token;
  ok('register returns token', !!token);

  // 3. login
  r = await call('POST', '/api/auth/login', { email, password: 'Passw0rd!23' });
  ok('POST /api/auth/login', r.status === 200 && !!r.data?.token, JSON.stringify(r.data).slice(0, 160));
  token = r.data?.token;

  // 4. me
  r = await call('GET', '/api/auth/me');
  ok('GET /api/auth/me', r.status === 200 && r.data?.email === email);

  // 5. auth required guard
  const saved = token;
  token = null;
  r = await call('GET', '/api/expenses');
  ok('unauthenticated GET /api/expenses -> 401', r.status === 401, `status=${r.status}`);
  token = saved;

  // 6. transaction CRUD
  const txns = [
    { title: 'Salary', amount: 120000, type: 'income', category: 'Salary', date: '2026-10-01', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Groceries', amount: 6400, type: 'expense', category: 'Food', date: '2026-10-03', paymentMethod: 'UPI', tags: ['groceries'] },
    { title: 'Metro pass', amount: 1800, type: 'expense', category: 'Transport', date: '2026-10-05', paymentMethod: 'Card', tags: [] },
    { title: 'Rent', amount: 32000, type: 'expense', category: 'Bills', date: '2026-10-02', paymentMethod: 'Bank Transfer', tags: [] },
    { title: 'Concert', amount: 4200, type: 'expense', category: 'Entertainment', date: '2026-09-12', paymentMethod: 'UPI', tags: [] },
    { title: 'Freelance', amount: 22000, type: 'income', category: 'Freelance', date: '2026-09-20', paymentMethod: 'Bank Transfer', tags: [] },
  ];
  let createdId = null;
  for (const t of txns) {
    r = await call('POST', '/api/expenses', t);
    if (r.status === 201 || r.status === 200) createdId = r.data?.transaction?.id || r.data?.id || createdId;
    else ok(`POST /api/expenses (${t.title})`, false, JSON.stringify(r.data).slice(0, 160));
  }
  ok('POST /api/expenses x6', true);

  r = await call('GET', '/api/expenses');
  ok('GET /api/expenses list', r.status === 200 && Array.isArray(r.data) && r.data.length === 6, `count=${Array.isArray(r.data) ? r.data.length : 'n/a'}`);

  r = await call('PUT', `/api/expenses/${createdId}`, { title: 'Salary updated', amount: 125000, type: 'income', category: 'Salary', date: '2026-10-01', paymentMethod: 'Bank Transfer' });
  ok('PUT /api/expenses/:id', r.status === 200, JSON.stringify(r.data).slice(0, 120));

  // 7. stats
  r = await call('GET', '/api/stats');
  ok('GET /api/stats', r.status === 200 && typeof r.data?.income === 'number', JSON.stringify(r.data).slice(0, 200));

  // 8. analytics
  r = await call('GET', '/api/stats/analytics?startDate=2026-09-01&endDate=2026-10-31');
  ok('GET /api/stats/analytics', r.status === 200 && Array.isArray(r.data?.categories) && Array.isArray(r.data?.trend?.points ?? r.data?.trend), JSON.stringify(r.data).slice(0, 260));

  // 9. analytics with filters
  r = await call('GET', '/api/stats/analytics?startDate=2026-10-01&endDate=2026-10-31&category=Food&type=expense');
  ok('GET /api/stats/analytics filtered', r.status === 200 && r.data?.summary?.count >= 1, JSON.stringify(r.data?.summary));

  // 10. budgets
  r = await call('POST', '/api/budgets', { category: 'Food', month: '2026-10', limit: 10000 });
  ok('POST /api/budgets', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 140));
  r = await call('GET', '/api/budgets/status/overview?month=2026-10');
  ok('GET /api/budgets/status/overview', r.status === 200 && Array.isArray(r.data?.status), JSON.stringify(r.data).slice(0, 200));
  r = await call('GET', '/api/budgets/suggestions?month=2026-10');
  ok('GET /api/budgets/suggestions', r.status === 200 && Array.isArray(r.data?.suggestions));

  // 11. recurring
  r = await call('POST', '/api/recurring', { title: 'Netflix', amount: 649, type: 'expense', category: 'Subscriptions', frequency: 'monthly', day: 5, paymentMethod: 'Card' });
  ok('POST /api/recurring', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 140));
  r = await call('GET', '/api/recurring/upcoming?days=30');
  ok('GET /api/recurring/upcoming', r.status === 200 && Array.isArray(r.data));

  // 12. goals
  r = await call('POST', '/api/goals', { title: 'Emergency fund', targetAmount: 200000, currentAmount: 20000, targetDate: '2026-12-31', category: 'General' });
  ok('POST /api/goals', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 140));
  const goalId = r.data?.goal?.id || r.data?.id;
  r = await call('POST', `/api/goals/${goalId}/contribute`, { amount: 5000 });
  ok('POST /api/goals/:id/contribute', r.status === 200, JSON.stringify(r.data).slice(0, 140));

  // 13. settings
  r = await call('GET', '/api/settings');
  ok('GET /api/settings', r.status === 200 && !!r.data?.currency);
  r = await call('PUT', '/api/settings', { currency: 'USD', theme: 'dark' });
  ok('PUT /api/settings', r.status === 200 && r.data?.currency === 'USD', JSON.stringify(r.data).slice(0, 140));
  await call('PUT', '/api/settings', { currency: 'INR' });

  // 14. ai
  r = await call('GET', '/api/ai/status');
  ok('GET /api/ai/status', r.status === 200 && !!r.data?.mode);
  r = await call('GET', '/api/ai/insights?month=2026-10');
  ok('GET /api/ai/insights', r.status === 200 && Array.isArray(r.data?.insights), JSON.stringify(r.data).slice(0, 200));
  r = await call('POST', '/api/ai/chat', { message: 'How much did I spend this month?' });
  ok('POST /api/ai/chat', r.status === 200 && typeof r.data?.reply === 'string' && r.data.reply.length > 20, r.data?.reply?.slice(0, 120));

  // 15. system
  r = await call('GET', '/api/system/health');
  ok('GET /api/system/health', r.status === 200 && !!r.data?.status);
  r = await call('GET', '/api/system/info');
  ok('GET /api/system/info', r.status === 200 && !!r.data?.version);

  // 16. csv export
  r = await call('GET', '/api/expenses/export');
  ok('GET /api/expenses/export', r.status === 200);

  // 17. delete transaction
  r = await call('DELETE', `/api/expenses/${createdId}`);
  ok('DELETE /api/expenses/:id', r.status === 200 || r.status === 204, `status=${r.status}`);
  r = await call('GET', '/api/expenses');
  ok('list after delete', Array.isArray(r.data) && r.data.length === 5, `count=${r.data?.length}`);

  // 18. cleanup data
  r = await call('DELETE', '/api/settings/data');
  ok('DELETE /api/settings/data', r.status === 200 || r.status === 204);
  if (server) server.kill();
})();
