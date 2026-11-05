import { useEffect, useState, useMemo, useRef } from 'react';
import { Download, Printer, Calendar, BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart, Activity, Sparkles } from 'lucide-react';
import { api, download } from '../api.js';
import { fmtMoney, monthLabel } from '../lib/format.js';
import { PageHead, EmptyState, SkeletonCards } from '../components/ui.jsx';

export function Analytics() {
  const [periods, setPeriods] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [p, s] = await Promise.all([api.periods(), api.stats()]);
        setPeriods(p);
        setStats(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.exportCsv();
      await download(res, 'spendwise-analytics-export.csv');
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <SkeletonCards n={4} />;

  if (!stats || stats.count === 0) {
    return (
      <div>
        <PageHead title="Financial Analytics" sub="Deep-dive into income vs expense distributions" />
        <div className="glass-card-neon">
          <EmptyState
            icon={<BarChart3 size={48} />}
            title="Insufficient telemetry to analyze"
            sub="Record at least a few expenses and income entries to generate analytics charts."
          />
        </div>
      </div>
    );
  }

  const daily = periods?.daily || [];
  const weekly = periods?.weekly || [];
  const monthly = periods?.monthly || [];
  const yearly = periods?.yearly || [];

  const catEntries = Object.entries(stats.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const colors = ['#d946ef', '#a855f7', '#06b6d4', '#fbbf24', '#ec4899', '#38bdf8', '#10b981'];

  const dailyAvg = daily.length ? daily.reduce((a, d) => a + d.expenses, 0) / daily.length : 0;
  const weeklyAvg = weekly.length ? weekly.reduce((a, w) => a + w.expenses, 0) / weekly.length : 0;
  const monthlyAvg = monthly.length ? monthly.reduce((a, m) => a + m.expenses, 0) / monthly.length : 0;

  return (
    <div>
      <PageHead
        title="Financial Analytics & Velocity"
        sub="Longitudinal cashflow trends, run rates, and merchant concentrations"
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-neon btn-neon-secondary" onClick={() => window.print()}>
              <Printer size={15} /> <span>Print Report</span>
            </button>
            <button className="btn-neon btn-neon-secondary" onClick={handleExportCsv} disabled={exporting}>
              <Download size={15} /> <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        }
      />

      {/* Average Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18, marginBottom: 24 }}>
        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Daily Burn Rate</span>
            <div className="icon-tile-gradient icon-tile-magenta">
              <Calendar size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-magenta)' }}>
            {fmtMoney(dailyAvg)}
          </div>
          <div className="metric-card-footer">
            <span>14-day trailing average</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Weekly Outflow</span>
            <div className="icon-tile-gradient icon-tile-purple">
              <Calendar size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: '#fff' }}>
            {fmtMoney(weeklyAvg)}
          </div>
          <div className="metric-card-footer">
            <span>8-week rolling mean</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Monthly Burn</span>
            <div className="icon-tile-gradient icon-tile-cyan">
              <Calendar size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-cyan)' }}>
            {fmtMoney(monthlyAvg)}
          </div>
          <div className="metric-card-footer">
            <span>12-month average expense</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Net Savings Rate</span>
            <div className="icon-tile-gradient icon-tile-gold">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-gold)' }}>
            {stats.savingsRate}%
          </div>
          <div className="metric-card-footer">
            <span>Cumulative efficiency</span>
          </div>
        </div>
      </div>

      {/* Daily Cash Flow & Weekly Cash Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 22, marginBottom: 24 }}>
        <div className="glass-card-neon">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="icon-tile-gradient icon-tile-cyan">
                <Activity size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Daily Velocity (Last 14 Days)</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Daily inflow vs outflow volume</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11.5 }}>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>■ Inflow</span>
              <span style={{ color: 'var(--neon-magenta)', fontWeight: 700 }}>■ Outflow</span>
            </div>
          </div>
          <div style={{ height: 260, position: 'relative' }}>
            <AnalyticsBarChart
              labels={daily.map((d) => d.date.slice(5))}
              seriesA={daily.map((d) => d.income)}
              seriesB={daily.map((d) => d.expenses)}
              labelA="Income"
              labelB="Expense"
              colorA="#06b6d4"
              colorB="#d946ef"
            />
          </div>
        </div>

        <div className="glass-card-neon">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="icon-tile-gradient icon-tile-purple">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Weekly Performance (Last 8 Weeks)</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Weekly income vs expense performance</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11.5 }}>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>■ Inflow</span>
              <span style={{ color: 'var(--neon-magenta)', fontWeight: 700 }}>■ Outflow</span>
            </div>
          </div>
          <div style={{ height: 260, position: 'relative' }}>
            <AnalyticsBarChart
              labels={weekly.map((w) => w.week.slice(-5))}
              seriesA={weekly.map((w) => w.income)}
              seriesB={weekly.map((w) => w.expenses)}
              labelA="Income"
              labelB="Expense"
              colorA="#06b6d4"
              colorB="#d946ef"
            />
          </div>
        </div>
      </div>

      {/* Monthly Trends & Category Proportion */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 22, marginBottom: 24 }}>
        <div className="glass-card-neon">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="icon-tile-gradient icon-tile-cyan">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>12-Month Longitudinal Trend</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Historical monthly capital evolution</p>
            </div>
          </div>
          <div style={{ height: 260, position: 'relative' }}>
            <AnalyticsBarChart
              labels={monthly.map((m) => monthLabel(m.month))}
              seriesA={monthly.map((m) => m.income)}
              seriesB={monthly.map((m) => m.expenses)}
              labelA="Income"
              labelB="Expense"
              colorA="#06b6d4"
              colorB="#d946ef"
            />
          </div>
        </div>

        {/* Category Breakdown Table */}
        <div className="glass-card-neon" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="icon-tile-gradient icon-tile-magenta">
              <PieChart size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Category Outflow Breakdown</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Detailed breakdown of total expenses</p>
            </div>
          </div>

          <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {catEntries.map(([category, amt], i) => {
              const pct = stats.expenses > 0 ? ((amt / stats.expenses) * 100).toFixed(1) : 0;
              return (
                <div key={category} className="legend-pill" style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: colors[i % colors.length],
                        boxShadow: `0 0 8px ${colors[i % colors.length]}`,
                      }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{category}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>
                    <span className="font-numeric" style={{ fontWeight: 700, color: '#fff', fontSize: 13.5 }}>
                      {fmtMoney(amt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Merchants / Frequent Payees */}
      <div className="glass-card-neon" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className="icon-tile-gradient icon-tile-purple">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Top Counterparties & Payees</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Most frequent transaction counterparties</p>
          </div>
        </div>

        {stats.topMerchants?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {stats.topMerchants.map((m, i) => (
              <div
                key={i}
                className="legend-pill"
                style={{
                  padding: '12px 16px',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13.5, color: '#fff' }}>{m.title}</span>
                <span className="pill pill-income" style={{ fontSize: 11 }}>{m.count} txns</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No merchant frequency data yet.</p>
        )}
      </div>
    </div>
  );
}

// Canvas Dual Bar Chart with glowing round bars
function AnalyticsBarChart({ labels, seriesA, seriesB, colorA, colorB }) {
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

    const maxVal = Math.max(...seriesA, ...seriesB, 1000);
    const padL = 40;
    const padR = 16;
    const padT = 20;
    const padB = 30;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const groupW = chartW / labels.length;
    const barW = Math.max(3, Math.min(13, (groupW - 8) / 2));

    // Grid lines
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padT + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(width - padR, y);
      ctx.stroke();
    }

    // Bars
    labels.forEach((label, i) => {
      const groupX = padL + i * groupW + groupW / 2;

      // Series A (Income)
      const valA = seriesA[i] || 0;
      const hA = (valA / maxVal) * chartH;
      ctx.fillStyle = colorA;
      ctx.shadowColor = colorA;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(groupX - barW - 2, padT + chartH - hA, barW, hA, [4, 4, 0, 0]);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Series B (Expense)
      const valB = seriesB[i] || 0;
      const hB = (valB / maxVal) * chartH;
      ctx.fillStyle = colorB;
      ctx.shadowColor = colorB;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(groupX + 2, padT + chartH - hB, barW, hB, [4, 4, 0, 0]);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#a393be';
      ctx.font = '500 10.5px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, groupX, height - 10);
    });
  }, [labels, seriesA, seriesB, colorA, colorB]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 260 }} />;
}
