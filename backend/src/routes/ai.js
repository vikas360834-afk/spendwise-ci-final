const express = require('express');
const { readJson } = require('../store');
const { authRequired } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { userRows, summarize, compareMonths, budgetStatus, filterMonth } = require('../lib/finance');

const router = express.Router();

const AI_URL = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_KEY = process.env.AI_API_KEY || '';
const liveMode = () => Boolean(AI_KEY);

router.get('/status', authRequired, (_req, res) => {
  res.json({ mode: liveMode() ? 'live' : 'demo' });
});

function buildContext(uid) {
  const txns = userRows(readJson('expenses.json', []), uid);
  const budgets = readJson('budgets.json', []).filter((b) => b.userId === uid);
  const recurring = readJson('recurring.json', []).filter((r) => r.userId === uid && r.active !== false);
  const goals = readJson('goals.json', []).filter((g) => g.userId === uid);
  const s = summarize(txns);
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prev = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
  const curS = summarize(filterMonth(txns, cur));
  const cmp = compareMonths(txns, cur, prev);
  const bstat = budgetStatus(budgets, txns, cur);
  return { txns, s, cur, prev, curS, cmp, bstat, recurring, goals, budgetCount: budgets.length };
}

// --- Demo engine: rule-based answers computed from REAL user figures.
// Always returned with mode:'demo' so clients label it honestly.
function demoAnswer(message, ctx) {
  const m = message.toLowerCase();
  const { s, cur, prev, curS, cmp, bstat, goals } = ctx;
  const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  if (s.count === 0) {
    return 'You have no transactions yet, so I can\'t analyze real spending. Add some income and expenses (or tap “Load Demo” on the Transactions page) and ask me again — I only report actual figures, never guesses.';
  }
  const topCategoryEntries = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
  const topLine = topCategoryEntries.slice(0, 3).map(([c, v]) => `${c} (${inr(v)})`).join(', ');
  const curTopCatEntries = Object.entries(curS.byCategory).sort((a, b) => b[1] - a[1]);
  const curTopLine = curTopCatEntries.slice(0, 3).map(([c, v]) => `${c} (${inr(v)})`).join(', ');
  const over = bstat.status.filter((b) => b.state === 'exceeded');
  const warn = bstat.status.filter((b) => b.state === 'warning');

  // Question: How much did I spend this month?
  if (/(spend this month|spent this month|how much.*spend.*month|this month.*spend)/.test(m)) {
    return `[Actual Data] In ${cur}, you have spent a total of ${inr(curS.expenses)} across ${curS.count} transactions. Total income received this month is ${inr(curS.income)}, leaving a net balance of ${inr(curS.income - curS.expenses)}.\n\n[AI Suggestion] Your top spending category this month is ${curTopLine || 'not categorized yet'}. Keeping track of daily transactions ensures you stay within your monthly targets.`;
  }

  // Question: What is my biggest expense category?
  if (/(biggest|largest|highest|most|where am i spending).*(category|expense|money)/.test(m) || /(top category)/.test(m)) {
    const top = topCategoryEntries[0];
    if (!top) return `You don't have any categorized expenses recorded yet.`;
    const pct = s.expenses > 0 ? Math.round((top[1] / s.expenses) * 100) : 0;
    return `[Actual Data] Your biggest expense category is ${top[0]} with a total spend of ${inr(top[1])}, accounting for ${pct}% of your all-time expenses (${inr(s.expenses)}).\n\nOther notable categories: ${topLine || 'none'}.\n\n[AI Suggestion] If you want to optimize your monthly outflow, setting a dedicated monthly budget on ${top[0]} will yield the highest savings.`;
  }

  // Question: Compare this month's spending with last month.
  if (/(compar|last month|previous.*month|vs|versus)/.test(m)) {
    const dir = cmp.expensesPct >= 0 ? 'higher' : 'lower';
    return `[Actual Data] Month-over-Month Comparison (${cur} vs ${prev}):\n• Expenses: ${inr(cmp.expensesA)} vs ${inr(cmp.expensesB)} (${Math.abs(cmp.expensesPct)}% ${dir})\n• Income: ${inr(cmp.incomeA)} vs ${inr(cmp.incomeB)} (${cmp.incomePct >= 0 ? '+' : ''}${cmp.incomePct}%)\n• Net Savings: ${inr(curS.income - curS.expenses)} in ${cur}\n\n[AI Suggestion] ${cmp.expensesPct > 10 ? 'Spending has increased compared to last month. Check your high-value discretionary transactions.' : 'Great job keeping expenses controlled relative to last month!'}`;
  }

  // Question: How much money can I save?
  if (/(how much.*save|saving|savings plan|save money|how much can i save)/.test(m)) {
    const target20 = Math.max(0, (curS.income > 0 ? curS.income : s.income) * 0.2);
    const activeGoals = (goals || []).map((g) => `${g.title} (${inr(g.currentAmount)} / ${inr(g.targetAmount)})`).join(', ');
    return `[Actual Data] Your current all-time savings rate is ${s.savingsRate}% (Income: ${inr(s.income)}, Expenses: ${inr(s.expenses)}, Net Savings: ${inr(s.net)}).\n\n[AI Recommendation] Based on the standard 50/30/20 financial rule, aiming to save 20% of your income gives a healthy benchmark of ≈ ${inr(target20)}/month. You can free up an estimated ${inr((topCategoryEntries[0]?.[1] || 0) * 0.15)} by trimming 15% from ${topCategoryEntries[0]?.[0] || 'discretionary spend'}.${activeGoals ? `\n\nActive Savings Goals: ${activeGoals}` : ''}`;
  }

  // Question: Am I exceeding my budget?
  if (/(exceed|over.*budget|within.*budget|budget.*status|budget)/.test(m)) {
    if (!bstat.status.length) {
      return `[Actual Data] You have no budgets configured for ${cur}.\n\n[AI Suggestion] Navigate to the Budgets page to set limits for key categories like ${topCategoryEntries[0]?.[0] || 'Food'} and I will monitor whether you are exceeding them in real-time.`;
    }
    const bits = bstat.status.map((b) => `${b.category}: ${inr(b.spent)}/${inr(b.limit)} (${b.pct}% consumed)`).join('\n• ');
    if (over.length > 0) {
      return `[Actual Data] Warning: You have exceeded ${over.length} budget(s) in ${cur}:\n• ${over.map((b) => `${b.category} (Spent ${inr(b.spent)}, Limit ${inr(b.limit)}, Over by ${inr(b.spent - b.limit)})`).join('\n• ')}\n\nOverall utilization: ${bstat.utilization}% (${inr(bstat.totalSpent)} of ${inr(bstat.totalLimit)}).\n\n[AI Suggestion] Pause discretionary spending in these categories for the rest of this month.`;
    }
    if (warn.length > 0) {
      return `[Actual Data] You are nearing your limit on: ${warn.map((b) => `${b.category} (${b.pct}%)`).join(', ')}.\n• ${bits}\n\nOverall utilization is ${bstat.utilization}% (${inr(bstat.totalSpent)} of ${inr(bstat.totalLimit)}).\n\n[AI Suggestion] Keep a close eye on these categories to stay within your targets.`;
    }
    return `[Actual Data] All your budgets are on track for ${cur}!\n• ${bits}\n\nOverall utilization is at ${bstat.utilization}% (${inr(bstat.totalSpent)} of ${inr(bstat.totalLimit)}).\n\n[AI Suggestion] Keep maintaining your current spending discipline.`;
  }

  // Question: Show my spending trends.
  if (/(trend|spending trends|pattern|velocity|history)/.test(m)) {
    const monthlySummary = Object.entries(s.byMonth).slice(-4).map(([mth, v]) => `${mth}: Spent ${inr(v.expenses)}, Income ${inr(v.income)}`).join('\n• ');
    return `[Actual Data] Spending Trends over recent periods:\n• ${monthlySummary || 'Single period recorded'}\n• All-time average monthly expenditure: ${inr(s.expenses / (Object.keys(s.byMonth).length || 1))}\n\n[AI Observation] Top spending drivers are ${topLine || 'none'}. Your income-to-expense net margin is ${s.savingsRate}%.`;
  }

  // Question: Give suggestions to reduce unnecessary expenses.
  if (/(reduc|cut|unnecess|waste|suggestion.*expense|lower.*expense|save more)/.test(m)) {
    const topCat = topCategoryEntries[0] ? topCategoryEntries[0][0] : 'top categories';
    return `[AI Recommendation] High-Impact Ways to Reduce Unnecessary Expenses:\n1. Cap ${topCat}: Set a strict monthly budget limit on ${topCat} to immediately prevent overspending.\n2. Review Recurring Subscriptions: Check the Recurring tab for any subscriptions you no longer use.\n3. Implement the 24-Hour Rule: Wait 24 hours before making non-essential purchases above ${inr(1000)}.\n4. Allocate Savings First: Automate contributions into your Savings Goals right when your income arrives.\n\nAll suggestions are derived from your actual figures (${inr(s.expenses)} total expenses recorded).`;
  }

  return `[Actual Data] Overview from your actual records: ${s.count} transactions, Total Income ${inr(s.income)}, Total Expenses ${inr(s.expenses)}, Net Savings ${inr(s.net)} (Savings Rate ${s.savingsRate}%).\n\nTop categories: ${topLine || 'None categorized yet'}.\n\nYou can ask me:\n• "How much did I spend this month?"\n• "What is my biggest expense category?"\n• "Compare this month's spending with last month"\n• "How much money can I save?"\n• "Am I exceeding my budget?"\n• "Show my spending trends"\n• "Give suggestions to reduce unnecessary expenses"`;
}

