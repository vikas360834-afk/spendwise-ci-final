const express = require('express');
const { readJson } = require('../store');
const { authRequired } = require('../middleware/auth');
const { userRows, summarize, periodSummaries } = require('../lib/finance');

const router = express.Router();

// GET /api/stats — legacy fields preserved (total = expenses total),
// extended with income / net / savings-rate / series for the new dashboard.
router.get('/', authRequired, (req, res) => {
  const rows = userRows(readJson('expenses.json', []), req.user.id);
  const s = summarize(rows);
  res.json({
    total: s.expenses,
    count: s.count,
    byCategory: s.byCategory,
    byMonth: Object.fromEntries(Object.entries(s.byMonth).map(([k, v]) => [k, v.expenses])),
    topCategory: s.topCategory,
    income: s.income,
    expenses: s.expenses,
    net: s.net,
    savingsRate: s.savingsRate,
    incomeByCategory: s.incomeByCategory,
    monthly: Object.entries(s.byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
    topMerchants: s.topMerchants,
  });
});

// GET /api/stats/periods — daily/weekly/monthly/yearly series for Analytics.
router.get('/periods', authRequired, (req, res) => {
  const rows = userRows(readJson('expenses.json', []), req.user.id);
  res.json(periodSummaries(rows));
});

module.exports = router;
