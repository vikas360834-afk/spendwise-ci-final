const express = require('express');
const { v4: uuid } = require('uuid');
const { readJson, writeJson } = require('../store');
const { authRequired } = require('../middleware/auth');
const { userRows, toCsv } = require('../lib/finance');

const router = express.Router();
const FILE = 'expenses.json';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Travel', 'Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Netbanking', 'Wallet', 'Other'];

function all() {
  return readJson(FILE, []);
}
function save(rows) {
  writeJson(FILE, rows);
}

function validate(body) {
  const errors = [];
  if (!body.title || !String(body.title).trim()) errors.push('title required');
  else if (String(body.title).trim().length > 120) errors.push('title too long (max 120)');
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push('amount must be a positive number');
  else if (amount > 100000000) errors.push('amount unrealistically large');
  const type = body.type || 'expense';
  if (!['income', 'expense'].includes(type)) errors.push('type must be income or expense');
  if (body.category && !CATEGORIES.includes(body.category)) errors.push('invalid category');
  if (body.date && Number.isNaN(Date.parse(body.date))) errors.push('invalid date');
  if (body.paymentMethod && !PAYMENT_METHODS.includes(body.paymentMethod)) errors.push('invalid payment method');
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) errors.push('tags must be an array');
    else if (body.tags.length > 10) errors.push('max 10 tags');
    else if (body.tags.some((t) => typeof t !== 'string' || !t.trim() || t.length > 30)) errors.push('each tag max 30 chars');
  }
  if (body.note && String(body.note).length > 500) errors.push('note too long (max 500)');
  return errors;
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))].slice(0, 10);
}

function filterForUser(rows, userId, q) {
  let out = userRows(rows, userId);
  const { search = '', category = '', type = '', paymentMethod = '', startDate = '', endDate = '', sort = 'date', order = 'desc' } = q;
  if (search.trim()) {
    const s = search.toLowerCase();
    out = out.filter((e) => `${e.title} ${e.note || ''} ${(e.tags || []).join(' ')}`.toLowerCase().includes(s));
  }
  if (category) out = out.filter((e) => e.category === category);
  if (type) out = out.filter((e) => e.type === type);
  if (paymentMethod) out = out.filter((e) => (e.paymentMethod || '') === paymentMethod);
  if (startDate) out = out.filter((e) => e.date >= startDate);
  if (endDate) out = out.filter((e) => e.date <= endDate);
  out.sort((a, b) => {
    let cmp = 0;
    if (sort === 'amount') cmp = a.amount - b.amount;
    else if (sort === 'title') cmp = String(a.title).localeCompare(String(b.title));
    else cmp = String(a.date).localeCompare(String(b.date));
    return order === 'asc' ? cmp : -cmp;
  });
  return out;
}

// CSV export must be registered before /:id route
router.get('/export', authRequired, (req, res) => {
  const rows = filterForUser(all(), req.user.id, req.query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="spendwise-transactions.csv"');
  res.send(toCsv(rows));
});

router.get('/', authRequired, (req, res) => {
  const rows = filterForUser(all(), req.user.id, req.query);
  // Paginated object mode only when page/limit requested — otherwise plain
  // array to preserve the original API contract.
  if (req.query.page !== undefined || req.query.limit !== undefined) {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);
    return res.json({ data: rows.slice((page - 1) * limit, page * limit), total, page, pages, limit });
  }
  res.json(rows);
});

function buildTxn(body, userId) {
  return {
    id: uuid(),
    userId,
    type: body.type === 'income' ? 'income' : 'expense',
    title: String(body.title).trim(),
    amount: Number(body.amount),
    category: body.category || 'Other',
    date: body.date ? new Date(body.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    paymentMethod: body.paymentMethod || '',
    tags: cleanTags(body.tags),
    note: String(body.note || '').trim(),
    createdAt: new Date().toISOString(),
  };
}

router.post('/', authRequired, (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) return res.status(400).json({ errors });
  const rows = all();
  const txn = buildTxn(req.body, req.user.id);
  rows.push(txn);
  save(rows);
  res.status(201).json(txn);
});

router.put('/:id', authRequired, (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) return res.status(400).json({ errors });
  const rows = all();
  const i = rows.findIndex((e) => e.id === req.params.id && e.userId === req.user.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  rows[i] = {
    ...rows[i],
    type: req.body.type === 'income' ? 'income' : 'expense',
    title: String(req.body.title).trim(),
    amount: Number(req.body.amount),
    category: req.body.category || rows[i].category,
    date: req.body.date ? new Date(req.body.date).toISOString().slice(0, 10) : rows[i].date,
    paymentMethod: req.body.paymentMethod !== undefined ? req.body.paymentMethod : (rows[i].paymentMethod || ''),
    tags: req.body.tags !== undefined ? cleanTags(req.body.tags) : (rows[i].tags || []),
    note: String(req.body.note ?? rows[i].note ?? '').trim(),
  };
  save(rows);
  res.json(rows[i]);
});

router.delete('/:id', authRequired, (req, res) => {
  const rows = all();
  const i = rows.findIndex((e) => e.id === req.params.id && e.userId === req.user.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const [removed] = rows.splice(i, 1);
  save(rows);
  res.json(removed);
});

router.get('/meta/categories', (_req, res) => res.json(CATEGORIES));
router.get('/meta/payment-methods', (_req, res) => res.json(PAYMENT_METHODS));

module.exports = router;
module.exports.CATEGORIES = CATEGORIES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
