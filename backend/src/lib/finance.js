// Shared financial aggregations — single source of truth for
// /api/stats, /api/budgets, /api/ai and /api/system. All math lives here
// so frontend and backend never duplicate budget/total calculations.
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function normalize(rows) {
  return (rows || []).map((e) => ({
    ...e,
    type: e.type === 'income' ? 'income' : 'expense', // legacy rows default to expense
    amount: Number(e.amount) || 0,
    date: String(e.date || '').slice(0, 10),
    month: String(e.date || '').slice(0, 7),
    tags: Array.isArray(e.tags) ? e.tags : [],
  }));
}

function userRows(all, userId) {
  return normalize((all || []).filter((e) => e.userId === userId));
}

function summarize(rows) {
  const txns = normalize(rows);
  let income = 0;
  let expenses = 0;
  const byCategory = {};
  const incomeByCategory = {};
  const byMonth = {};
  const merchants = {};
  for (const t of txns) {
    const m = t.month || 'unknown';
    byMonth[m] = byMonth[m] || { income: 0, expenses: 0 };
    if (t.type === 'income') {
      income += t.amount;
      byMonth[m].income += t.amount;
      incomeByCategory[t.category || 'Other'] = (incomeByCategory[t.category || 'Other'] || 0) + t.amount;
    } else {
      expenses += t.amount;
      byMonth[m].expenses += t.amount;
      byCategory[t.category || 'Other'] = (byCategory[t.category || 'Other'] || 0) + t.amount;
    }
    const key = (t.title || 'Untitled').trim() || 'Untitled';
    merchants[key] = (merchants[key] || 0) + 1;
  }
  income = r2(income);
  expenses = r2(expenses);
  const net = r2(income - expenses);
  const savingsRate = income > 0 ? r2((net / income) * 100) : 0;
  const roundObj = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r2(v)]));
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || null;
  const topMerchants = Object.entries(merchants).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([title, count]) => ({ title, count }));
  return {
    income, expenses, net, count: txns.length, savingsRate,
    byCategory: roundObj(byCategory), incomeByCategory: roundObj(incomeByCategory),
    byMonth: Object.fromEntries(Object.entries(byMonth).map(([k, v]) => [k, { income: r2(v.income), expenses: r2(v.expenses) }])),
    topCategory: topCategory ? [topCategory[0], r2(topCategory[1])] : null,
    topMerchants,
  };
}

function monthRange(monthStr) {
  // monthStr YYYY-MM -> {start,end} inclusive date strings
  const [y, m] = monthStr.split('-').map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  return { start, end: `${monthStr}-${String(lastDay).padStart(2, '0')}` };
}

function filterMonth(rows, monthStr) {
  return normalize(rows).filter((t) => t.month === monthStr);
}

function compareMonths(rows, monthA, monthB) {
  // monthA = current, monthB = previous
  const a = summarize(filterMonth(rows, monthA));
  const b = summarize(filterMonth(rows, monthB));
  const pct = (x, y) => (y > 0 ? r2(((x - y) / y) * 100) : x > 0 ? 100 : 0);
  return {
    monthA, monthB,
    expensesA: a.expenses, expensesB: b.expenses, expensesPct: pct(a.expenses, b.expenses),
    incomeA: a.income, incomeB: b.income, incomePct: pct(a.income, b.income),
    byCategoryA: a.byCategory, byCategoryB: b.byCategory,
  };
}

function budgetStatus(budgets, rows, month) {
  const txns = filterMonth(rows, month).filter((t) => t.type === 'expense');
  const spentByCat = {};
  for (const t of txns) spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
  const list = (budgets || []).filter((b) => b.month === month).map((b) => {
    const spent = r2(spentByCat[b.category] || 0);
    const pct = b.limit > 0 ? r2((spent / b.limit) * 100) : 0;
    return {
      ...b, spent, remaining: r2(b.limit - spent), pct,
      state: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok',
    };
  });
  const totalLimit = r2(list.reduce((s, b) => s + b.limit, 0));
  const totalSpent = r2(list.reduce((s, b) => s + b.spent, 0));
  return {
    month, status: list, totalLimit, totalSpent,
    utilization: totalLimit > 0 ? r2((totalSpent / totalLimit) * 100) : 0,
  };
}

function budgetSuggestions(rows, nowMonth) {
  // Average monthly spend per category over the last 3 complete months.
  const months = [];
  const [y, m] = nowMonth.split('-').map(Number);
  for (let i = 1; i <= 3; i++) {
    const d = new Date(y, m - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const txns = normalize(rows).filter((t) => t.type === 'expense' && months.includes(t.month));
  const perCat = {};
  for (const t of txns) {
    perCat[t.category] = perCat[t.category] || { total: 0, months: new Set() };
    perCat[t.category].total += t.amount;
    perCat[t.category].months.add(t.month);
  }
  return Object.entries(perCat).map(([category, v]) => {
    const avg = r2(v.total / 3); // divide by 3 months even if a month had no spend
    return { category, avgMonthly: avg, suggested: Math.ceil(avg * 1.1), activeMonths: v.months.size };
  }).sort((a, b) => b.avgMonthly - a.avgMonthly);
}

function periodSummaries(rows) {
  // daily (last 14d), weekly (last 8w), monthly (last 12m), yearly totals for expenses+income
  const txns = normalize(rows).filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.date));
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daily = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = iso(d);
    const day = txns.filter((t) => t.date === key);
    daily.push({ date: key, income: r2(day.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)), expenses: r2(day.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)) });
  }
  const weekKey = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7)); const w1 = new Date(x.getFullYear(), 0, 4); return `${x.getFullYear()}-W${String(1 + Math.round(((x - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7)).padStart(2, '0')}`; };
  const weeks = {};
  for (const t of txns) {
    const k = weekKey(new Date(`${t.date}T00:00:00`));
    weeks[k] = weeks[k] || { week: k, income: 0, expenses: 0 };
    weeks[k][t.type === 'income' ? 'income' : 'expenses'] += t.amount;
  }
  const weekly = Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week)).slice(-8)
    .map((w) => ({ ...w, income: r2(w.income), expenses: r2(w.expenses) }));
  const s = summarize(txns);
  const monthly = Object.entries(s.byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
    .map(([month, v]) => ({ month, ...v }));
  const yearly = {};
  for (const [m, v] of Object.entries(s.byMonth)) {
    const yr = m.slice(0, 4);
    yearly[yr] = yearly[yr] || { year: yr, income: 0, expenses: 0 };
    yearly[yr].income += v.income; yearly[yr].expenses += v.expenses;
  }
  return {
    daily, weekly, monthly,
    yearly: Object.values(yearly).map((y) => ({ ...y, income: r2(y.income), expenses: r2(y.expenses) })),
  };
}

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['id,type,title,amount,category,date,payment_method,tags,note'];
  for (const e of normalize(rows)) {
    lines.push([e.id, e.type, esc(e.title), e.amount, esc(e.category), e.date, esc(e.paymentMethod || ''), esc((e.tags || []).join(';')), esc(e.note || '')].join(','));
  }
  return lines.join('\n');
}

module.exports = { r2, normalize, userRows, summarize, monthRange, filterMonth, compareMonths, budgetStatus, budgetSuggestions, periodSummaries, toCsv };
