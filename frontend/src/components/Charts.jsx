import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { fmtMoney } from '../lib/format.js';

/* ==========================================================================
   SpendWise AI — Chart Suite (Recharts)
   Every chart renders real API data. The shared glass tooltip keeps
   hover behaviour consistent across the analytics workspace.
   ========================================================================== */

/* ---------- Palette ------------------------------------------------- */

export const CHART_COLORS = [
  '#8b5cf6', // violet
  '#22d3ee', // cyan
  '#3b82f6', // electric blue
  '#f472b6', // pink
  '#fbbf24', // amber
  '#34d399', // emerald
  '#a78bfa', // light violet
  '#60a5fa', // sky
  '#fb7185', // rose
  '#2dd4bf', // teal
  '#c084fc', // purple
  '#64748b', // slate
];

export const COLOR_INCOME = '#34d399';
export const COLOR_EXPENSE = '#fb7185';
export const COLOR_NET = '#8b5cf6';
export const COLOR_PREVIOUS = 'rgba(148, 163, 219, 0.45)';

export function colorForIndex(i) {
  return CHART_COLORS[i % CHART_COLORS.length];
}

/* ---------- Shared tooltip ------------------------------------------ */

export function ChartTooltip({ active, payload, label, formatter, labelFormatter, extra }) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload.filter((p) => p && p.value !== undefined && p.value !== null);
  if (!rows.length) return null;

  return (
    <div className="chart-tooltip">
      {label !== undefined && label !== '' && (
        <div className="chart-tooltip-title">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      {rows.map((p, i) => {
        const value = formatter ? formatter(p.value, p) : p.value;
        return (
          <div className="chart-tooltip-row" key={`${p.dataKey || 'k'}-${i}`}>
            <span>
              <span
                className="chart-legend-swatch"
                style={{ background: p.color || p.fill || 'var(--accent-violet)' }}
              />
              {p.name || p.dataKey}
            </span>
            <strong>{value}</strong>
          </div>
        );
      })}
      {extra}
    </div>
  );
}

/* ---------- Axis defaults ------------------------------------------- */

const axisStyle = {
  stroke: 'var(--text-dim)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

/** Compact currency for axis ticks (₹1.2L / ₹45K). */
export function fmtAxisMoney(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 10000000) return `${(v / 10000000).toFixed(abs >= 100000000 ? 0 : 1)}Cr`;
  if (abs >= 100000) return `${(v / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`;
  if (abs >= 1000) return `${(v / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return String(Math.round(v));
}

/* ---------- Expense donut ------------------------------------------- */

/**
 * Donut of actual expenses grouped by category.
 * @param data [{ category, amount, share, count }]
 */
export function ExpenseDonut({ data = [], total, currency = 'INR', height = 300, centerLabel = 'Total spent' }) {
  const totalAmount = useMemo(
    () => (Number.isFinite(total) ? total : data.reduce((s, d) => s + (Number(d.amount) || 0), 0)),
    [total, data]
  );

  const rows = useMemo(
    () =>
      data
        .filter((d) => (Number(d.amount) || 0) > 0)
        .map((d, i) => ({
          ...d,
          amount: Number(d.amount) || 0,
          fill: colorForIndex(i),
        })),
    [data]
  );

  if (!rows.length) {
    return (
      <div className="empty-placeholder" style={{ minHeight: height }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No expenses in this period to chart.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="chart-wrap" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {rows.map((entry, i) => (
                <Cell key={`${entry.category}-${i}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              content={
                <ChartTooltip
                  formatter={(value, p) => (
                    <>
                      {fmtMoney(value, currency)}
                      <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>
                        ({p?.payload?.share ?? 0}%)
                      </span>
                    </>
                  )}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <div className="donut-center">
            <div className="donut-center-value font-numeric">{fmtMoney(totalAmount, currency)}</div>
            <div className="donut-center-label">{centerLabel}</div>
          </div>
        </div>
      </div>

      <div className="chart-legend">
        {rows.map((row) => (
          <span className="chart-legend-item" key={row.category}>
            <span className="chart-legend-swatch" style={{ background: row.fill }} />
            <span>{row.category}</span>
            <strong className="font-numeric">{fmtMoney(row.amount, currency)}</strong>
            <span style={{ color: 'var(--text-dim)' }}>{row.share ?? 0}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Income vs expenses grouped bars ------------------------- */

/**
 * Grouped bar chart — monthly income vs expenses with a net savings line.
 * @param data [{ month, label, income, expenses, net }]
 */
export function IncomeExpenseBars({ data = [], currency = 'INR', height = 320 }) {
  const rows = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        income: Number(d.income) || 0,
        expenses: Number(d.expenses) || 0,
        net: Number(d.net) || 0,
      })),
    [data]
  );

  if (!rows.length) {
    return (
      <div className="empty-placeholder" style={{ minHeight: height }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No monthly activity in this period yet.</p>
      </div>
    );
  }

  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 4 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,219,0.10)" vertical={false} />
          <XAxis dataKey="label" {...axisStyle} interval="preserveStartEnd" />
          <YAxis {...axisStyle} width={52} tickFormatter={fmtAxisMoney} />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,219,0.06)' }}
            content={
              <ChartTooltip
                formatter={(value) => fmtMoney(value, currency)}
              />
            }
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 10 }}
          />
          <Bar dataKey="income" name="Income" fill={COLOR_INCOME} radius={[5, 5, 0, 0]} maxBarSize={26} />
          <Bar dataKey="expenses" name="Expenses" fill={COLOR_EXPENSE} radius={[5, 5, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Spending trend (with previous period) ------------------- */

/**
 * Spending trend. Granularity (daily / weekly / monthly) is decided by the
 * backend so the client simply renders whatever bucket set it receives.
 * @param points [{ key, label, expenses, income, previous }]
 */
export function SpendingTrend({ points = [], currency = 'INR', height = 300, granularity = 'daily' }) {
  const rows = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        expenses: Number(p.expenses) || 0,
        previous: p.previous === null || p.previous === undefined ? null : Number(p.previous),
      })),
    [points]
  );

  if (!rows.length) {
    return (
      <div className="empty-placeholder" style={{ minHeight: height }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No trend data available for this range.</p>
      </div>
    );
  }

  const hasPrevious = rows.some((r) => r.previous !== null);

  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 10, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="prevFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3c4" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#94a3c4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,219,0.10)" vertical={false} />
          <XAxis dataKey="label" {...axisStyle} interval="preserveStartEnd" minTickGap={14} />
          <YAxis {...axisStyle} width={52} tickFormatter={fmtAxisMoney} />
          <Tooltip
            cursor={{ stroke: 'rgba(148,163,219,0.25)', strokeDasharray: '4 4' }}
            content={
              <ChartTooltip
                formatter={(value, p) => (value === null || value === undefined ? '—' : fmtMoney(value, currency))}
                labelFormatter={(label) => label}
              />
            }
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 10 }}
          />
          {hasPrevious && (
            <Area
              type="monotone"
              dataKey="previous"
              name="Previous period"
              stroke="#94a3c4"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="url(#prevFill)"
              dot={false}
              activeDot={{ r: 3 }}
              connectNulls
            />
          )}
          <Area
            type="monotone"
            dataKey="expenses"
            name="Spending"
            stroke="#8b5cf6"
            strokeWidth={2.4}
            fill="url(#trendFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {granularity && (
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8, marginBottom: 0 }}>
          Showing <strong style={{ color: 'var(--text-muted)' }}>{granularity}</strong> totals
          {hasPrevious ? ' compared with the immediately preceding period of equal length.' : '.'}
        </p>
      )}
    </div>
  );
}

