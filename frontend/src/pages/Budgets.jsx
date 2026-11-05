import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Target,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Calendar,
  Wallet,
  Activity
} from 'lucide-react';
import { api } from '../api.js';
import { fmtMoney, todayYM, monthLabel } from '../lib/format.js';
import { PageHead, Progress, EmptyState, StatePill, Modal, Confirm, SkeletonCards } from '../components/ui.jsx';

export function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [status, setStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [month, setMonth] = useState(todayYM());
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ category: '', limit: '' });
  const [meta, setMeta] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [delId, setDelId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [b, s, sug] = await Promise.all([
        api.listBudgets(month),
        api.budgetStatus(month),
        api.budgetSuggestions(month),
      ]);
      setBudgets(b || []);
      setStatus(s);
      setSuggestions(sug?.suggestions || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.meta().then(({ categories }) => setMeta({ categories: categories || [] })).catch(() => {});
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.category) {
      setErr('Please select a category');
      return;
    }
    if (!form.limit || Number(form.limit) <= 0) {
      setErr('Budget limit must be greater than 0');
      return;
    }
    try {
      await api.createBudget({ category: form.category, month, limit: Number(form.limit) });
      setForm({ category: '', limit: '' });
      setFormOpen(false);
      setSuccess(`Budget for ${form.category} configured`);
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const adoptSuggestion = async (s) => {
    try {
      await api.createBudget({ category: s.category, month, limit: s.suggested });
      setSuccess(`Adopted suggested budget for ${s.category}`);
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteBudget(id);
      setSuccess('Budget removed');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const totalLimit = status?.totalLimit || 0;
  const totalSpent = status?.totalSpent || 0;
  const utilization = status?.utilization || 0;
  const totalRemaining = Math.max(0, totalLimit - totalSpent);

  if (loading) return <SkeletonCards n={4} />;

  return (
    <div>
      <PageHead
        title="Budget Telemetry & Caps"
        sub={`Active spending caps and threshold alerts for ${monthLabel(month)}`}
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="field-group" style={{ margin: 0, minWidth: 160 }}>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ height: 40 }}
              />
            </div>
            <button className="btn-neon btn-neon-primary" onClick={() => setFormOpen(true)}>
              <Plus size={16} strokeWidth={2.5} /> <span>Set Category Budget</span>
            </button>
          </div>
        }
      />

      {success && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--neon-emerald)', padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> <span>{success}</span>
        </div>
      )}

      {err && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> <span>{err}</span>
        </div>
      )}

      {/* Aggregate Budget Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18, marginBottom: 24 }}>
        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Total Monthly Cap</span>
            <div className="icon-tile-gradient icon-tile-purple">
              <Target size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: '#fff' }}>
            {fmtMoney(totalLimit)}
          </div>
          <div className="metric-card-footer">
            <span>Cumulative threshold</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Consumed So Far</span>
            <div className={`icon-tile-gradient ${utilization >= 100 ? 'icon-tile-magenta' : 'icon-tile-cyan'}`}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div
            className="metric-card-value font-numeric"
            style={{ color: utilization >= 100 ? 'var(--neon-rose)' : 'var(--neon-cyan)' }}
          >
            {fmtMoney(totalSpent)}
          </div>
          <div className="metric-card-footer">
            <span>Actual spend vs limits</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Remaining Buffer</span>
            <div className="icon-tile-gradient icon-tile-cyan">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: totalSpent > totalLimit ? 'var(--neon-rose)' : 'var(--neon-cyan)' }}>
            {fmtMoney(totalRemaining)}
          </div>
          <div className="metric-card-footer">
            <span>{totalSpent > totalLimit ? `Over by ${fmtMoney(totalSpent - totalLimit)}` : 'Safe spending margin'}</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Utilization Rate</span>
            <div className="icon-tile-gradient icon-tile-gold">
              <Activity size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-gold)' }}>
            {utilization}%
          </div>
          <div className="metric-card-footer">
            <span>{utilization >= 100 ? 'Breached' : utilization >= 80 ? 'Near limit' : 'Safe trajectory'}</span>
          </div>
        </div>
      </div>

      {/* AI Budget Suggestions */}
      <div className="glass-card-neon" style={{ marginBottom: 24, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className="icon-tile-gradient icon-tile-gold" style={{ width: 40, height: 40, borderRadius: 10 }}>
            <Lightbulb size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>AI Suggested Budget Allocations</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Synthesized from 3-month trailing expense velocity + 10% safety cushion
            </p>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Record more historical transactions across multiple months to unlock automated AI budget suggestions.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {suggestions.map((s) => {
              const alreadyHas = status?.status?.some((b) => b.category === s.category);
              return (
                <div
                  key={s.category}
                  className="legend-pill"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: '14px 16px',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{s.category}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Avg: {fmtMoney(s.avgMonthly)}/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="pill pill-income" style={{ fontSize: 11.5 }}>
                      Target: {fmtMoney(s.suggested)}
                    </span>
                    {!alreadyHas ? (
                      <button
                        className="btn-neon btn-neon-secondary"
                        style={{ padding: '5px 10px', fontSize: 11.5 }}
                        onClick={() => adoptSuggestion(s)}
                      >
                        Apply <ArrowRight size={12} />
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Configured</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Monthly Budgets List */}
      <div className="glass-card-neon" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div className="icon-tile-gradient icon-tile-cyan" style={{ width: 40, height: 40, borderRadius: 10 }}>
            <Target size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              Active Monthly Limits — {monthLabel(month)}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Tracking real-time category spending velocity
            </p>
          </div>
        </div>

        {!status?.status?.length ? (
          <EmptyState
            icon={<Target size={48} />}
            title="No budgets configured for this month"
            sub="Set monthly category limits to get real-time warnings when you approach your spending thresholds."
            action={
              <button className="btn-neon btn-neon-primary" onClick={() => setFormOpen(true)}>
                <Plus size={16} /> Set First Budget
              </button>
            }
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {status.status.map((b) => {
              const isExceeded = b.state === 'exceeded';
              const isWarning = b.state === 'warning';
              return (
                <div
                  key={b.id || b.category}
                  className="legend-pill"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: 18,
                    gap: 12,
                    borderColor: isExceeded ? 'rgba(244, 63, 94, 0.45)' : isWarning ? 'rgba(251, 191, 36, 0.45)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{b.category}</span>
                        <StatePill state={b.state} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {isExceeded
                          ? `Exceeded limit by ${fmtMoney(b.spent - b.limit)}`
                          : `${fmtMoney(b.remaining)} remaining buffer`}
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ width: 32, height: 32, color: 'var(--neon-rose)' }}
                      onClick={() => setDelId(b.id)}
                      aria-label="Delete budget"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{b.pct}% consumed</span>
                      <span className="font-numeric" style={{ fontWeight: 700 }}>
                        <span style={{ color: isExceeded ? 'var(--neon-rose)' : '#fff' }}>{fmtMoney(b.spent)}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}> / {fmtMoney(b.limit)}</span>
                      </span>
                    </div>
                    <Progress pct={b.pct} state={b.state} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Set Category Budget Modal */}
      {formOpen && (
        <Modal title={`Set Monthly Budget (${monthLabel(month)})`} onClose={() => setFormOpen(false)}>
          <form onSubmit={create} style={{ display: 'grid', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select Category</option>
                {meta.categories?.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Monthly Spending Limit (₹) *</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 15000"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn-neon btn-neon-secondary" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-neon btn-neon-primary" disabled={!form.category || !form.limit}>
                Save Budget
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {delId && (
        <Confirm
          title="Delete Budget Limit?"
          body="Are you sure you want to remove this category budget for the selected month? Real-time limit tracking for this category will be disabled."
          onConfirm={() => { remove(delId); setDelId(null); }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  );
}
