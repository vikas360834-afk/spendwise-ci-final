import { useEffect, useState, useMemo, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Sparkles,
  CreditCard,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap,
  PiggyBank,
  CalendarClock,
  BarChart3,
  Bot,
  Plus,
  Coins
} from 'lucide-react';
import { api } from '../api.js';
import { fmtMoney, monthLabel, todayYM } from '../lib/format.js';
import {
  GlassCard,
  MetricCard,
  AnalyticsPanel,
  TransactionList,
} from '../components/NeonComponents.jsx';
import { SkeletonCards, EmptyState, Progress, StatePill } from '../components/ui.jsx';

export function Overview({ onNavigate, onOpenAddExpense }) {
  const [stats, setStats] = useState(null);
  const [periods, setPeriods] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, p, b, tx, r, g] = await Promise.all([
          api.stats(),
          api.periods(),
          api.budgetStatus(todayYM()),
          api.listExpenses({ page: 1, limit: 6, sort: 'date', order: 'desc' }),
          api.upcomingRecurring(30),
          api.listGoals(),
        ]);
        setStats(s);
        setPeriods(p);
        setBudgets(b);
        setRecentTxns(Array.isArray(tx) ? tx : tx.data || []);
        setRecurring(r || []);
        setGoals(g || []);
      } catch (e) {
        console.error('Failed to load overview data', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const monthlyHistory = useMemo(() => stats?.monthly?.slice(-6) || [], [stats?.monthly]);
  const incomeSeries = monthlyHistory.map((m) => m.income);
  const expenseSeries = monthlyHistory.map((m) => m.expenses);
  const labels = monthlyHistory.map((m) => monthLabel(m.month));

  const catLabels = Object.keys(stats?.byCategory || {});
  const catData = catLabels.map((l) => stats.byCategory[l]);

  if (loading) return <SkeletonCards n={4} />;

  if (!stats || stats.count === 0) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Financial Cockpit
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Real-time telemetry & intelligence • Zero records detected
          </p>
        </div>
        <GlassCard
          title="Welcome to SpendWise AI"
          subtitle="Your futuristic financial command center"
          icon={<Wallet size={20} />}
          iconTone="purple"
          withDecor
        >
          <EmptyState
            icon={<Wallet size={48} />}
            title="No Transactions Recorded"
            sub="Initialize your ledger with realistic demo data or record your first cash flow transaction to ignite the cockpit telemetry."
            action={
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn-neon btn-neon-primary" onClick={onOpenAddExpense}>
                  <Plus size={16} /> Record Transaction
                </button>
                <button
                  className="btn-neon btn-neon-secondary"
                  onClick={async () => {
                    await api.seed();
                    window.location.reload();
                  }}
                >
                  Load Demo Data
                </button>
              </div>
            }
          />
        </GlassCard>
      </div>
    );
  }

  const netBalance = stats.income - stats.expenses;
  const budgetUtil = budgets?.utilization || 0;
  const exceededBudgets = budgets?.status?.filter((b) => b.state === 'exceeded') || [];

  // Month-over-month trend calculations
  const prevMonth = monthlyHistory.length >= 2 ? monthlyHistory[monthlyHistory.length - 2] : null;
  const currMonth = monthlyHistory.length >= 1 ? monthlyHistory[monthlyHistory.length - 1] : null;

  const incomeTrend = prevMonth && currMonth && prevMonth.income > 0
    ? Math.round(((currMonth.income - prevMonth.income) / prevMonth.income) * 100)
    : null;

  const expenseTrend = prevMonth && currMonth && prevMonth.expenses > 0
    ? Math.round(((currMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100)
    : null;

  const netTrend = prevMonth && currMonth
    ? Math.round((((currMonth.income - currMonth.expenses) - (prevMonth.income - prevMonth.expenses)) / (Math.abs(prevMonth.income - prevMonth.expenses) || 1)) * 100)
    : null;

  // Savings goals aggregation
  const totalGoalTarget = goals.reduce((s, g) => s + (g.target || g.targetAmount || 0), 0);
  const totalGoalCurrent = goals.reduce((s, g) => s + (g.current || g.currentAmount || 0), 0);
  const goalProgress = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

  return (
    <div>
      {/* Page Title & Quick Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Financial Cockpit
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Real-time telemetry, cash flow velocity & budget protection • {monthLabel(todayYM())}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-neon btn-neon-secondary" onClick={() => onNavigate && onNavigate('reports')}>
            Monthly Report
          </button>
          <button className="btn-neon btn-neon-primary" onClick={onOpenAddExpense}>
            <ArrowDownRight size={16} /> Quick Add
          </button>
        </div>
      </div>

      {/* ======== 1. Financial Overview: 4 Asymmetric Metric Cards ======== */}
      <div className="metrics-overview-grid">
        {/* Card 1: Total Balance (Primary Hero Card) */}
        <MetricCard
          type="balance"
          label="Total Net Balance"
          value={fmtMoney(netBalance)}
          sub={netBalance >= 0 ? 'Surplus capital reserve' : 'Deficit run rate'}
          trend={netTrend}
          icon={<Wallet size={20} />}
        />

        {/* Card 2: Monthly Income (with sparkline) */}
        <MetricCard
          type="income"
          label="Monthly Income"
          value={fmtMoney(currMonth?.income || stats.income)}
          sub="Verified inflows"
          trend={incomeTrend}
          sparklineData={incomeSeries.length ? incomeSeries : [30, 45, 38, 55, 48, 65]}
          icon={<ArrowUpRight size={20} />}
        />

        {/* Card 3: Monthly Expenses (with velocity indicator) */}
        <MetricCard
          type="expenses"
          label="Monthly Expenses"
          value={fmtMoney(currMonth?.expenses || stats.expenses)}
          sub="Total outflows"
          trend={expenseTrend}
          sparklineData={expenseSeries.length ? expenseSeries : [40, 35, 50, 42, 58, 48]}
          icon={<ArrowDownRight size={20} />}
        />

        {/* Card 4: Savings Rate (with circular progress ring) */}
        <MetricCard
          type="savings"
          label="Savings Efficiency"
          value={`${stats.savingsRate}%`}
          sub={stats.savingsRate >= 20 ? 'Optimal discipline (≥20%)' : 'Below 20% target'}
          progress={stats.savingsRate}
          icon={<PiggyBank size={20} />}
        />
      </div>

      {/* ======== 2. Signature Circular Visualizations Telemetry ======== */}
      <AnalyticsPanel
        stats={stats}
        budgets={budgets}
        savingsRate={stats.savingsRate}
        onNavigate={onNavigate}
      />

      {/* ======== 3. Interactive Cash Flow Velocity & Category Donut ======== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 22, marginBottom: 24 }}>
        {/* Cash Flow Dual Area Chart */}
        <GlassCard
          title="Cash Flow Velocity"
          subtitle="6-month continuous income vs expense trajectory"
          icon={<Activity size={20} />}
          iconTone="cyan"
          actionLabel="Analytics"
          onAction={() => onNavigate && onNavigate('analytics')}
        >
          <div style={{ display: 'flex', gap: 18, fontSize: 12, marginBottom: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 8px var(--neon-cyan)' }} />
              Income Inflows
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-magenta)', boxShadow: '0 0 8px var(--neon-magenta)' }} />
              Expenses Outflow
            </span>
          </div>
          <div style={{ height: 260, position: 'relative' }}>
            <InteractiveCashFlowChart labels={labels} income={incomeSeries} expenses={expenseSeries} />
          </div>
        </GlassCard>

        {/* Category Proportion Donut */}
        <GlassCard
          title="Expense Breakdown"
          subtitle="Category proportion of all spending"
          icon={<PieChart size={20} />}
          iconTone="magenta"
          actionLabel="Categories"
          onAction={() => onNavigate && onNavigate('categories')}
        >
          <div style={{ height: 260, position: 'relative' }}>
            <DashboardDonut labels={catLabels} data={catData} total={stats.expenses} />
          </div>
        </GlassCard>
      </div>

      {/* ======== 4. Asymmetrical 3-Column Folder Grid ======== */}
      <div className="folder-cards-grid">
        {/* Column 1: Recent Transactions */}
        <TransactionList
          transactions={recentTxns}
          onViewAll={() => onNavigate && onNavigate('transactions')}
          onOpenAdd={onOpenAddExpense}
        />

        {/* Column 2: Monthly Budget Progress */}
        <GlassCard
          title="Budget Utilization"
          subtitle={`${monthLabel(todayYM())} limits vs actual spend`}
          icon={<Target size={20} />}
          iconTone="cyan"
          actionLabel="Manage"
          onAction={() => onNavigate && onNavigate('budgets')}
        >
          {budgets?.status?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {budgets.status.slice(0, 4).map((b) => (
                <div key={b.id || b.category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.category}</span>
                      <StatePill state={b.state} />
                    </div>
                    <span>
                      <strong className="font-numeric">{fmtMoney(b.spent)}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> / {fmtMoney(b.limit)}</span>
                    </span>
                  </div>
                  <Progress pct={b.pct} state={b.state} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Target size={36} />}
              title="No budgets configured"
              sub="Set spending targets to protect your savings rate."
              action={
                <button
                  className="btn-neon btn-neon-secondary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => onNavigate && onNavigate('budgets')}
                >
                  Create Budget
                </button>
              }
            />
          )}
        </GlassCard>

        {/* Column 3: Savings Goals & AI Financial Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Savings Goals Panel */}
          <GlassCard
            title="Savings Goals"
            subtitle={goals.length ? `${goals.length} active goal${goals.length > 1 ? 's' : ''}` : 'No targets yet'}
            icon={<PiggyBank size={20} />}
            iconTone="gold"
            actionLabel="Goals"
            onAction={() => onNavigate && onNavigate('goals')}
          >
            {goals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {goals.slice(0, 2).map((g) => {
                  const target = g.target || g.targetAmount || 1;
                  const current = g.current || g.currentAmount || 0;
                  const pct = Math.min(100, Math.round((current / target) * 100));
                  return (
                    <div key={g.id} className="legend-pill" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '12px 14px', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{g.name || g.title}</span>
                        <span className="font-numeric" style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--neon-gold)' }}>{pct}%</span>
                      </div>
                      <Progress pct={pct} state={pct >= 100 ? 'ok' : pct >= 60 ? 'ok' : 'warning'} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>{fmtMoney(current)} saved</span>
                        <span>Goal: {fmtMoney(target)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 12.5 }}>
                No active savings goals.
              </div>
            )}
          </GlassCard>

          {/* AI Financial Insights Card */}
          <GlassCard
            title="AI Financial Synthesis"
            subtitle="Context-aware ledger intelligence"
            icon={<Sparkles size={20} />}
            iconTone="magenta"
            actionLabel="Copilot"
            onAction={() => onNavigate && onNavigate('ai')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="legend-pill" style={{ padding: '12px 14px', gap: 8, flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={14} style={{ color: 'var(--neon-cyan)' }} />
                  <strong style={{ fontSize: 13, color: '#fff' }}>Savings Rate: {stats.savingsRate}%</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  {stats.savingsRate >= 20
                    ? 'Discipline is strong. Route capital surplus towards high-priority goals.'
                    : 'Below 20% target. Trim discretionary spending to build an emergency fund.'}
                </p>
              </div>

              {exceededBudgets.length > 0 ? (
                <div className="legend-pill" style={{ padding: '12px 14px', gap: 8, flexDirection: 'column', alignItems: 'stretch', borderColor: 'rgba(244, 63, 94, 0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={14} style={{ color: 'var(--neon-rose)' }} />
                    <strong style={{ fontSize: 13, color: 'var(--neon-rose)' }}>{exceededBudgets.length} Budget(s) Exceeded</strong>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    Limits surpassed in {exceededBudgets.map((b) => b.category).join(', ')}.
                  </p>
                </div>
              ) : (
                <div className="legend-pill" style={{ padding: '12px 14px', gap: 8, flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={14} style={{ color: 'var(--neon-emerald)' }} />
                    <strong style={{ fontSize: 13, color: 'var(--neon-emerald)' }}>All Budgets On Track</strong>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    Spending thresholds tracking safely for {monthLabel(todayYM())}.
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// High-Definition Canvas Visualizations: Dual Curved Area & Donut
// ==========================================================================
function InteractiveCashFlowChart({ labels, income, expenses }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = 260;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    ctx.clearRect(0, 0, width, height);
    if (!labels.length) return;

    const maxVal = Math.max(...income, ...expenses, 1000);
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 35;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    const stepX = chartW / (labels.length - 1 || 1);

    // Grid lines
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
    }

    // Draw Smooth Area & Line for Income (Neon Cyan)
    drawCurvedLine(ctx, income, maxVal, paddingLeft, paddingTop, chartH, stepX, '#06b6d4', 'rgba(6, 182, 212, 0.12)');

    // Draw Smooth Area & Line for Expenses (Neon Magenta)
    drawCurvedLine(ctx, expenses, maxVal, paddingLeft, paddingTop, chartH, stepX, '#d946ef', 'rgba(217, 70, 239, 0.12)');

    // X Axis Labels
    ctx.fillStyle = '#a393be';
    ctx.font = '500 11.5px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => {
      const x = paddingLeft + i * stepX;
      ctx.fillText(l, x, height - 10);
    });
  }, [labels, income, expenses]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 260 }} />;
}

function drawCurvedLine(ctx, points, maxVal, padX, padY, h, stepX, strokeColor, fillColor) {
  if (!points.length) return;

  const pts = points.map((v, i) => ({
    x: padX + i * stepX,
    y: padY + h - (v / maxVal) * h,
  }));

  // Area fill
  ctx.beginPath();
  ctx.moveTo(pts[0].x, padY + h);
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, (pts[i].y + pts[i + 1].y) / 2);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.lineTo(pts[pts.length - 1].x, padY + h);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Line stroke
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, (pts[i].y + pts[i + 1].y) / 2);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Glowing points
  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#07020f';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function DashboardDonut({ labels, data, total }) {
  const canvasRef = useRef(null);
  const colors = ['#d946ef', '#a855f7', '#06b6d4', '#fbbf24', '#ec4899', '#38bdf8', '#10b981', '#6366f1'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = 260;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    ctx.clearRect(0, 0, width, height);
    if (!data.length || !total) return;

    const cx = width / 2;
    const cy = height / 2;
    const R = 86;
    const r = 58;

    let angle = -Math.PI / 2;
    data.forEach((v, i) => {
      const slice = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, angle, angle + slice);
      ctx.arc(cx, cy, r, angle + slice, angle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      angle += slice;
    });

    // Center text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtMoney(total), cx, cy - 6);

    ctx.fillStyle = '#a393be';
    ctx.font = '500 11px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Total Outflow', cx, cy + 14);
  }, [labels, data, total]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 260 }} />;
}