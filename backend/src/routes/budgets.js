const express = require('express');
const { v4: uuid } = require('uuid');
const { readJson, writeJson } = require('../store');
const { authRequired } = require('../middleware/auth');
const { budgetStatus, budgetSuggestions, userRows } = require('../lib/finance');

const router = express.Router();
const BUDGETS_FILE = 'budgets.json';
const EXPENSES_FILE = 'expenses.json';

function budgets() {
  return readJson(BUDGETS_FILE, []);
}

// GET /api/budgets?month=YYYY-MM
router.get('/', authRequired, (req, res) => {
  let out = budgets().filter((b) => b.userId === req.user.id);
  if (req.query.month) out = out.filter((b) => b.month === req.query.month);
  res.json(out);
});

// GET /api/budgets/status/overview?month=YYYY-MM -> spent vs limit per category.
// Shape preserved ({month,status} with spent/remaining) + pct/state/totals.
router.get('/status/overview', authRequired, (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const userBudgets = budgets().filter((b) => b.userId === req.user.id);
  const txns = userRows(readJson(EXPENSES_FILE, []), req.user.id);
  res.json(budgetStatus(userBudgets, txns, month));
});

// GET /api/budgets/suggestions — avg monthly spend per category over the
// last 3 months, with a suggested (+10%) limit. Estimates, not guarantees.
router.get('/suggestions', authRequired, (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const txns = userRows(readJson(EXPENSES_FILE, []), req.user.id);
  res.json({ month, suggestions: budgetSuggestions(txns, month) });
});

router.post('/', authRequired, (req, res) => {
  const { category, month, limit } = req.body || {};
  if (!category || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'category and month (YYYY-MM) required' });
  }
  if (!Number.isFinite(Number(limit)) || Number(limit) <= 0) {
    return res.status(400).json({ error: 'limit must be a positive number' });
  }
  const rows = budgets();
  if (rows.some((b) => b.userId === req.user.id && b.category === category && b.month === month)) {
    return res.status(409).json({ error: 'Budget already exists for this category/month' });
  }
  const b = { id: uuid(), userId: req.user.id, category, month, limit: Number(limit) };
  rows.push(b);
  writeJson(BUDGETS_FILE, rows);
  res.status(201).json(b);
});

router.delete('/:id', authRequired, (req, res) => {
  const rows = budgets();
  const i = rows.findIndex((b) => b.id === req.params.id && b.userId === req.user.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const [removed] = rows.splice(i, 1);
  writeJson(BUDGETS_FILE, rows);
  res.json(removed);
});

module.exports = router;
