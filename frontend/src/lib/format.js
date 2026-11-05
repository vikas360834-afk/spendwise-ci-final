export function fmtMoney(n, currency = 'INR') {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);
  } catch {
    return `₹${Number(n).toLocaleString('en-IN')}`;
  }
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function monthLabel(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || '—';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

export function todayYM() {
  return new Date().toISOString().slice(0, 7);
}
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
