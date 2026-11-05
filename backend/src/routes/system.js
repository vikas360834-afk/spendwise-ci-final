const express = require('express');
const fs = require('fs');
const { readJson, DATA_DIR } = require('../store');
const { authRequired } = require('../middleware/auth');
const { userRows } = require('../lib/finance');
const pkg = require('../../package.json');

const router = express.Router();
const startTime = Date.now();

// Real local health only — pipeline/CI status is described (not faked) on the
// frontend DevOps page, which reads the repo's workflow file statically.
router.get('/health', authRequired, (req, res) => {
  let writable = false;
  try {
    fs.accessSync(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    writable = true;
  } catch { writable = false; }
  const files = {};
  for (const f of ['users.json', 'expenses.json', 'budgets.json', 'recurring.json', 'settings.json']) {
    try { fs.accessSync(`${DATA_DIR}/${f}`, fs.constants.R_OK); files[f] = true; }
    catch { files[f] = false; }
  }
  const myTxns = userRows(readJson('expenses.json', []), req.user.id).length;
  res.json({
    status: writable ? 'ok' : 'degraded',
    uptimeSec: Math.floor((Date.now() - startTime) / 1000),
    time: new Date().toISOString(),
    storage: { driver: 'json-file', dir: 'backend/data', readable: true, writable, files },
    aiMode: process.env.AI_API_KEY ? 'live' : 'demo',
    myTransactions: myTxns,
  });
});

router.get('/info', authRequired, (_req, res) => {
  res.json({
    app: 'SpendWise',
    version: pkg.version,
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    endpoints: ['/health', '/api/auth', '/api/expenses', '/api/stats', '/api/budgets', '/api/recurring', '/api/settings', '/api/ai', '/api/system'],
  });
});

module.exports = router;
