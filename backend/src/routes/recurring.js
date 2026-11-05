const express = require('express');
const { v4: uuid } = require('uuid');
const { readJson, writeJson } = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const FILE = 'recurring.json';
const FREQUENCIES = ['weekly', 'monthly'];

function all() {
  return readJson(FILE, []);
}

function nextDueDate(frequency, day) {
  const now = new Date();
  if (frequency === 'weekly') {
    const target = Math.min(Math.max(Number(day) || 1, 0), 6); // 0=Sun..6=Sat
    const d = new Date(now);
    let diff = (target - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }
  const dom = Math.min(Math.max(Number(day) || 1, 1), 28);
  let y = now.getFullYear();
  let m = now.getMonth();
  if (now.getDate() >= dom) m += 1;
  return new Date(y, m, dom).toISOString().slice(0, 10);
}

function validate(body) {
  const errors = [];
  if (!body.title || !String(body.title).trim()) errors.push('title required');
  if (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) errors.push('amount must be positive');
  if (body.type && !['income', 'expense'].includes(body.type)) errors.push('type must be income or expense');
  if (!FREQUENCIES.includes(body.frequency)) errors.push('frequency must be weekly or monthly');
  return errors;
}

// GET /api/recurring/upcoming?days=30 — active items due within N days.
router.get('/upcoming', authRequired, (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  const out = all()
    .filter((r) => r.userId === req.user.id && r.active !== false && r.nextDue <= limit.toISOString().slice(0, 10))
    .sort((a, b) => String(a.nextDue).localeCompare(String(b.nextDue)));
  res.json(out);
});

router.get('/', authRequired, (req, res) => {
  res.json(all().filter((r) => r.userId === req.user.id).sort((a, b) => String(a.nextDue).localeCompare(String(b.nextDue))));
});

router.post('/', authRequired, (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) return res.status(400).json({ errors });
  const rows = all();
  const item = {
    id: uuid(),
    userId: req.user.id,
    title: String(req.body.title).trim(),
    amount: Number(req.body.amount),
    type: req.body.type === 'income' ? 'income' : 'expense',
    category: req.body.category || 'Other',
    frequency: req.body.frequency,
    day: req.body.day ?? 1,
    paymentMethod: req.body.paymentMethod || '',
    note: String(req.body.note || '').trim(),
    nextDue: req.body.nextDue && !Number.isNaN(Date.parse(req.body.nextDue))
      ? new Date(req.body.nextDue).toISOString().slice(0, 10)
      : nextDueDate(req.body.frequency, req.body.day),
    active: true,
    createdAt: new Date().toISOString(),
  };
  rows.push(item);
  writeJson(FILE, rows);
  res.status(201).json(item);
});

router.put('/:id', authRequired, (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) return res.status(400).json({ errors });
  const rows = all();
  const i = rows.findIndex((r) => r.id === req.params.id && r.userId === req.user.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  rows[i] = {
    ...rows[i],
    title: String(req.body.title).trim(),
    amount: Number(req.body.amount),
    type: req.body.type === 'income' ? 'income' : 'expense',
    category: req.body.category || rows[i].category,
    frequency: req.body.frequency,
    day: req.body.day ?? rows[i].day,
    paymentMethod: req.body.paymentMethod ?? rows[i].paymentMethod,
    note: String(req.body.note ?? rows[i].note ?? '').trim(),
    nextDue: req.body.nextDue && !Number.isNaN(Date.parse(req.body.nextDue))
      ? new Date(req.body.nextDue).toISOString().slice(0, 10)
      : rows[i].nextDue,
    active: req.body.active === undefined ? rows[i].active : Boolean(req.body.active),
  };
  writeJson(FILE, rows);
  res.json(rows[i]);
});

router.post('/:id/skip', authRequired, (req, res) => {
  // Advance nextDue by one period without recording a transaction.
  const rows = all();
  const i = rows.findIndex((r) => r.id === req.params.id && r.userId === req.user.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const cur = new Date(`${rows[i].nextDue}T00:00:00`);
  if (rows[i].frequency === 'weekly') cur.setDate(cur.getDate() + 7);
  else cur.setMonth(cur.getMonth() + 1);
  rows[i].nextDue = cur.toISOString().slice(0, 10);
  writeJson(FILE, rows);
  res.json(rows[i]);
});

router.delete('/:id', authRequired, (req, res) => {
  const rows = all();
  const i = rows.findIndex((r) => r.id === req.params.id && r.userId === req.user.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const [removed] = rows.splice(i, 1);
  writeJson(FILE, rows);
  res.json(removed);
});

module.exports = router;
