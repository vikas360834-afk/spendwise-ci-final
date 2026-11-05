/* Create/reset a ready-to-use demo account with data.
 * Usage: node tools/seed-demo-user.cjs
 * Credentials: demo@spendwise.com / demo1234
 */
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { readJson, writeJson } = require('../src/store');

const EMAIL = 'demo@spendwise.com';
const PASSWORD = 'demo1234';

(async () => {
  const users = readJson('users.json', []);
  let user = users.find((u) => String(u.email).toLowerCase() === EMAIL);
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  if (user) {
    user.passwordHash = passwordHash;
    user.name = user.name || 'Demo User';
    console.log(`reset password for existing user ${EMAIL}`);
  } else {
    user = {
      id: uuid(),
      name: 'Demo User',
      email: EMAIL,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    console.log(`created user ${EMAIL}`);
  }
  writeJson('users.json', users);

  const uid = user.id;
  const now = new Date();
  const ym = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const day = (offset, d) => `${ym(offset)}-${String(d).padStart(2, '0')}`;

  const expenses = readJson('expenses.json', []).filter((e) => e.userId !== uid);
  const rows = [
    ['Monthly salary', 85000, 'income', 'Salary', day(0, 1), 'Bank Transfer', ['salary'], 'Demo data'],
    ['Freelance project', 18000, 'income', 'Freelance', day(0, 8), 'Bank Transfer', [], 'Demo data'],
    ['Rent', 24000, 'expense', 'Bills', day(0, 2), 'Bank Transfer', ['rent'], 'Demo data'],
    ['Groceries', 5200, 'expense', 'Food', day(0, 3), 'UPI', ['groceries'], 'Demo data'],
    ['Metro card', 1500, 'expense', 'Transport', day(0, 5), 'Card', [], 'Demo data'],
    ['Electricity bill', 2100, 'expense', 'Bills', day(0, 10), 'Netbanking', [], 'Demo data'],
    ['Dinner with friends', 2800, 'expense', 'Food', day(0, 12), 'UPI', ['dining'], 'Demo data'],
    ['Shopping', 4300, 'expense', 'Shopping', day(0, 14), 'Card', [], 'Demo data'],
    ['Movie night', 900, 'expense', 'Entertainment', day(0, 16), 'UPI', [], 'Demo data'],
    ['Gym membership', 1800, 'expense', 'Health', day(0, 18), 'Card', [], 'Demo data'],
    ['Groceries', 4800, 'expense', 'Food', day(1, 6), 'UPI', ['groceries'], 'Demo data'],
    ['Flight tickets', 12500, 'expense', 'Travel', day(1, 15), 'Card', [], 'Demo data'],
    ['Salary', 85000, 'income', 'Salary', day(1, 1), 'Bank Transfer', ['salary'], 'Demo data'],
  ].map(([title, amount, type, category, date, paymentMethod, tags, note]) => ({
    id: uuid(), userId: uid, title, amount, type, category, date, paymentMethod, tags, note,
    createdAt: new Date().toISOString(),
  }));
  writeJson('expenses.json', [...expenses, ...rows]);
  console.log(`seeded ${rows.length} transactions`);

  const budgets = readJson('budgets.json', []).filter((b) => b.userId !== uid);
  writeJson('budgets.json', [
    ...budgets,
    { id: uuid(), userId: uid, category: 'Food', month: ym(0), limit: 10000 },
    { id: uuid(), userId: uid, category: 'Bills', month: ym(0), limit: 30000 },
    { id: uuid(), userId: uid, category: 'Transport', month: ym(0), limit: 4000 },
    { id: uuid(), userId: uid, category: 'Shopping', month: ym(0), limit: 6000 },
  ]);
  console.log('seeded 4 budgets');

  const goals = readJson('goals.json', []).filter((g) => g.userId !== uid);
  const targetDate = new Date(now.getFullYear() + 1, now.getMonth(), 28).toISOString().slice(0, 10);
  writeJson('goals.json', [
    ...goals,
    { id: uuid(), userId: uid, title: 'Emergency fund', targetAmount: 200000, currentAmount: 65000, targetDate, category: 'General' },
    { id: uuid(), userId: uid, title: 'New laptop', targetAmount: 120000, currentAmount: 32000, targetDate, category: 'Shopping' },
  ]);
  console.log('seeded 2 savings goals');

  const recurring = readJson('recurring.json', []).filter((r) => r.userId !== uid);
  const nextDue = (d) => {
    const dt = new Date(now.getFullYear(), now.getMonth(), d);
    if (dt < now) dt.setMonth(dt.getMonth() + 1);
    return dt.toISOString().slice(0, 10);
  };
  writeJson('recurring.json', [
    ...recurring,
    { id: uuid(), userId: uid, title: 'Netflix', amount: 649, type: 'expense', category: 'Entertainment', frequency: 'monthly', day: 5, paymentMethod: 'Card', nextDue: nextDue(5), active: true, createdAt: new Date().toISOString() },
    { id: uuid(), userId: uid, title: 'Spotify', amount: 199, type: 'expense', category: 'Entertainment', frequency: 'monthly', day: 12, paymentMethod: 'UPI', nextDue: nextDue(12), active: true, createdAt: new Date().toISOString() },
    { id: uuid(), userId: uid, title: 'Broadband', amount: 999, type: 'expense', category: 'Bills', frequency: 'monthly', day: 20, paymentMethod: 'Card', nextDue: nextDue(20), active: true, createdAt: new Date().toISOString() },
  ]);
  console.log('seeded 3 recurring bills');

  console.log('\nDemo login ready:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
})().catch((e) => { console.error(e); process.exit(1); });