async function liveAnswer(message, ctx) {
  // Send ONLY aggregates — never raw transactions — to the provider.
  const context = {
    currency: 'INR',
    currentMonth: ctx.cur,
    previousMonth: ctx.prev,
    allTime: { income: ctx.s.expenses !== undefined ? ctx.s.income : 0, expenses: ctx.s.expenses, net: ctx.s.net, savingsRate: ctx.s.savingsRate, transactions: ctx.s.count },
    currentMonthSummary: { income: ctx.curS.income, expenses: ctx.curS.expenses },
    monthComparisonPct: { expensesPct: ctx.cmp.expensesPct, incomePct: ctx.cmp.incomePct },
    topExpenseCategories: Object.entries(ctx.s.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5),
    budgetStatus: ctx.bstat.status.map((b) => ({ category: b.category, limit: b.limit, spent: b.spent, pct: b.pct, state: b.state })),
    activeRecurring: ctx.recurring.slice(0, 10).map((r) => ({ title: r.title, amount: r.amount, type: r.type, frequency: r.frequency, nextDue: r.nextDue })),
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(AI_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.3,
        max_tokens: 600,
        messages: [
          { role: 'system', content: 'You are SpendWise, a personal-finance assistant. Answer ONLY using the provided JSON context with actual user figures formatted as INR (en-IN). Clearly separate "actual figures" from "suggestions". Never invent transactions. Give general budgeting guidance only — no guaranteed investment returns, no specific securities advice.' },
          { role: 'user', content: `Context:\n${JSON.stringify(context)}\n\nQuestion: ${message}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`provider ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('empty provider reply');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

router.post('/chat', authRequired, rateLimit({ max: 15 }), async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message || message.length > 1000) return res.status(400).json({ error: 'message required (max 1000 chars)' });
  const ctx = buildContext(req.user.id);
  if (!liveMode()) {
    return res.json({ mode: 'demo', reply: demoAnswer(message, ctx) });
  }
  try {
    const reply = await liveAnswer(message, ctx);
    return res.json({ mode: 'live', reply });
  } catch (err) {
    console.error('[ai] provider failed, falling back to demo:', err.message);
    return res.json({ mode: 'demo', reply: demoAnswer(message, ctx), warning: 'Live AI unavailable — showing offline insights from your real data instead.' });
  }
});

module.exports = router;
