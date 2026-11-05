import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  DollarSign,
  CreditCard,
  Calendar,
  Tag,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  X,
  Sparkles
} from 'lucide-react';
import { api, download } from '../api.js';
import { fmtMoney, todayISO } from '../lib/format.js';
import { PageHead, TypePill, EmptyState, Modal, Confirm } from '../components/ui.jsx';
import { getCategoryIcon } from '../components/NeonComponents.jsx';

export function Transactions({ onNavigate }) {
  const [txns, setTxns] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [meta, setMeta] = useState({ categories: [], paymentMethods: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    type: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
    sort: 'date',
    order: 'desc',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    type: 'expense',
    title: '',
    amount: '',
    category: '',
    date: todayISO(),
    paymentMethod: 'UPI',
    tags: [],
    note: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [delConfirm, setDelConfirm] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const params = { ...filters, page, limit: 10 };
      const res = await api.listExpenses(params);
      if (Array.isArray(res)) {
        setTxns(res);
        setTotalPages(1);
        setTotalCount(res.length);
      } else {
        setTxns(res.data || []);
        setTotalPages(res.pages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => {});
  }, []);

  const openForm = (txn) => {
    setErr('');
    if (txn) {
      setEditing(txn);
      setForm({
        type: txn.type || 'expense',
        title: txn.title || '',
        amount: txn.amount || '',
        category: txn.category || '',
        date: txn.date || todayISO(),
        paymentMethod: txn.paymentMethod || 'UPI',
        tags: txn.tags || [],
        note: txn.note || '',
      });
      setTagInput((txn.tags || []).join(', '));
    } else {
      setEditing(null);
      setForm({
        type: 'expense',
        title: '',
        amount: '',
        category: meta.categories?.[0] || 'Food',
        date: todayISO(),
        paymentMethod: 'UPI',
        tags: [],
        note: '',
      });
      setTagInput('');
    }
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const tagsArray = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      ...form,
      amount: Number(form.amount),
      tags: tagsArray,
    };

    if (!payload.title.trim()) {
      setErr('Title is required');
      return;
    }
    if (!payload.amount || payload.amount <= 0) {
      setErr('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await api.updateExpense(editing.id, payload);
        setSuccessMsg('Transaction updated successfully');
      } else {
        await api.createExpense(payload);
        setSuccessMsg('Transaction recorded successfully');
      }
      setFormOpen(false);
      setTimeout(() => setSuccessMsg(''), 3500);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteExpense(id);
      setSuccessMsg('Transaction removed');
      setTimeout(() => setSuccessMsg(''), 3000);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.exportCsv(filters);
      await download(res, 'spendwise-transactions.csv');
      setSuccessMsg('Exported transactions CSV');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setExporting(false);
    }
  };

  const seed = async () => {
    setLoading(true);
    try {
      await api.seed();
      setSuccessMsg('Demo data loaded successfully');
      setTimeout(() => setSuccessMsg(''), 3500);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered totals summary strip
  const summaryStrip = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of txns) {
      if (t.type === 'income') income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    }
    return { income, expense, net: income - expense };
  }, [txns]);

  return (
    <div>
      <PageHead
        title="Transaction Ledger"
        sub={`Verified financial entries • Showing ${txns.length} of ${totalCount} records`}
        right={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-neon btn-neon-secondary" onClick={seed} disabled={loading} title="Populate realistic demo records">
              <RotateCcw size={15} /> <span>Load Demo</span>
            </button>
            <button className="btn-neon btn-neon-secondary" onClick={exportCsv} disabled={exporting || totalCount === 0}>
              <Download size={15} /> <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button className="btn-neon btn-neon-primary" onClick={() => openForm(null)}>
              <Plus size={16} strokeWidth={2.5} /> <span>Add Transaction</span>
            </button>
          </div>
        }
      />

      {successMsg && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--neon-emerald)', padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> <span>{successMsg}</span>
        </div>
      )}

      {err && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> <span>{err}</span>
        </div>
      )}

      {/* Filter Control Card */}
      <div className="glass-card-neon" style={{ marginBottom: 22, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div className="field-group">
            <label className="field-label">Search Keyword</label>
            <input
              placeholder="Title, notes, tags..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
            >
              <option value="">All Categories</option>
              {meta.categories?.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Flow Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            >
              <option value="">All Types</option>
              <option value="expense">Expense Only (Outflow)</option>
              <option value="income">Income Only (Inflow)</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Payment Channel</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value, page: 1 })}
            >
              <option value="">All Methods</option>
              {meta.paymentMethods?.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
            />
          </div>

          <div className="field-group">
            <label className="field-label">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Order</label>
            <select
              value={filters.order}
              onChange={(e) => setFilters({ ...filters, order: e.target.value })}
            >
              <option value="desc">Descending (Highest / Newest)</option>
              <option value="asc">Ascending (Lowest / Oldest)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Telemetry Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(168, 85, 247, 0.16)', fontSize: 13, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>Page Telemetry:</span>
            <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>
              Inflow: +{fmtMoney(summaryStrip.income)}
            </span>
            <span style={{ color: 'var(--neon-magenta)', fontWeight: 700 }}>
              Outflow: -{fmtMoney(summaryStrip.expense)}
            </span>
            <span style={{ color: summaryStrip.net >= 0 ? 'var(--neon-cyan)' : 'var(--neon-magenta)', fontWeight: 800 }}>
              Net: {fmtMoney(summaryStrip.net)}
            </span>
          </div>
          <button
            className="btn-neon btn-neon-secondary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setFilters({ search: '', category: '', type: '', paymentMethod: '', startDate: '', endDate: '', sort: 'date', order: 'desc' })}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Transaction Table / Cards */}
      <div className="glass-card-neon" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 28 }}>
            <div className="skeleton-shimmer" style={{ height: 340, width: '100%' }} />
          </div>
        ) : txns.length === 0 ? (
          <EmptyState
            icon={<DollarSign size={48} />}
            title="No transactions match your query"
            sub="Try clearing filters, searching for a different keyword, or record your first entry."
            action={
              <button className="btn-neon btn-neon-primary" onClick={() => openForm(null)}>
                <Plus size={16} /> Add Transaction
              </button>
            }
          />
        ) : (
          <div className="transaction-table-container">
            <table className="transaction-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Transaction / Counterparty</th>
                  <th>Category</th>
                  <th>Payment Channel</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Tags & Note</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => {
                  const isIncome = t.type === 'income';
                  const IconComp = getCategoryIcon(t.category);
                  return (
                    <tr key={t.id}>
                      {/* Icon Tile */}
                      <td>
                        <div
                          className={`icon-tile-gradient ${isIncome ? 'icon-tile-cyan' : 'icon-tile-magenta'}`}
                          style={{ width: 38, height: 38, borderRadius: 10 }}
                        >
                          <IconComp size={17} />
                        </div>
                      </td>

                      {/* Title & Type */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 11, color: isIncome ? 'var(--neon-cyan)' : 'var(--neon-magenta)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          {isIncome ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          <span>{isIncome ? 'Income (Money In)' : 'Expense (Money Out)'}</span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td>
                        <span className="category-badge">
                          {t.category}
                        </span>
                      </td>

                      {/* Payment Channel */}
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                        {t.paymentMethod || '—'}
                      </td>

                      {/* Date */}
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {t.date}
                      </td>

                      {/* Amount */}
                      <td>
                        <div
                          className="font-numeric"
                          style={{
                            fontWeight: 800,
                            fontSize: 15,
                            color: isIncome ? 'var(--neon-cyan)' : 'var(--neon-magenta)',
                            textShadow: isIncome ? '0 0 10px rgba(6, 182, 212, 0.35)' : '0 0 10px rgba(217, 70, 239, 0.35)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isIncome ? '+' : '-'}{fmtMoney(t.amount)}
                        </div>
                      </td>

                      {/* Tags & Note */}
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          {(t.tags || []).map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 10.5,
                                padding: '2px 7px',
                                borderRadius: 6,
                                background: 'rgba(168, 85, 247, 0.14)',
                                border: '1px solid rgba(168, 85, 247, 0.25)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                          {t.note && (
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                              {t.note}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="icon-btn"
                            style={{ width: 32, height: 32 }}
                            onClick={() => openForm(t)}
                            aria-label="Edit transaction"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            style={{ width: 32, height: 32, color: 'var(--neon-rose)' }}
                            onClick={() => setDelConfirm(t)}
                            aria-label="Delete transaction"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderTop: '1px solid rgba(168, 85, 247, 0.16)', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>
              Page <strong style={{ color: '#fff' }}>{page}</strong> of <strong style={{ color: '#fff' }}>{totalPages}</strong> ({totalCount} total entries)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-neon btn-neon-secondary"
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <button
                className="btn-neon btn-neon-secondary"
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Elegant Glass Transaction Modal */}
      {formOpen && (
        <Modal
          title={editing ? 'Edit Ledger Entry' : 'Record New Transaction'}
          onClose={() => setFormOpen(false)}
          wide
        >
          <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
            {err && (
              <div style={{ border: '1px solid rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
                {err}
              </div>
            )}

            {/* Income / Expense Segment Switcher */}
            <div className="field-group">
              <label className="field-label">Capital Flow Direction</label>
              <div className="type-selector">
                <button
                  type="button"
                  className={form.type === 'expense' ? 'active-expense' : ''}
                  onClick={() => setForm({ ...form, type: 'expense' })}
                >
                  ↑ Expense (Money Out)
                </button>
                <button
                  type="button"
                  className={form.type === 'income' ? 'active-income' : ''}
                  onClick={() => setForm({ ...form, type: 'income' })}
                >
                  ↓ Income (Money In)
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
              <div className="field-group">
                <label className="field-label">Description / Counterparty *</label>
                <input
                  required
                  placeholder="e.g. Swiggy, Apple Store, Client Invoice"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                <label className="field-label">Transaction Date *</label>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field-group">
                <label className="field-label">Payment Channel</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  {meta.paymentMethods?.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Tags (comma-separated)</label>
                <input
                  placeholder="coffee, meeting, personal"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Additional memo, invoice number, or merchant details..."
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn-neon btn-neon-secondary" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-neon btn-neon-primary"
                disabled={submitting || !form.title.trim() || !form.amount || Number(form.amount) <= 0}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editing ? 'Update Ledger Record' : 'Record Transaction'}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {delConfirm && (
        <Confirm
          title="Delete Transaction?"
          body={`Are you sure you want to remove “${delConfirm.title}” (${fmtMoney(delConfirm.amount)}) from your records? This will permanently update all dashboard telemetry and charts.`}
          onConfirm={() => { remove(delConfirm.id); setDelConfirm(null); }}
          onCancel={() => setDelConfirm(null)}
        />
      )}
    </div>
  );
}
