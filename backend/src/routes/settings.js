const express = require('express');
const { readJson, writeJson } = require('../store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const FILE = 'settings.json';
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const THEMES = ['dark', 'light'];

function defaults() {
  return { currency: 'INR', theme: 'dark', monthlyBudgetDefault: 0, notifications: { budgetAlerts: true, weeklySummary: false } };
}

function allSettings() {
  return readJson(FILE, {});
}

function forUser(userId) {
  const all = allSettings();
  return { ...defaults(), ...(all[userId] || {}) };
}

router.get('/', authRequired, (req, res) => {
  res.json(forUser(req.user.id));
});

router.put('/', authRequired, (req, res) => {
  const { currency, theme, monthlyBudgetDefault, notifications } = req.body || {};
  const errors = [];
  if (currency !== undefined && !CURRENCIES.includes(currency)) errors.push('invalid currency');
  if (theme !== undefined && !THEMES.includes(theme)) errors.push('invalid theme');
  if (monthlyBudgetDefault !== undefined && (!Number.isFinite(Number(monthlyBudgetDefault)) || Number(monthlyBudgetDefault) < 0)) {
    errors.push('monthlyBudgetDefault must be >= 0');
  }
  if (errors.length) return res.status(400).json({ errors });
  const all = allSettings();
  const cur = forUser(req.user.id);
  all[req.user.id] = {
    currency: currency ?? cur.currency,
    theme: theme ?? cur.theme,
    monthlyBudgetDefault: monthlyBudgetDefault !== undefined ? Number(monthlyBudgetDefault) : cur.monthlyBudgetDefault,
    notifications: { ...cur.notifications, ...(notifications || {}) },
  };
  writeJson(FILE, all);
  res.json(all[req.user.id]);
});

// Rename profile (also updates users.json so /api/auth/me stays consistent).
router.put('/profile', authRequired, (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 60) return res.status(400).json({ error: 'name required (max 60 chars)' });
  const users = readJson('users.json', []);
  const u = users.find((x) => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.name = name;
  writeJson('users.json', users);
  res.json({ id: u.id, name: u.name, email: u.email });
});

// Export everything belonging to me (backup / data portability).
router.get('/export-all', authRequired, (req, res) => {
  const uid = req.user.id;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="spendwise-backup.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    transactions: readJson('expenses.json', []).filter((e) => e.userId === uid),
    budgets: readJson('budgets.json', []).filter((b) => b.userId === uid),
    recurring: readJson('recurring.json', []).filter((r) => r.userId === uid),
    goals: readJson('goals.json', []).filter((g) => g.userId === uid),
    settings: forUser(uid),
  });
});

// Delete all my data (account itself is kept so login still works).
router.delete('/data', authRequired, (req, res) => {
  const uid = req.user.id;
  for (const [file, isMap] of [['expenses.json'], ['budgets.json'], ['recurring.json'], ['goals.json']]) {
    const rows = readJson(file, []);
    writeJson(file, rows.filter((r) => r.userId !== uid));
  }
  const all = allSettings();
  delete all[uid];
  writeJson(FILE, all);
  res.json({ deleted: true });
});

module.exports = router;
