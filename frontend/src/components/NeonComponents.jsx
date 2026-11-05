import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Bot,
  Send,
  X,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  Target,
  PiggyBank,
  FolderTree,
  Repeat,
  Wallet,
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  Film,
  Briefcase,
  HeartPulse,
  Tag,
  Clock
} from 'lucide-react';
import { fmtMoney } from '../lib/format.js';
import { api } from '../api.js';

// ==========================================================================
// 1. Reusable Glass Surfaces: GlassPanel & GlassCard
// ==========================================================================
export function GlassPanel({ children, className = '', style = {} }) {
  return (
    <div className={`glass-panel ${className}`} style={style}>
      {children}
    </div>
  );
}

export function GlassCard({
  title,
  subtitle,
  icon,
  iconTone = 'purple',
  action,
  actionLabel,
  onAction,
  children,
  className = '',
  style = {},
  withDecor = false,
  glowColor,
}) {
  return (
    <div
      className={`glass-card-neon ${className}`}
      style={{
        ...style,
        position: 'relative',
        ...(glowColor ? { boxShadow: `var(--shadow-ambient), 0 0 25px ${glowColor}` } : {}),
      }}
    >
      {withDecor && (
        <div
          className="floating-decor-ring"
          style={{ width: 190, height: 190, right: -45, top: -45 }}
          aria-hidden="true"
        />
      )}
      {(title || icon || actionLabel || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {icon && (
              <div className={`icon-tile-gradient icon-tile-${iconTone}`}>
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action ? (
            action
          ) : actionLabel ? (
            <button
              className="btn-neon btn-neon-secondary"
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
              onClick={onAction}
            >
              <span>{actionLabel}</span>
              <ChevronRight size={14} />
            </button>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}

// ==========================================================================
// 2. MetricCard: Asymmetric Financial Overview Cards
// ==========================================================================
export function MetricCard({
  type = 'default',
  label,
  value,
  sub,
  trend,
  tone = 'purple',
  icon,
  sparklineData = [],
  progress = 0,
  onClick,
}) {
  const toneClasses = {
    purple: 'icon-tile-purple',
    magenta: 'icon-tile-magenta',
    cyan: 'icon-tile-cyan',
    gold: 'icon-tile-gold',
  };

  const glowStyles = {
    purple: '0 0 18px rgba(168, 85, 247, 0.4)',
    magenta: '0 0 18px rgba(217, 70, 239, 0.4)',
    cyan: '0 0 18px rgba(6, 182, 212, 0.4)',
    gold: '0 0 18px rgba(251, 191, 36, 0.4)',
  };

  // Dedicated Card 1: Total Balance with Subtle Glowing Aura
  if (type === 'balance') {
    return (
      <div
        className="glass-card-neon metric-hero-card"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <div className="metric-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="metric-card-label">{label}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 99,
                background: 'rgba(217, 70, 239, 0.2)',
                color: 'var(--neon-magenta)',
                border: '1px solid rgba(217, 70, 239, 0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Live Vault
            </span>
          </div>
          <div className="icon-tile-gradient icon-tile-purple">
            {icon || <Wallet size={20} />}
          </div>
        </div>

        <div style={{ margin: '8px 0 12px' }}>
          <div
            className="metric-card-value font-numeric"
            style={{
              color: '#ffffff',
              fontSize: 34,
              textShadow: '0 0 24px rgba(168, 85, 247, 0.55), 0 0 8px rgba(217, 70, 239, 0.4)',
            }}
          >
            {value}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 8px var(--neon-cyan)' }} />
            {sub}
          </div>
        </div>

        <div className="metric-card-footer" style={{ borderTop: '1px solid rgba(168, 85, 247, 0.18)', paddingTop: 10 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Net Retained Capital</span>
          {trend !== null && trend !== undefined && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 99,
                background: trend >= 0 ? 'rgba(6, 182, 212, 0.18)' : 'rgba(217, 70, 239, 0.18)',
                color: trend >= 0 ? 'var(--neon-cyan)' : 'var(--neon-magenta)',
                border: `1px solid ${trend >= 0 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(217, 70, 239, 0.35)'}`,
              }}
            >
              {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(trend)}% MoM
            </span>
          )}
        </div>
      </div>
    );
  }

  // Dedicated Card 2: Income with miniature sparkline
  if (type === 'income') {
    return (
      <div
        className="glass-card-neon"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
      >
        <div>
          <div className="metric-card-header">
            <span className="metric-card-label">{label}</span>
            <div className="icon-tile-gradient icon-tile-cyan">
              {icon || <ArrowUpRight size={20} />}
            </div>
          </div>

          <div
            className="metric-card-value font-numeric"
            style={{ color: 'var(--neon-cyan)', textShadow: glowStyles.cyan }}
          >
            {value}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sub}</div>
        </div>

        {/* Mini SVG Sparkline */}
        <div style={{ marginTop: 12, height: 38, position: 'relative' }}>
          <MiniSparkline data={sparklineData.length ? sparklineData : [25, 38, 30, 48, 42, 60]} color="#06b6d4" />
        </div>

        <div className="metric-card-footer" style={{ borderTop: '1px solid rgba(6, 182, 212, 0.15)', paddingTop: 8 }}>
          <span style={{ fontSize: 11 }}>Inflow Run-Rate</span>
          {trend !== null && trend !== undefined && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neon-cyan)' }}>
              +{trend}%
            </span>
          )}
        </div>
      </div>
    );
  }

  // Dedicated Card 3: Expenses with spending indicator
  if (type === 'expenses') {
    return (
      <div
        className="glass-card-neon"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
      >
        <div>
          <div className="metric-card-header">
            <span className="metric-card-label">{label}</span>
            <div className="icon-tile-gradient icon-tile-magenta">
              {icon || <ArrowDownRight size={20} />}
            </div>
          </div>

          <div
            className="metric-card-value font-numeric"
            style={{ color: 'var(--neon-magenta)', textShadow: glowStyles.magenta }}
          >
            {value}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sub}</div>
        </div>

        {/* Mini Spending Trend Bar / Sparkline */}
        <div style={{ marginTop: 12, height: 38, position: 'relative' }}>
          <MiniSparkline data={sparklineData.length ? sparklineData : [40, 32, 45, 38, 52, 44]} color="#d946ef" />
        </div>

        <div className="metric-card-footer" style={{ borderTop: '1px solid rgba(217, 70, 239, 0.15)', paddingTop: 8 }}>
          <span style={{ fontSize: 11 }}>Outflow Velocity</span>
          {trend !== null && trend !== undefined && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neon-magenta)' }}>
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Dedicated Card 4: Savings with Mini Progress Ring
  if (type === 'savings') {
    const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    const r = 24;
    const circ = 2 * Math.PI * r;
    const offset = circ - (safeProgress / 100) * circ;

    return (
      <div
        className="glass-card-neon"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
      >
        <div className="metric-card-header">
          <span className="metric-card-label">{label}</span>
          <div className="icon-tile-gradient icon-tile-gold">
            {icon || <PiggyBank size={20} />}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0' }}>
          <div>
            <div
              className="metric-card-value font-numeric"
              style={{ color: 'var(--neon-gold)', textShadow: glowStyles.gold }}
            >
              {value}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sub}</div>
          </div>

          {/* Mini Gold Progress Ring */}
          <div style={{ width: 62, height: 62, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={62} height={62} viewBox="0 0 62 62">
              <circle
                cx={31}
                cy={31}
                r={r}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={5}
              />
              <circle
                cx={31}
                cy={31}
                r={r}
                fill="none"
                stroke="var(--neon-gold)"
                strokeWidth={5}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 31 31)"
                style={{ filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))' }}
              />
            </svg>
            <span style={{ position: 'absolute', fontSize: 11, fontWeight: 800, color: '#fff' }}>
              {safeProgress}%
            </span>
          </div>
        </div>

        <div className="metric-card-footer" style={{ borderTop: '1px solid rgba(251, 191, 36, 0.18)', paddingTop: 8 }}>
          <span style={{ fontSize: 11 }}>Target Benchmark</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--neon-gold)' }}>
            ≥ 20% Rule
          </span>
        </div>
      </div>
    );
  }

  // Fallback Metric Card
  return (
    <div
      className="glass-card-neon"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div className="metric-card-header">
        <span className="metric-card-label">{label}</span>
        {icon && (
          <div className={`icon-tile-gradient ${toneClasses[tone] || 'icon-tile-purple'}`}>
            {icon}
          </div>
        )}
      </div>

      <div
        className="metric-card-value font-numeric"
        style={{
          color: tone === 'cyan' ? 'var(--neon-cyan)' : tone === 'magenta' ? 'var(--neon-magenta)' : tone === 'gold' ? 'var(--neon-gold)' : 'var(--text-primary)',
          textShadow: glowStyles[tone],
        }}
      >
        {value}
      </div>

      <div className="metric-card-footer">
        <span>{sub}</span>
      </div>
    </div>
  );
}

// Sparkline helper
function MiniSparkline({ data = [], color = '#a855f7' }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 180;
  const height = 36;
  const step = width / (data.length - 1 || 1);

  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 6) - 3}`).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

// ==========================================================================
// 3. Concentric Circular Telemetry Hero: Donut + Progress Rings
// ==========================================================================
export function ConcentricNeonDonut({
  centerValue,
  centerLabel = 'Total Expenses',
  categories = [],
  budgetUtilization = 0,
  savingsProgress = 0,
  size = 280,
  activeCategory = null,
  onSelectCategory,
}) {
  const outerR = 98;
  const middleR = 76;
  const innerR = 56;
  const cx = size / 2;
  const cy = size / 2;

  // Category palette
  const colors = ['#d946ef', '#a855f7', '#06b6d4', '#fbbf24', '#ec4899', '#38bdf8', '#10b981'];
  const totalCat = categories.reduce((s, c) => s + (c.amount || 0), 0) || 1;

  let accumulatedPct = 0;
  const outerSlices = categories.slice(0, 6).map((c, i) => {
    const pct = c.amount / totalCat;
    const circumference = 2 * Math.PI * outerR;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPct * circumference;
    accumulatedPct += pct;
    const isSelected = activeCategory === c.category;
    return {
      category: c.category,
      color: colors[i % colors.length],
      strokeDasharray,
      strokeDashoffset,
      pct: Math.round(pct * 100),
      amount: c.amount,
      isSelected,
    };
  });

  // Middle ring: Budget Utilization (Electric Cyan / Magenta if exceeded)
  const middleCircumference = 2 * Math.PI * middleR;
  const budgetClamped = Math.min(100, Math.max(0, budgetUtilization));
  const middleDash = `${(budgetClamped / 100) * middleCircumference} ${middleCircumference}`;
  const budgetColor = budgetUtilization >= 100 ? 'var(--neon-rose)' : budgetUtilization >= 80 ? 'var(--neon-magenta)' : 'var(--neon-cyan)';

  // Inner ring: Savings Progress (Restrained Gold)
  const innerCircumference = 2 * Math.PI * innerR;
  const savingsClamped = Math.min(100, Math.max(0, savingsProgress));
  const innerDash = `${(savingsClamped / 100) * innerCircumference} ${innerCircumference}`;

  return (
    <div className="circular-gauge-wrapper" style={{ width: size, height: size, margin: '0 auto' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="concentric-rings-svg"
      >
        <defs>
          <filter id="neonGlowOuter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neonGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neonGlowGold" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Decorative subtle dashed orbit ring */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR + 18}
          fill="none"
          stroke="rgba(168, 85, 247, 0.2)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />

        {/* Track backgrounds */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="11" />
        <circle cx={cx} cy={cy} r={middleR} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="6" />

        {/* Outer Ring: Category Slices */}
        <g transform={`rotate(-90 ${cx} ${cy})`} filter="url(#neonGlowOuter)">
          {outerSlices.map((s, idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={outerR}
              fill="none"
              stroke={s.color}
              strokeWidth={s.isSelected ? 14 : 11}
              strokeDasharray={s.strokeDasharray}
              strokeDashoffset={s.strokeDashoffset}
              strokeLinecap="round"
              style={{
                cursor: 'pointer',
                transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                opacity: activeCategory && !s.isSelected ? 0.35 : 1,
              }}
              onClick={() => onSelectCategory && onSelectCategory(s.isSelected ? null : s.category)}
            />
          ))}
        </g>

        {/* Middle Ring: Budget Utilization */}
        <g transform={`rotate(-90 ${cx} ${cy})`} filter="url(#neonGlowCyan)">
          <circle
            cx={cx}
            cy={cy}
            r={middleR}
            fill="none"
            stroke={budgetColor}
            strokeWidth="8"
            strokeDasharray={middleDash}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
        </g>

        {/* Inner Ring: Savings Goals Progress (Neon Gold) */}
        <g transform={`rotate(-90 ${cx} ${cy})`} filter="url(#neonGlowGold)">
          <circle
            cx={cx}
            cy={cy}
            r={innerR}
            fill="none"
            stroke="var(--neon-gold)"
            strokeWidth="6"
            strokeDasharray={innerDash}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Holographic Center Display */}
      <div className="gauge-center-content">
        <div className="gauge-center-value font-numeric">{centerValue}</div>
        <div className="gauge-center-subtitle">{centerLabel}</div>
        <div style={{ fontSize: 10.5, color: 'var(--neon-cyan)', marginTop: 4, fontWeight: 700 }}>
          {budgetClamped}% Budget Used
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// 4. AnalyticsPanel: Circular Telemetry & Indicators
// ==========================================================================
export function AnalyticsPanel({
  stats,
  budgets,
  savingsRate,
  onNavigate,
}) {
  const [selectedCat, setSelectedCat] = useState(null);

  const catEntries = useMemo(() => {
    return Object.entries(stats?.byCategory || {})
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));
  }, [stats?.byCategory]);

  const budgetUtil = budgets?.utilization || 0;
  const colors = ['#d946ef', '#a855f7', '#06b6d4', '#fbbf24', '#ec4899', '#38bdf8'];

  const displayedValue = useMemo(() => {
    if (!selectedCat) return fmtMoney(stats?.expenses || 0);
    const found = catEntries.find((c) => c.category === selectedCat);
    return found ? fmtMoney(found.amount) : fmtMoney(stats?.expenses || 0);
  }, [selectedCat, catEntries, stats?.expenses]);

  const displayedLabel = selectedCat ? `${selectedCat} Spend` : 'Total Outflow';

  return (
    <div className="circular-analytics-container">
      {/* 1. Interactive Multi-Ring Circular Visualization Card */}
      <GlassCard
        title="Circular Financial Telemetry"
        subtitle="Interactive multi-ring expense distribution & budget velocity"
        icon={<Sparkles size={20} />}
        iconTone="magenta"
        actionLabel="Categories"
        onAction={() => onNavigate && onNavigate('categories')}
        withDecor
      >
        <ConcentricNeonDonut
          centerValue={displayedValue}
          centerLabel={displayedLabel}
          categories={catEntries}
          budgetUtilization={budgetUtil}
          savingsProgress={Number(savingsRate) || 0}
          size={270}
          activeCategory={selectedCat}
          onSelectCategory={setSelectedCat}
        />

        {/* Compact Clickable Category Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 14 }}>
          {catEntries.slice(0, 4).map((c, i) => {
            const isSelected = selectedCat === c.category;
            return (
              <button
                key={c.category}
                type="button"
                className="legend-pill"
                onClick={() => setSelectedCat(isSelected ? null : c.category)}
                style={{
                  border: isSelected ? '1px solid var(--neon-magenta)' : undefined,
                  background: isSelected ? 'rgba(217, 70, 239, 0.16)' : undefined,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: colors[i % colors.length],
                      boxShadow: `0 0 8px ${colors[i % colors.length]}`,
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.category}</span>
                </div>
                <span className="font-numeric" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {fmtMoney(c.amount)}
                </span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* 2. Ring Gauge Indicators */}
      <GlassCard
        title="Ring Gauge Indicators"
        subtitle="Telemetry breakdown across active concentric tracks"
        icon={<Target size={20} />}
        iconTone="cyan"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Ring 1: Expense Outflow */}
          <div className="legend-pill" style={{ padding: '12px 14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--neon-magenta)', boxShadow: '0 0 10px var(--neon-magenta)' }} />
                <span style={{ fontWeight: 700, fontSize: 13.5, color: '#fff' }}>Outer Ring: Expense Velocity</span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                Proportional category breakdown of {stats?.count || 0} transactions
              </p>
            </div>
            <span className="font-numeric" style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--neon-magenta)' }}>
              {fmtMoney(stats?.expenses || 0)}
            </span>
          </div>

          {/* Ring 2: Budget Utilization */}
          <div className="legend-pill" style={{ padding: '12px 14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: budgetUtil >= 100 ? 'var(--neon-rose)' : 'var(--neon-cyan)',
                    boxShadow: `0 0 10px ${budgetUtil >= 100 ? 'var(--neon-rose)' : 'var(--neon-cyan)'}`,
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: 13.5, color: '#fff' }}>Middle Ring: Budget Utilization</span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                {budgetUtil}% of allocated monthly limit consumed
              </p>
            </div>
            <span
              className="font-numeric"
              style={{
                fontWeight: 800,
                fontSize: 14.5,
                color: budgetUtil >= 100 ? 'var(--neon-rose)' : 'var(--neon-cyan)',
              }}
            >
              {budgetUtil}%
            </span>
          </div>

          {/* Ring 3: Savings Efficiency */}
          <div className="legend-pill" style={{ padding: '12px 14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--neon-gold)', boxShadow: '0 0 10px var(--neon-gold)' }} />
                <span style={{ fontWeight: 700, fontSize: 13.5, color: '#fff' }}>Inner Ring: Savings Efficiency</span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                All-time net retained capital margin
              </p>
            </div>
            <span className="font-numeric" style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--neon-gold)' }}>
              {savingsRate}%
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ==========================================================================
// 5. TransactionList: Recent Transactions with Category Icons
// ==========================================================================
export function getCategoryIcon(category = '') {
  const c = category.toLowerCase();
  if (c.includes('food') || c.includes('grocer') || c.includes('dine') || c.includes('restaurant')) return Utensils;
  if (c.includes('transport') || c.includes('travel') || c.includes('fuel') || c.includes('flight')) return Car;
  if (c.includes('bill') || c.includes('util') || c.includes('electric') || c.includes('wifi')) return Zap;
  if (c.includes('entertainment') || c.includes('movie') || c.includes('game')) return Film;
  if (c.includes('salary') || c.includes('income') || c.includes('bonus')) return Briefcase;
  if (c.includes('health') || c.includes('medic') || c.includes('hospital')) return HeartPulse;
  if (c.includes('shop') || c.includes('cloth') || c.includes('amazon')) return ShoppingBag;
  return CreditCard;
}

export function TransactionList({
  transactions = [],
  onViewAll,
  onOpenAdd,
}) {
  return (
    <GlassCard
      title="Recent Transactions"
      subtitle="Latest verified inflows and card charges"
      icon={<CreditCard size={20} />}
      iconTone="purple"
      actionLabel="View All"
      onAction={onViewAll}
    >
      {!transactions.length ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 13 }}>No recent transactions recorded.</p>
          {onOpenAdd && (
            <button className="btn-neon btn-neon-primary" style={{ marginTop: 12, padding: '6px 14px', fontSize: 12 }} onClick={onOpenAdd}>
              Add Expense
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {transactions.slice(0, 5).map((t) => {
            const isIncome = t.type === 'income';
            const IconComponent = getCategoryIcon(t.category);
            return (
              <div key={t.id} className="transaction-row-neon">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    className={`icon-tile-gradient ${isIncome ? 'icon-tile-cyan' : 'icon-tile-magenta'}`}
                    style={{ width: 38, height: 38, borderRadius: 10 }}
                  >
                    <IconComponent size={17} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span>{t.date}</span>
                      <span>•</span>
                      <span className="category-badge" style={{ padding: '1px 6px', fontSize: 10.5 }}>
                        {t.category}
                      </span>
                      {t.paymentMethod && (
                        <>
                          <span>•</span>
                          <span>{t.paymentMethod}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    className="font-numeric"
                    style={{
                      fontWeight: 800,
                      fontSize: 14.5,
                      color: isIncome ? 'var(--neon-cyan)' : 'var(--neon-magenta)',
                      textShadow: isIncome ? '0 0 10px rgba(6, 182, 212, 0.35)' : '0 0 10px rgba(217, 70, 239, 0.35)',
                    }}
                  >
                    {isIncome ? '+' : '-'}{fmtMoney(t.amount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

// ==========================================================================
// 6. AIChat: Floating Glassmorphism Conversation Drawer
// ==========================================================================
export function AIChat({ open, onClose, onNavigate, initialPrompt = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const SUGGESTIONS = [
    'How much did I spend this month?',
    'What is my biggest expense category?',
    'Compare this month with last month',
    'Am I exceeding my budget?',
    'How much money can I save?',
  ];

  useEffect(() => {
    if (initialPrompt && open) {
      send(initialPrompt);
    }
  }, [initialPrompt, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (msg) => {
    const text = (msg || input).trim();
    if (!text || loading) return;
    setInput('');

    setMessages((m) => [...m, { role: 'user', text, time: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await api.aiChat(text);
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: res.reply, time: new Date().toISOString(), mode: res.mode },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'Financial copilot offline. Please verify connection.', time: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="ai-chat-drawer">
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(168, 85, 247, 0.22)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(217, 70, 239, 0.08)',
        }}
      >
        <div className="icon-tile-gradient icon-tile-magenta" style={{ width: 38, height: 38, borderRadius: 10 }}>
          <Bot size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: '#fff' }}>SpendWise AI Copilot</div>
          <div style={{ fontSize: 11, color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 6px var(--neon-cyan)' }} />
            Zero-hallucination verified ledger data
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Close"
          style={{ width: 32, height: 32, padding: 0 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto 0', padding: 14 }}>
            <Bot size={30} style={{ color: 'var(--neon-magenta)', marginBottom: 10 }} />
            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Neon Financial Intelligence</h4>
            <p style={{ fontSize: 12, marginBottom: 16 }}>Ask questions grounded directly in your stored transactions.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="btn-neon btn-neon-secondary"
                  style={{ padding: '6px 12px', fontSize: 11.5, borderRadius: 99 }}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: 14,
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    background: isUser
                      ? 'var(--gradient-neon)'
                      : 'rgba(38, 18, 70, 0.72)',
                    border: isUser ? 'none' : '1px solid rgba(168, 85, 247, 0.28)',
                    color: isUser ? '#ffffff' : 'var(--text-primary)',
                    boxShadow: isUser ? '0 4px 18px rgba(168, 85, 247, 0.4)' : 'none',
                  }}
                >
                  {!isUser && (
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--neon-cyan)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {m.mode === 'live' ? 'Live AI' : 'Verified Actuals'}
                    </div>
                  )}
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--neon-magenta)', fontSize: 12 }}>
            <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            Analyzing financial records...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(168, 85, 247, 0.2)', display: 'flex', gap: 8, background: 'rgba(16, 9, 32, 0.65)' }}>
        <input
          placeholder="Ask financial question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={loading}
          style={{
            flex: 1,
            height: 40,
            fontSize: 13,
            background: 'rgba(13, 6, 26, 0.85)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: 10,
            color: '#fff',
            padding: '0 12px',
          }}
        />
        <button
          className="btn-neon btn-neon-primary"
          style={{ width: 40, height: 40, padding: 0, borderRadius: 10 }}
          onClick={() => send()}
          disabled={loading || !input.trim()}
          aria-label="Send query"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
