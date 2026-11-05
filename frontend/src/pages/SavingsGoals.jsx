import { useEffect, useState, useCallback } from 'react';
import { PiggyBank, Plus, Trash2, Edit, CheckCircle2, TrendingUp, Calendar, AlertCircle, Coins, Target } from 'lucide-react';
import { api } from '../api.js';
import { fmtMoney, todayISO } from '../lib/format.js';
import { PageHead, EmptyState, SkeletonCards, Modal, Confirm, Progress } from '../components/ui.jsx';

export function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contributeGoal, setContributeGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState('');
  const [delGoal, setDelGoal] = useState(null);
  const [form, setForm] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: 'General',
    note: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await api.listGoals();
      setGoals(data || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (goal) => {
    if (goal) {
      setEditing(goal);
      setForm({
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate || '',
        category: goal.category || 'General',
        note: goal.note || '',
      });
    } else {
      setEditing(null);
      setForm({
        title: '',
        targetAmount: '',
        currentAmount: '0',
        targetDate: '',
        category: 'General',
        note: '',
      });
    }
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const payload = {
      ...form,
      targetAmount: Number(form.targetAmount),
      currentAmount: Number(form.currentAmount) || 0,
    };
    try {
      if (editing) {
        await api.updateGoal(editing.id, payload);
      } else {
        await api.createGoal(payload);
      }
      setFormOpen(false);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!contributeGoal || !contribAmount || Number(contribAmount) <= 0) return;
    try {
      await api.contributeGoal(contributeGoal.id, Number(contribAmount));
      setContributeGoal(null);
      setContribAmount('');
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteGoal(id);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const totalTarget = goals.reduce((s, g) => s + (Number(g.targetAmount) || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (Number(g.currentAmount) || 0), 0);
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const completedGoals = goals.filter((g) => (Number(g.currentAmount) || 0) >= (Number(g.targetAmount) || 1)).length;

  if (loading) return <SkeletonCards n={4} />;

  return (
    <div>
      <PageHead
        title="Savings Goals & Wealth Vault"
        sub="Set targets, track accumulation, and preserve personal capital"
        right={
          <button className="btn-neon btn-neon-gold" onClick={() => openForm(null)}>
            <Plus size={16} strokeWidth={2.5} /> <span>Add Savings Goal</span>
          </button>
        }
      />

      {err && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', padding: '12px 18px', marginBottom: 20 }}>
          {err}
        </div>
      )}

      {/* Aggregate Goal Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18, marginBottom: 24 }}>
        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Total Target</span>
            <div className="icon-tile-gradient icon-tile-purple">
              <Target size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: '#fff' }}>
            {fmtMoney(totalTarget)}
          </div>
          <div className="metric-card-footer">
            <span>All goal commitments</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Total Accumulated</span>
            <div className="icon-tile-gradient icon-tile-gold">
              <PiggyBank size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-gold)' }}>
            {fmtMoney(totalSaved)}
          </div>
          <div className="metric-card-footer">
            <span>Current saved capital</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Overall Progress</span>
            <div className="icon-tile-gradient icon-tile-cyan">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: 'var(--neon-cyan)' }}>
            {overallPct}%
          </div>
          <div className="metric-card-footer">
            <span>{fmtMoney(Math.max(0, totalTarget - totalSaved))} remaining</span>
          </div>
        </div>

        <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="metric-card-header">
            <span className="metric-card-label">Completed Goals</span>
            <div className="icon-tile-gradient icon-tile-cyan">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-card-value font-numeric" style={{ color: '#fff' }}>
            {completedGoals} / {goals.length}
          </div>
          <div className="metric-card-footer">
            <span>Goals fully funded</span>
          </div>
        </div>
      </div>

      {/* Goal Cards Grid */}
      {goals.length === 0 ? (
        <div className="glass-card-neon">
          <EmptyState
            icon={<PiggyBank size={48} />}
            title="No savings goals yet"
            sub="Create your first goal to track an emergency fund, travel plan, tech upgrade, or down payment."
            action={
              <button className="btn-neon btn-neon-gold" onClick={() => openForm(null)}>
                <Plus size={16} /> Create Your First Goal
              </button>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {goals.map((g) => {
            const isFinished = (Number(g.currentAmount) || 0) >= (Number(g.targetAmount) || 1);
            return (
              <div
                key={g.id}
                className="glass-card-neon"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  border: isFinished ? '1px solid rgba(251, 191, 36, 0.45)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className="category-badge">{g.category || 'General'}</span>
                      {isFinished && (
                        <span className="pill pill-income" style={{ color: 'var(--neon-gold)', borderColor: 'rgba(251, 191, 36, 0.4)' }}>
                          Completed!
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{g.title}</h3>
                    {g.note && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{g.note}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="icon-btn" onClick={() => openForm(g)} aria-label="Edit goal">
                      <Edit size={14} />
                    </button>
                    <button className="icon-btn" style={{ color: 'var(--neon-rose)' }} onClick={() => setDelGoal(g)} aria-label="Delete goal">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progress: <strong style={{ color: 'var(--neon-gold)' }}>{g.pct}%</strong></span>
                    <span className="font-numeric" style={{ fontWeight: 700 }}>
                      <span style={{ color: 'var(--neon-gold)' }}>{fmtMoney(g.currentAmount)}</span>
                      <span style={{ color: 'var(--text-muted)' }}> / {fmtMoney(g.targetAmount)}</span>
                    </span>
                  </div>
                  <Progress pct={g.pct} state={isFinished ? 'ok' : g.pct >= 70 ? 'ok' : 'warning'} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(168, 85, 247, 0.16)', fontSize: 12, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} style={{ color: 'var(--neon-cyan)' }} />
                    <span>{g.targetDate ? `Target: ${g.targetDate}` : 'Open timeline'}</span>
                  </div>
                  <button
                    className="btn-neon btn-neon-secondary"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => { setContributeGoal(g); setContribAmount(''); }}
                  >
                    <Coins size={13} style={{ color: 'var(--neon-gold)' }} />
                    <span>+ Add Funds</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      {formOpen && (
        <Modal title={editing ? 'Edit Savings Goal' : 'New Savings Goal'} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">Goal Title *</label>
              <input
                required
                placeholder="e.g. Emergency Fund, New Laptop, Japan Trip"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field-group">
                <label className="field-label">Target Amount (₹) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="50000"
                  value={form.targetAmount}
                  onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                />
              </div>
              <div className="field-group">
                <label className="field-label">Current Saved (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.currentAmount}
                  onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field-group">
                <label className="field-label">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="General">General Savings</option>
                  <option value="Emergency">Emergency Fund</option>
                  <option value="Gadgets">Gadgets & Tech</option>
                  <option value="Travel">Travel & Vacation</option>
                  <option value="Vehicle">Vehicle / Car</option>
                  <option value="Education">Education</option>
                  <option value="Investment">Investment</option>
                  <option value="Home">Home / Real Estate</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Target Date</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                />
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Optional Notes</label>
              <textarea
                rows={2}
                placeholder="Why are you saving for this?"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn-neon btn-neon-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="submit" className="btn-neon btn-neon-gold" disabled={!form.title || !form.targetAmount}>
                {editing ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Contribute Funds Modal */}
      {contributeGoal && (
        <Modal title={`Deposit into “${contributeGoal.title}”`} onClose={() => setContributeGoal(null)}>
          <form onSubmit={handleContribute} style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Current saved: <strong style={{ color: 'var(--neon-gold)' }}>{fmtMoney(contributeGoal.currentAmount)}</strong> of <strong>{fmtMoney(contributeGoal.targetAmount)}</strong> ({contributeGoal.pct}%)
            </div>
            <div className="field-group">
              <label className="field-label">Contribution Amount (₹) *</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 2500"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn-neon btn-neon-secondary" onClick={() => setContributeGoal(null)}>Cancel</button>
              <button type="submit" className="btn-neon btn-neon-gold" disabled={!contribAmount || Number(contribAmount) <= 0}>
                Confirm Deposit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {delGoal && (
        <Confirm
          title="Delete Savings Goal?"
          body={`Are you sure you want to delete “${delGoal.title}”? This action cannot be undone.`}
          onConfirm={() => { remove(delGoal.id); setDelGoal(null); }}
          onCancel={() => setDelGoal(null)}
        />
      )}
    </div>
  );
}
