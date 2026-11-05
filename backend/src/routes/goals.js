const express = require('express');
const { v4: uuid } = require('uuid');
const { readJson, writeJson } = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const FILE = 'goals.json';

function all() {
  return readJson(FILE, []);
}

function save(rows) {
  writeJson(FILE, rows);
}

function userGoals(userId) {
  return all().filter((g) => g.userId === userId);
}

function validate(body) {
  const errors = [];
  if (!body.title || !String(body.title).trim()) errors.push('title is required');
  else if (String(body.title).trim().length > 100) errors.push('title max 100 chars');

  const targetAmount = Number(body.targetAmount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) errors.push('targetAmount must be a positive number');

  const currentAmount = body.currentAmount !== undefined ? Number(body.currentAmount) : 0;
  if (!Number.isFinite(currentAmount) || currentAmount < 0) errors.push('currentAmount cannot be negative');

  if (body.targetDate && Number.isNaN(Date.parse(body.targetDate))) errors.push('invalid targetDate');
  return errors;
}

// GET /api/goals — list all goals for authenticated user
router.get('/', authRequired, (req, res) => {
  const goals = userGoals(req.user.id).map((g) => {
    const target = Number(g.targetAmount) || 1;
    const current = Number(g.currentAmount) || 0;
    const pct = Math.min(100, Math.round((current / target) * 100));
    const remaining = Math.max(0, target - current);
    return { ...g, pct, remaining };
  });
  res.json(goals);
});

// POST /api/goals — create new savings goal
router.post('/', authRequired, (req, res) => {
  const errors = validate(req.body || {});
  if (errors.length) return res.status(400).json({ errors });

  const rows = all();
  const targetAmount = Math.round(Number(req.body.targetAmount) * 100) / 100;
  const currentAmount = Math.round((Number(req.body.currentAmount) || 0) * 100) / 100;
  const newGoal = {
    id: uuid(),
    userId: req.user.id,
    title: String(req.body.title).trim(),
    targetAmount,
    currentAmount,
    targetDate: req.body.targetDate || '',
    category: req.body.category || 'General',
    note: req.body.note ? String(req.body.note).trim() : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  rows.push(newGoal);
  save(rows);

  const pct = Math.min(100, Math.round((currentAmount / (targetAmount || 1)) * 100));
  const remaining = Math.max(0, targetAmount - currentAmount);
  res.status(201).json({ ...newGoal, pct, remaining });
});

// PUT /api/goals/:id — update a goal
router.put('/:id', authRequired, (req, res) => {
  const rows = all();
  const idx = rows.findIndex((g) => g.id === req.params.id && g.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Goal not found' });

  const errors = validate({ ...rows[idx], ...req.body });
  if (errors.length) return res.status(400).json({ errors });

  const existing = rows[idx];
  const targetAmount = req.body.targetAmount !== undefined ? Math.round(Number(req.body.targetAmount) * 100) / 100 : existing.targetAmount;
  const currentAmount = req.body.currentAmount !== undefined ? Math.round(Number(req.body.currentAmount) * 100) / 100 : existing.currentAmount;

  rows[idx] = {
    ...existing,
    title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
    targetAmount,
    currentAmount,
    targetDate: req.body.targetDate !== undefined ? req.body.targetDate : existing.targetDate,
    category: req.body.category !== undefined ? req.body.category : existing.category,
    note: req.body.note !== undefined ? String(req.body.note).trim() : existing.note,
    updatedAt: new Date().toISOString(),
  };

  save(rows);
  const pct = Math.min(100, Math.round((currentAmount / (targetAmount || 1)) * 100));
  const remaining = Math.max(0, targetAmount - currentAmount);
  res.json({ ...rows[idx], pct, remaining });
});

// POST /api/goals/:id/contribute — add funds to a goal
router.post('/:id/contribute', authRequired, (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const rows = all();
  const idx = rows.findIndex((g) => g.id === req.params.id && g.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Goal not found' });

  const existing = rows[idx];
  const newCurrent = Math.round((Number(existing.currentAmount || 0) + amount) * 100) / 100;
  rows[idx] = {
    ...existing,
    currentAmount: newCurrent,
    updatedAt: new Date().toISOString(),
  };

  save(rows);
  const target = Number(existing.targetAmount) || 1;
  const pct = Math.min(100, Math.round((newCurrent / target) * 100));
  const remaining = Math.max(0, target - newCurrent);
  res.json({ ...rows[idx], pct, remaining });
});

// DELETE /api/goals/:id — delete a goal
router.delete('/:id', authRequired, (req, res) => {
  const rows = all();
  const idx = rows.findIndex((g) => g.id === req.params.id && g.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Goal not found' });

  const [removed] = rows.splice(idx, 1);
  save(rows);
  res.json(removed);
});

module.exports = router;
