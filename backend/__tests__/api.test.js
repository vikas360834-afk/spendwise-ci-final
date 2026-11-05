const request = require('supertest');
const fs = require('fs');
const path = require('path');

process.env.DATA_DIR = path.join(__dirname, 'tmp-test-data');
process.env.JWT_SECRET = 'test-secret';

const app = require('../src/server');

beforeEach(() => {
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
});

async function registerAndLogin() {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test', email: 'test@example.com', password: 'secret123' });
  expect(reg.status).toBe(201);
  return reg.body.token;
}

test('health check', async () => {
  const r = await request(app).get('/health');
  expect(r.status).toBe(200);
  expect(r.body.status).toBe('ok');
});

test('auth + expense CRUD + stats + budgets + csv', async () => {
  const token = await registerAndLogin();
  const auth = { Authorization: `Bearer ${token}` };

  const create = await request(app).post('/api/expenses').set(auth).send({
    title: 'Lunch',
    amount: 12.5,
    category: 'Food',
    date: '2026-10-01',
    note: 'test',
  });
  expect(create.status).toBe(201);
  const id = create.body.id;

  const list = await request(app).get('/api/expenses?search=lunch&sort=amount&order=asc').set(auth);
  expect(list.status).toBe(200);
  expect(list.body.length).toBe(1);

  const bad = await request(app).post('/api/expenses').set(auth).send({ title: '', amount: -5 });
  expect(bad.status).toBe(400);

  const update = await request(app).put(`/api/expenses/${id}`).set(auth).send({
    title: 'Lunch updated',
    amount: 15,
    category: 'Food',
    date: '2026-10-02',
  });
  expect(update.status).toBe(200);
  expect(update.body.amount).toBe(15);

  const stats = await request(app).get('/api/stats').set(auth);
  expect(stats.body.total).toBe(15);
  expect(stats.body.count).toBe(1);

  const budget = await request(app).post('/api/budgets').set(auth).send({
    category: 'Food',
    month: '2026-10',
    limit: 200,
  });
  expect(budget.status).toBe(201);

  const status = await request(app).get('/api/budgets/status/overview?month=2026-10').set(auth);
  expect(status.status).toBe(200);
  expect(status.body.status[0].spent).toBe(15);

  const csv = await request(app).get('/api/expenses/export').set(auth);
  expect(csv.status).toBe(200);
  expect(csv.text).toContain('Lunch updated');

  const del = await request(app).delete(`/api/expenses/${id}`).set(auth);
  expect(del.status).toBe(200);
});

test('requires auth', async () => {
  const r = await request(app).get('/api/expenses');
  expect(r.status).toBe(401);
});