/* ---------- Category ranking bars ----------------------------------- */

/**
 * Horizontal ranking bar for category totals (used by Categories + Reports).
 * @param data [{ category, amount, share }]
 */
export function CategoryBars({ data = [], currency = 'INR', height = 320, max }) {
  const rows = useMemo(
    () =>
      data
        .filter((d) => (Number(d.amount) || 0) > 0)
        .map((d, i) => ({
          ...d,
          amount: Number(d.amount) || 0,
          fill: colorForIndex(i),
        })),
    [data]
  );

  if (!rows.length) {
    return (
      <div className="empty-placeholder" style={{ minHeight: height }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No category data for this period.</p>
      </div>
    );
  }

  const top = max || Math.max(...rows.map((r) => r.amount));

  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,219,0.10)" horizontal={false} />
          <XAxis type="number" domain={[0, top]} {...axisStyle} tickFormatter={fmtAxisMoney} />
          <YAxis type="category" dataKey="category" {...axisStyle} width={92} />
          <Tooltip
            cursor={{ fill: 'rgba(148,163,219,0.06)' }}
            content={<ChartTooltip formatter={(value) => fmtMoney(value, currency)} />}
          />
          <Bar dataKey="amount" name="Spent" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {rows.map((r, i) => (
              <Cell key={`${r.category}-${i}`} fill={r.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Sparkline ------------------------------------------------ */

/** Compact inline trend line for stat tiles. */
export function Sparkline({ data = [], color = '#8b5cf6', height = 40 }) {
  const rows = useMemo(
    () => data.map((d) => ({ v: Number(d) || 0 })),
    [data]
  );
  if (rows.length < 2) return null;
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#spark-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { ReferenceLine, LineChart, Line };
