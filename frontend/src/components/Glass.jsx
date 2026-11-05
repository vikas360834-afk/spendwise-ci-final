import { forwardRef, useEffect, useRef } from 'react';
import { X, AlertTriangle, Inbox, Loader2 } from 'lucide-react';

/* ==========================================================================
   SpendWise AI — Glass Primitives
   The shared vocabulary for every surface in the app. Pages compose these
   instead of hand-rolling markup so spacing, radii, focus rings and
   motion stay consistent everywhere.
   ========================================================================== */

/* ---------- GlassCard ---------------------------------------------- */

export function GlassCard({
  as: Tag = 'section',
  children,
  className = '',
  interactive = false,
  tone, // 'default' | 'success' | 'danger' | 'warning' | 'accent'
  style,
  ...rest
}) {
  const toneClass = tone && tone !== 'default' ? ` tone-${tone}` : '';
  return (
    <Tag
      className={`glass-card${interactive ? ' interactive' : ''}${toneClass} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ---------- GlassButton -------------------------------------------- */

export function GlassButton({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'warning'
  size, // 'sm' | 'lg'
  block = false,
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  style,
  ...rest
}) {
  const classes = [
    'glass-btn',
    variant,
    size || '',
    block ? 'block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} style={style} {...rest}>
      {loading && <Loader2 size={15} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ---------- GlassModal --------------------------------------------- */

export function GlassModal({ title, subtitle, children, footer, onClose, wide = false, labelledBy }) {
  const ref = useRef(null);

  // Escape to close + scroll lock + initial focus.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = ref.current?.querySelector(
      'input, select, textarea, button:not([aria-label="Close"])'
    );
    node?.focus?.();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={ref}
        className={`modal-card${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="panel-sub" style={{ marginTop: 3 }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal" type="button">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- GlassInput --------------------------------------------- */

export const GlassInput = forwardRef(function GlassInput({ label, hint, error, className = '', style, id, ...rest }, ref) {
  const inputId = id || rest.name || undefined;
  return (
    <div className={`field-group ${className}`.trim()} style={style}>
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <input ref={ref} id={inputId} className="glass-input" aria-invalid={error ? 'true' : undefined} {...rest} />
      {error ? (
        <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{hint}</span>
      ) : null}
    </div>
  );
});

/* ---------- GlassSelect -------------------------------------------- */

export const GlassSelect = forwardRef(function GlassSelect({ label, hint, error, children, className = '', style, id, ...rest }, ref) {
  const inputId = id || rest.name || undefined;
  return (
    <div className={`field-group ${className}`.trim()} style={style}>
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <select ref={ref} id={inputId} className="glass-input" aria-invalid={error ? 'true' : undefined} {...rest}>
        {children}
      </select>
      {error ? (
        <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{hint}</span>
      ) : null}
    </div>
  );
});

/* ---------- GlassTextarea ------------------------------------------ */

export const GlassTextarea = forwardRef(function GlassTextarea({ label, hint, error, className = '', style, id, ...rest }, ref) {
  const inputId = id || rest.name || undefined;
  return (
    <div className={`field-group ${className}`.trim()} style={style}>
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <textarea ref={ref} id={inputId} className="glass-input" aria-invalid={error ? 'true' : undefined} {...rest} />
      {error ? (
        <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{hint}</span>
      ) : null}
    </div>
  );
});

/* ---------- GlassBadge / pill ------------------------------------- */

export function GlassBadge({ tone = 'neutral', children, icon: Icon, className = '', style }) {
  return (
    <span className={`pill pill-${tone} ${className}`.trim()} style={style}>
      {Icon && <Icon size={13} aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ---------- GlassProgress ----------------------------------------- */

export function GlassProgress({ pct = 0, state, tone, label, showValue = false }) {
  const safe = Number.isFinite(pct) ? pct : 0;
  let statusClass = '';
  if (!tone) {
    if (state === 'exceeded' || safe >= 100) statusClass = ' status-danger';
    else if (state === 'warning' || safe >= 80) statusClass = ' status-warning';
    else statusClass = ' status-success';
  }
  return (
    <div>
      {label && (
        <div className="row-between" style={{ marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          {showValue && (
            <strong className="font-numeric" style={{ color: 'var(--text-strong)' }}>
              {Math.round(safe)}%
            </strong>
          )}
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={Math.round(safe)}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={label || 'Progress'}
      >
        <div
          className={`progress-fill${statusClass}`}
          style={{ width: `${Math.min(100, Math.max(0, safe))}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Skeleton / empty / error ------------------------------ */

export function GlassSkeleton({ height = 130, radius, style }) {
  return <div className="skeleton-shimmer" style={{ height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

export function GlassSkeletonGrid({ n = 4, height = 130 }) {
  return (
    <div className="metrics-overview-grid" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <GlassSkeleton key={i} height={height} />
      ))}
    </div>
  );
}

export function GlassEmptyState({ icon: Icon = Inbox, title, sub, action }) {
  return (
    <div className="empty-placeholder">
      <div className="empty-icon-wrap">
        <Icon size={28} aria-hidden="true" />
      </div>
      <h4 style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 5 }}>{title}</h4>
      {sub && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 400, marginBottom: action ? 16 : 0, lineHeight: 1.55 }}>
          {sub}
        </p>
      )}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function GlassErrorState({ title = 'Something went wrong', message, action }) {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle size={22} aria-hidden="true" />
      <strong style={{ fontSize: 14 }}>{title}</strong>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

/* ---------- Stat tile --------------------------------------------- */

export function GlassStatTile({ icon: Icon, label, value, sub, tone = 'purple', trend }) {
  const toneClass = {
    purple: 'icon-tile-purple',
    cyan: 'icon-tile-cyan',
    gold: 'icon-tile-gold',
    magenta: 'icon-tile-magenta',
  }[tone] || 'icon-tile-purple';

  return (
    <div className="glass-card interactive" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
      <div className="metric-card-header" style={{ marginBottom: 0 }}>
        <span className="metric-card-label">{label}</span>
        {Icon && (
          <div className={`icon-tile-gradient ${toneClass}`} aria-hidden="true">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="metric-card-value font-numeric" style={{ fontSize: 22 }}>{value}</div>
      {(sub || trend) && (
        <div className="metric-card-footer" style={{ marginTop: 2 }}>
          {trend}
          {sub}
        </div>
      )}
    </div>
  );
}
