const request = require('supertest');
const fs = require('fs');
const path = require('path');

process.env.DATA_DIR = path.join(__dirname, 'tmp-premium-data');
process.env.JWT_SECRET = 'test-secret-premium';
delete process.env.AI_API_KEY;

const app = require('../src/server');

beforeEach(() => {
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
});

async function auth() {
  const reg = await request(app).post('/api/auth/register')
    .send({ name: 'Prem', email: 'prem@example.com', password: 'secret123' });
  expect(reg.status).toBe(201);
  const h = { Authorization: `Bearer ${reg.body.token}` };
  return h;
}

test('income + expense transactions, filters, pagination shape', async () => {
  const h = await auth();
  const salary = await request(app).post('/api/expenses').set(h).send({
    type: 'income', title: 'Salary', amount: 50000, category: 'Salary', date: '2026-10-01', paymentMethod: 'Bank Transfer', tags: ['job'],
  });
  expect(salary.status).toBe(201);
  expect(salary.body.type).toBe('income');
  const food = await request(app).post('/api/expenses').set(h).send({
    title: 'Lunch', amount: 250, category: 'Food', date: '2026-10-02', paymentMethod: 'UPI', tags: ['office'],
  });
  expect(food.body.type).toBe('expense'); // legacy default

  const bad = await request(app).post('/api/expenses').set(h).send({ title: 'x', amount: 10, type: 'gift' });
  expect(bad.status).toBe(400);

  const onlyIncome = await request(app).get('/api/expenses?type=income').set(h);
  expect(onlyIncome.body.length).toBe(1);

  const paged = await request(app).get('/api/expenses?page=1&limit=1').set(h);
  expect(paged.body.total).toBe(2);
  expect(paged.body.data.length).toBe(1);

  const plain = await request(app).get('/api/expenses').set(h);
  expect(Array.isArray(plain.body)).toBe(true); // legacy contract

  const csv = await request(app).get('/api/expenses/export').set(h);
  expect(csv.text.split('\n')[0]).toContain('payment_method');
});

test('extended stats + budget suggestions', async () => {
  const h = await auth();
  await request(app).post('/api/expenses').set(h).send({ type: 'income', title: 'Salary', amount: 50000, category: 'Salary', date: '2026-10-01' });
  await request(app).post('/api/expenses').set(h).send({ title: 'Lunch', amount: 250, category: 'Food', date: '2026-10-02' });
  const stats = await request(app).get('/api/stats').set(h);
  expect(stats.body.income).toBe(50000);
  expect(stats.body.expenses).toBe(250);
  expect(stats.body.net).toBe(49750);
  expect(stats.body.total).toBe(250); // legacy field = expenses
  // history-based suggestions need 3 months of data; empty is a valid answer
  const sugg = await request(app).get('/api/budgets/suggestions').set(h);
  expect(sugg.status).toBe(200);
  expect(Array.isArray(sugg.body.suggestions)).toBe(true);
});

test('recurring CRUD + upcoming', async () => {
  const h = await auth();
  const c = await request(app).post('/api/recurring').set(h).send({ title: 'Rent', amount: 15000, type: 'expense', category: 'Bills', frequency: 'monthly', day: 5 });
  expect(c.status).toBe(201);
  expect(c.body.nextDue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const up = await request(app).get('/api/recurring/upcoming?days=60').set(h);
  expect(up.body.length).toBe(1);
  const skip = await request(app).post(`/api/recurring/${c.body.id}/skip`).set(h);
  expect(skip.status).toBe(200);
  const del = await request(app).delete(`/api/recurring/${c.body.id}`).set(h);
  expect(del.status).toBe(200);
});

test('settings prefs + validation + profile', async () => {
  const h = await auth();
  const d = await request(app).get('/api/settings').set(h);
  expect(d.body.currency).toBe('INR'); // default
  const bad = await request(app).put('/api/settings').set(h).send({ currency: 'XYZ' });
  expect(bad.status).toBe(400);
  const ok = await request(app).put('/api/settings').set(h).send({ currency: 'USD', theme: 'light' });
  expect(ok.body.currency).toBe('USD');
  const p = await request(app).put('/api/settings/profile').set(h).send({ name: 'Prem K' });
  expect(p.body.name).toBe('Prem K');
});

test('AI demo mode uses real figures, empty state is honest', async () => {
  const h = await auth();
  const st = await request(app).get('/api/ai/status').set(h);
  expect(st.body.mode).toBe('demo');
  const empty = await request(app).post('/api/ai/chat').set(h).send({ message: 'summarize my spending' });
  expect(empty.body.mode).toBe('demo');
  expect(empty.body.reply).toMatch(/no transactions/i);

  await request(app).post('/api/expenses').set(h).send({ type: 'income', title: 'Salary', amount: 50000, category: 'Salary', date: '2026-10-01' });
  await request(app).post('/api/expenses').set(h).send({ title: 'Lunch', amount: 250, category: 'Food', date: '2026-10-02' });
  const chat = await request(app).post('/api/ai/chat').set(h).send({ message: 'Where am I spending the most?' });
  expect(chat.body.mode).toBe('demo');
  expect(chat.body.reply).toContain('Food');
  expect(chat.body.reply).toMatch(/250/);

  const bad = await request(app).post('/api/ai/chat').set(h).send({ message: '' });
  expect(bad.status).toBe(400);
});

test('system health + user isolation', async () => {
  const h = await auth();
  const health = await request(app).get('/api/system/health').set(h);
  expect(health.body.status).toBe('ok');
  expect(health.body.storage.writable).toBe(true);
  const info = await request(app).get('/api/system/info').set(h);
  expect(info.body.app).toBe('SpendWise');
  expect(JSON.stringify(info)).not.toMatch(/secret/i);

  // second user cannot see first user's data
  const reg2 = await request(app).post('/api/auth/register').send({ name: 'B', email: 'b@example.com', password: 'secret123' });
  const h2 = { Authorization: `Bearer ${reg2.body.token}` };
  await request(app).post('/api/expenses').set(h).send({ title: 'Mine', amount: 100, category: 'Food', date: '2026-10-01' });
  const other = await request(app).get('/api/expenses').set(h2);
  expect(other.body.length).toBe(0);

  const wipe = await request(app).delete('/api/settings/data').set(h);
  expect(wipe.body.deleted).toBe(true);
  const gone = await request(app).get('/api/expenses').set(h);
  expect(gone.body.length).toBe(0);
});

test('savings goals CRUD and contributions', async () => {
  const h = await auth();
  const res = await request(app).post('/api/goals').set(h).send({
    title: 'Emergency Fund',
    targetAmount: 50000,
    currentAmount: 10000,
    targetDate: '2026-12-31',
    category: 'Emergency',
    note: '6 months expenses',
  });
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Emergency Fund');
  expect(res.body.pct).toBe(20);
  expect(res.body.remaining).toBe(40000);

  const list = await request(app).get('/api/goals').set(h);
  expect(list.body.length).toBe(1);

  const contribute = await request(app).post(`/api/goals/${res.body.id}/contribute`).set(h).send({ amount: 5000 });
  expect(contribute.body.currentAmount).toBe(15000);
  expect(contribute.body.pct).toBe(30);

  const del = await request(app).delete(`/api/goals/${res.body.id}`).set(h);
  expect(del.status).toBe(200);

  const empty = await request(app).get('/api/goals').set(h);
  expect(empty.body.length).toBe(0);
});
