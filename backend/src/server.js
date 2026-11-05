const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const { readJson, writeJson } = require('./store');
const { authRequired } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const budgetRoutes = require('./routes/budgets');
const statsRoutes = require('./routes/stats');
const recurringRoutes = require('./routes/recurring');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const systemRoutes = require('./routes/system');
const goalsRoutes = require('./routes/goals');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/goals', goalsRoutes);

// Demo seed data (auth required). Only seeds when the user has no data;
// clearly separate from real records via the note field.
app.post('/api/seed', authRequired, (req, res) => {
  const rows = readJson('expenses.json', []);
  const userRows = rows.filter((e) => e.userId === req.user.id);
  if (userRows.length > 0) return res.json({ seeded: 0, message: 'Already has data' });
  const demo = [
    ['Monthly salary', 85000, 'income', 'Salary', '2026-09-01', 'Bank Transfer', [], 'Demo data'],
    ['Groceries', 4250, 'expense', 'Food', '2026-09-02', 'UPI', ['groceries'], 'Demo data'],
    ['Metro pass', 1200, 'expense', 'Transport', '2026-09-05', 'Card', [], 'Demo data'],
    ['Electricity', 1890, 'expense', 'Bills', '2026-09-10', 'Netbanking', [], 'Demo data'],
    ['Movie night', 900, 'expense', 'Entertainment', '2026-09-14', 'UPI', [], 'Demo data'],
    ['Freelance payout', 12000, 'income', 'Freelance', '2026-09-20', 'Bank Transfer', [], 'Demo data'],
    ['Groceries', 3800, 'expense', 'Food', '2026-10-01', 'UPI', ['groceries'], 'Demo data'],
    ['Flight', 7499, 'expense', 'Travel', '2026-10-03', 'Card', [], 'Demo data'],
  ].map(([title, amount, type, category, date, paymentMethod, tags, note]) => ({
    id: uuid(),
    userId: req.user.id,
    type,
    title,
    amount,
    category,
    date,
    paymentMethod,
    tags,
    note,
    createdAt: new Date().toISOString(),
  }));
  writeJson('expenses.json', [...rows, ...demo]);
  res.status(201).json({ seeded: demo.length });
});

// Serve React build in production (single-container deploy)
const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`SpendWise API on http://localhost:${PORT} (ai=${process.env.AI_API_KEY ? 'live' : 'demo'})`));
}

module.exports = app;
