import { useEffect, useState, useMemo, useRef } from 'react';
import { FolderTree, TrendingDown, DollarSign, Target, PieChart, Plus, Search, Layers, ShoppingBag, Utensils, Car, Zap, HeartPulse, Film, Plane, Briefcase, Gift, ShieldAlert } from 'lucide-react';
import { api } from '../api.js';
import { fmtMoney, todayYM, monthLabel } from '../lib/format.js';
import { PageHead, EmptyState, SkeletonCards, Progress } from '../components/ui.jsx';

const CAT_ICONS = {
  Food: Utensils,
  Transport: Car,
  Shopping: ShoppingBag,
  Bills: Zap,
  Health: HeartPulse,
  Entertainment: Film,
  Travel: Plane,
  Salary: DollarSign,
  Freelance: Briefcase,
  Investment: TrendingDown,
  Gift: Gift,
  Other: Layers,
};

const CAT_COLORS = [
  '#d946ef', '#a855f7', '#06b6d4', '#fbbf24', '#ec4899',
  '#38bdf8', '#10b981', '#f43f5e', '#6366f1', '#14b8a6', '#eab308', '#64748b'
];

export function Categories({ onNavigate, setSelectedCategory }) {
  const [stats, setStats] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [meta, setMeta] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [s, b, m] = await Promise.all([
          api.stats(),
          api.budgetStatus(todayYM()),
          api.meta(),
        ]);
        setStats(s);
        setBudgets(b);
        setMeta(m);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const catMap = stats?.byCategory || {};
  const allCatKeys = useMemo(() => {
    const fromMeta = meta.categories || [];
    const fromStats = Object.keys(catMap);
    return Array.from(new Set([...fromMeta, ...fromStats]));
  }, [meta.categories, catMap]);

  const totalExpense = stats?.expenses || 0;

  const filtered = allCatKeys.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const chartCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  if (loading) return <SkeletonCards n={4} />;

  return (
    <div>
      <PageHead
        title="Category Intelligence & Outflow"
        sub="Category-level expense distributions, trends, and budget tracking"
        right={
          <div className="search-neon" style={{ maxWidth: 280 }}>
            <Search size={15} />
            <input
              type="search"
              placeholder="Filter categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18, marginBottom: 24 }}>
        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Tracked Categories</span>
            <div className="icon-tile-gradient icon-tile-purple">
              <FolderTree size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: '#fff' }}>
            {allCatKeys.length}
          </div>
          <div className="metric-card-footer">
            <span>Standard & custom</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Top Category</span>
            <div className="icon-tile-gradient icon-tile-magenta">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-magenta)' }}>
            {chartCategories[0] ? chartCategories[0][0] : 'None'}
          </div>
          <div className="metric-card-footer">
            <span>{chartCategories[0] ? fmtMoney(chartCategories[0][1]) : 'No expenses'}</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Total Categorized</span>
            <div className="icon-tile-gradient icon-tile-cyan">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-cyan)' }}>
            {fmtMoney(totalExpense)}
          </div>
          <div className="metric-card-footer">
            <span>All expense records</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Active Category Budgets</span>
            <div className="icon-tile-gradient icon-tile-gold">
              <Target size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-gold)' }}>
            {budgets?.status?.length || 0}
          </div>
          <div className="metric-card-footer">
            <span>For {monthLabel(todayYM())}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 22, marginBottom: 24 }}>
        {/* Category Donut Visualization */}
        <div className="glass-card-neon">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="icon-tile-gradient icon-tile-magenta">
              <PieChart size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Expense Breakdown by Category</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Proportional volume of your total spending</p>
            </div>
          </div>
          <div style={{ height: 280, position: 'relative' }}>
            <CategoryDonut
              labels={chartCategories.map((c) => c[0])}
              values={chartCategories.map((c) => c[1])}
              colors={CAT_COLORS}
              total={totalExpense}
            />
          </div>
        </div>

        {/* Top Categories Distribution List */}
        <div className="glass-card-neon" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="icon-tile-gradient icon-tile-cyan">
              <TrendingDown size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Spending Share Ranking</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Ranked by total historical outflow</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
            {chartCategories.length === 0 ? (
              <EmptyState title="No expense data" sub="Add transactions to view category ranking" />
            ) : (
              chartCategories.map(([category, spent], idx) => {
                const pct = totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0;
                const Icon = CAT_ICONS[category] || Layers;
                const col = CAT_COLORS[idx % CAT_COLORS.length];
                return (
                  <div key={category} className="legend-pill" style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: col }}>
                        <Icon size={16} />
                      </div>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>
                      <span className="font-numeric" style={{ fontWeight: 700, color: '#fff', fontSize: 13.5 }}>
                        {fmtMoney(spent)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Category Cards Grid */}
      <h3 style={{ fontSize: 18, fontWeight: 800, margin: '24px 0 16px', color: '#fff', letterSpacing: '-0.02em' }}>
        All Categories ({filtered.length})
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map((category, idx) => {
          const spent = catMap[category] || 0;
          const pct = totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0;
          const budget = budgets?.status?.find((b) => b.category === category);
          const Icon = CAT_ICONS[category] || Layers;
          const color = CAT_COLORS[idx % CAT_COLORS.length];

          return (
            <div key={category} className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}
            onClick={() => {
              setSelectedCategory(category);
              onNavigate('categoryDetail');
            }}
          >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{category}</h4>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{pct}% of total</span>
                  </div>
                </div>
                <span className="font-numeric" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{fmtMoney(spent)}</span>
              </div>

              {budget ? (
                <div style={{ paddingTop: 8, borderTop: '1px solid rgba(168, 85, 247, 0.16)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Budget ({budget.pct}% consumed)</span>
                    <span className="font-numeric" style={{ fontWeight: 600, color: '#fff' }}>{fmtMoney(budget.spent)} / {fmtMoney(budget.limit)}</span>
                  </div>
                  <Progress pct={budget.pct} state={budget.state} />
                </div>
              ) : (
                <div style={{ paddingTop: 8, borderTop: '1px solid rgba(168, 85, 247, 0.16)', fontSize: 11.5, color: 'var(--text-dim)' }}>
                  No budget cap set for this category
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryDonut({ labels, values, colors, total }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = 280;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    ctx.clearRect(0, 0, width, height);
    if (!values.length || !total) return;

    const cx = width / 2;
    const cy = height / 2;
    const outerR = 95;
    const innerR = 64;

    let startAngle = -Math.PI / 2;

    values.forEach((v, i) => {
      const slice = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
      ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      startAngle += slice;
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
  }, [labels, values, colors, total]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 280 }} />;
}
