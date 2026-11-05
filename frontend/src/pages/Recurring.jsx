import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, SkipForward, Calendar, Repeat, ArrowRight, CheckCircle2, Clock, Edit } from 'lucide-react';
import { api } from '../api.js';
import { fmtMoney, todayISO } from '../lib/format.js';
import { PageHead, TypePill, EmptyState, Modal, Confirm, SkeletonCards } from '../components/ui.jsx';

export function Recurring() {
  const [items, setItems] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Bills',
    frequency: 'monthly',
    day: 1,
    paymentMethod: 'UPI',
    note: '',
    nextDue: todayISO(),
  });
  const [meta, setMeta] = useState({ categories: [], paymentMethods: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [delId, setDelId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [all, up] = await Promise.all([api.listRecurring(), api.upcomingRecurring(30)]);
      setItems(all || []);
      setUpcoming(up || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => {});
  }, []);

  const openForm = (item) => {
    if (item) {
      setEditing(item);
      setForm({
        title: item.title,
        amount: item.amount,
        type: item.type,
        category: item.category,
        frequency: item.frequency,
        day: item.day,
        paymentMethod: item.paymentMethod || 'UPI',
        note: item.note || '',
        nextDue: item.nextDue,
      });
    } else {
      setEditing(null);
      setForm({
        title: '',
        amount: '',
        type: 'expense',
        category: meta.categories?.[0] || 'Bills',
        frequency: 'monthly',
        day: 1,
        paymentMethod: 'UPI',
        note: '',
        nextDue: todayISO(),
      });
    }
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const payload = {
      ...form,
      amount: Number(form.amount),
      day: Number(form.day),
    };
    try {
      if (editing) {
        await api.updateRecurring(editing.id, payload);
        setSuccess('Recurring entry updated');
      } else {
        await api.createRecurring(payload);
        setSuccess('Recurring entry scheduled');
      }
      setFormOpen(false);
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteRecurring(id);
      setSuccess('Recurring payment deleted');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const skip = async (id) => {
    try {
      await api.skipRecurring(id);
      setSuccess('Skipped to next cycle');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) return <SkeletonCards n={4} />;

  return (
    <div>
      <PageHead
        title="Recurring Obligations & Bills"
        sub="Subscriptions, utilities, rent, salary, and automated recurring rules"
        right={
          <button className="btn-neon btn-neon-primary" onClick={() => openForm(null)}>
            <Plus size={16} strokeWidth={2.5} /> <span>Schedule Recurring</span>
          </button>
        }
      />

      {success && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--neon-emerald)', padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> <span>{success}</span>
        </div>
      )}

      {err && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{err}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 22 }}>
        {/* Upcoming (Next 30 Days) */}
        <div className="glass-card-neon" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="icon-tile-gradient icon-tile-cyan">
              <Clock size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Upcoming Inflows & Bills (Next 30 Days)</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Scheduled commitments approaching due date</p>
            </div>
          </div>

          {!upcoming.length ? (
            <EmptyState
              icon={<Calendar size={40} />}
              title="No upcoming obligations scheduled"
              sub="You have no bills or subscriptions due in the next 30 days."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.map((r) => (
                <div
                  key={r.id}
                  className="legend-pill"
                  style={{
                    padding: '12px 16px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.frequency} • Due {r.nextDue} • {r.paymentMethod || 'UPI'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      className="font-numeric"
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                        color: r.type === 'income' ? 'var(--neon-cyan)' : 'var(--neon-magenta)',
                      }}
                    >
                      {r.type === 'income' ? '+' : '-'}{fmtMoney(r.amount)}
                    </span>
                    <button
                      className="btn-neon btn-neon-secondary"
                      style={{ padding: '5px 10px', fontSize: 11.5 }}
                      onClick={() => skip(r.id)}
                      title="Skip this cycle"
                    >
                      <SkipForward size={12} /> Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Scheduled Items */}
        <div className="glass-card-neon" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="icon-tile-gradient icon-tile-purple">
              <Repeat size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>All Active Recurring Rules</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Configured subscriptions and automated rules</p>
            </div>
          </div>

          {!items.length ? (
            <EmptyState
              icon={<Repeat size={40} />}
              title="No recurring rules active"
              sub="Add fixed expenses like Netflix, Spotify, Rent, or monthly Salary."
              action={
                <button className="btn-neon btn-neon-primary" onClick={() => openForm(null)}>
                  <Plus size={16} /> Add First Rule
                </button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((r) => (
                <div
                  key={r.id}
                  className="legend-pill"
                  style={{
                    padding: '12px 16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{r.title}</span>
                      <TypePill type={r.type} />
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.frequency} (Day {r.day}) • {r.category}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="font-numeric" style={{ fontWeight: 800, fontSize: 14.5, color: '#fff' }}>
                      {fmtMoney(r.amount)}
                    </span>
                    <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => openForm(r)} aria-label="Edit">
                      <Edit size={13} />
                    </button>
                    <button className="icon-btn" style={{ width: 32, height: 32, color: 'var(--neon-rose)' }} onClick={() => setDelId(r.id)} aria-label="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Form Modal */}
      {formOpen && (
        <Modal title={editing ? 'Edit Recurring Obligation' : 'Schedule Recurring Obligation'} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">Rule Title *</label>
              <input
                required
                placeholder="e.g. Netflix Subscription, Apartment Rent, Salary"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Direction</label>
              <div className="type-selector">
                <button
                  type="button"
                  className={form.type === 'expense' ? 'active-expense' : ''}
                  onClick={() => setForm({ ...form, type: 'expense' })}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={form.type === 'income' ? 'active-income' : ''}
                  onClick={() => setForm({ ...form, type: 'income' })}
                >
                  Income
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field-group">
                <label className="field-label">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {meta.categories?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field-group">
                <label className="field-label">Recurrence Frequency</label>
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Next Due Date *</label>
                <input
                  required
                  type="date"
                  value={form.nextDue}
                  onChange={(e) => setForm({ ...form, nextDue: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn-neon btn-neon-secondary" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-neon btn-neon-primary" disabled={!form.title || !form.amount}>
                {editing ? 'Update Rule' : 'Save Recurring Rule'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {delId && (
        <Confirm
          title="Delete Recurring Rule?"
          body="Are you sure you want to delete this scheduled recurring rule? No future entries will be generated."
          onConfirm={() => { remove(delId); setDelId(null); }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  );
}
