import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Inbox, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// ---------- Toast Notifications ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, text, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-shelf" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast-item">
            {t.kind === 'err' ? (
              <AlertTriangle size={18} style={{ color: 'var(--neon-rose)', flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: 'var(--neon-emerald)', flexShrink: 0 }} />
            )}
            <span style={{ fontWeight: 600 }}>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Modal + Confirm Dialog ----------
export function Modal({ title, children, onClose, wide }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-card ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, body, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 22, fontSize: 14, lineHeight: 1.5 }}>{body}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn-neon btn-neon-secondary" onClick={onCancel}>Cancel</button>
        <button
          className="btn-neon"
          style={{ background: 'var(--neon-rose)', color: '#fff', boxShadow: '0 4px 18px rgba(244, 63, 94, 0.4)' }}
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ---------- Page Header ----------
export function PageHead({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26, flexWrap: 'wrap', gap: 14 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 4 }}>
          {title}
        </h2>
        {sub && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      {right && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{right}</div>}
    </div>
  );
}

// ---------- Stat Cards ----------
export function StatCard({ icon, label, value, sub, tone }) {
  return (
    <div className="glass-card-neon" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div className="metric-card-header">
        <span className="metric-card-label">{label}</span>
        {icon && (
          <div className="icon-tile-gradient icon-tile-purple">
            {icon}
          </div>
        )}
      </div>
      <div className="metric-card-value font-numeric" style={{ color: '#fff' }}>
        {value}
      </div>
      {sub && <div className="metric-card-footer">{sub}</div>}
    </div>
  );
}

// ---------- Progress Indicator ----------
export function Progress({ pct = 0, state }) {
  let statusClass = 'status-success';
  if (state === 'exceeded' || pct >= 100) statusClass = 'status-danger';
  else if (state === 'warning' || pct >= 80) statusClass = 'status-warning';

  return (
    <div className="progress-track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100">
      <div className={`progress-fill ${statusClass}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

// ---------- Empty State ----------
export function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="empty-placeholder">
      <div className="empty-icon-wrap">
        {icon || <Inbox size={32} />}
      </div>
      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>{title}</h4>
      {sub && <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, marginBottom: action ? 18 : 0, lineHeight: 1.5 }}>{sub}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

// ---------- Skeletons ----------
export function SkeletonCards({ n = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 24 }} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton-shimmer" style={{ height: 130 }} />
      ))}
    </div>
  );
}

// ---------- Pills ----------
export function TypePill({ type }) {
  const isIncome = type === 'income';
  return (
    <span className={`pill ${isIncome ? 'pill-income' : 'pill-expense'}`}>
      {isIncome ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {isIncome ? 'Income' : 'Expense'}
    </span>
  );
}

export function StatePill({ state }) {
  if (state === 'exceeded') return <span className="pill pill-expense">Exceeded</span>;
  if (state === 'warning') return <span className="pill pill-warning">Near limit</span>;
  return <span className="pill pill-income">On track</span>;
}

// Re-export futuristic Neon Components
export {
  GlassPanel,
  GlassCard,
  MetricCard,
  ConcentricNeonDonut,
  AnalyticsPanel,
  TransactionList,
  AIChat,
} from './NeonComponents.jsx';
