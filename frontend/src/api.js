const ENV_API = import.meta.env.VITE_API_URL;
const isDev = import.meta.env.DEV;
const port = typeof location !== 'undefined' ? location.port : '';
// In dev the Vite proxy forwards /api to the backend on any port (:5173, :5174…).
// In production the backend serves the app. A static preview on another port
// (VS Code Live Preview/Live Server) calls the API directly instead.
const API = ENV_API || (isDev || !port || port === '4000' ? '' : 'http://localhost:4000');

function headers() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw new Error('Session expired, please login again');
  }
  if (res.status === 429) throw new Error('Too many requests — please wait and retry');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.errors?.join(', ') || 'Request failed');
  return data;
}

function qs(params = {}) {
  return new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null))).toString();
}

export const api = {
  register: (body) => fetch(`${API}/api/auth/register`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  login: (body) => fetch(`${API}/api/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  me: () => fetch(`${API}/api/auth/me`, { headers: headers() }).then(handle),

  listExpenses: (params = {}) => fetch(`${API}/api/expenses?${qs(params)}`, { headers: headers() }).then(handle),
  createExpense: (body) => fetch(`${API}/api/expenses`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  updateExpense: (id, body) => fetch(`${API}/api/expenses/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handle),
  deleteExpense: (id) => fetch(`${API}/api/expenses/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  meta: () => Promise.all([
    fetch(`${API}/api/expenses/meta/categories`, { headers: headers() }).then(handle),
    fetch(`${API}/api/expenses/meta/payment-methods`, { headers: headers() }).then(handle),
  ]).then(([categories, paymentMethods]) => ({ categories, paymentMethods })),
  exportCsv: (params = {}) => fetch(`${API}/api/expenses/export?${qs(params)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
  seed: () => fetch(`${API}/api/seed`, { method: 'POST', headers: headers() }).then(handle),

  stats: () => fetch(`${API}/api/stats`, { headers: headers() }).then(handle),
  periods: () => fetch(`${API}/api/stats/periods`, { headers: headers() }).then(handle),

  listBudgets: (month) => fetch(`${API}/api/budgets${month ? `?month=${month}` : ''}`, { headers: headers() }).then(handle),
  budgetStatus: (month) => fetch(`${API}/api/budgets/status/overview?month=${month}`, { headers: headers() }).then(handle),
  budgetSuggestions: (month) => fetch(`${API}/api/budgets/suggestions?month=${month}`, { headers: headers() }).then(handle),
  createBudget: (body) => fetch(`${API}/api/budgets`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  deleteBudget: (id) => fetch(`${API}/api/budgets/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  listRecurring: () => fetch(`${API}/api/recurring`, { headers: headers() }).then(handle),
  upcomingRecurring: (days = 30) => fetch(`${API}/api/recurring/upcoming?days=${days}`, { headers: headers() }).then(handle),
  createRecurring: (body) => fetch(`${API}/api/recurring`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  updateRecurring: (id, body) => fetch(`${API}/api/recurring/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handle),
  skipRecurring: (id) => fetch(`${API}/api/recurring/${id}/skip`, { method: 'POST', headers: headers() }).then(handle),
  deleteRecurring: (id) => fetch(`${API}/api/recurring/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  listGoals: () => fetch(`${API}/api/goals`, { headers: headers() }).then(handle),
  createGoal: (body) => fetch(`${API}/api/goals`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  updateGoal: (id, body) => fetch(`${API}/api/goals/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handle),
  contributeGoal: (id, amount) => fetch(`${API}/api/goals/${id}/contribute`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount }) }).then(handle),
  deleteGoal: (id) => fetch(`${API}/api/goals/${id}`, { method: 'DELETE', headers: headers() }).then(handle),

  getSettings: () => fetch(`${API}/api/settings`, { headers: headers() }).then(handle),
  updateSettings: (body) => fetch(`${API}/api/settings`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handle),
  updateProfile: (body) => fetch(`${API}/api/settings/profile`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(handle),
  exportAll: () => fetch(`${API}/api/settings/export-all`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
  deleteMyData: () => fetch(`${API}/api/settings/data`, { method: 'DELETE', headers: headers() }).then(handle),

  aiStatus: () => fetch(`${API}/api/ai/status`, { headers: headers() }).then(handle),
  aiChat: (message) => fetch(`${API}/api/ai/chat`, { method: 'POST', headers: headers(), body: JSON.stringify({ message }) }).then(handle),

  systemHealth: () => fetch(`${API}/api/system/health`, { headers: headers() }).then(handle),
  systemInfo: () => fetch(`${API}/api/system/info`, { headers: headers() }).then(handle),
};

export async function download(res, filename) {
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
