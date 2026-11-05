import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, X, MessageSquare, Bot, Loader2, Settings, LogOut, Send, Sparkles, Check, AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { ToastProvider, useToast } from './components/ui.jsx';
import { Sidebar, Topbar, MobileBottomBar } from './components/Layout.jsx';
import { Overview } from './pages/Overview.jsx';
import { Transactions } from './pages/Transactions.jsx';
import { Budgets } from './pages/Budgets.jsx';
import { Analytics } from './pages/Analytics.jsx';
import { Categories } from './pages/Categories.jsx';
import { SavingsGoals } from './pages/SavingsGoals.jsx';
import { AIAssistant } from './pages/AIAssistant.jsx';
import { Recurring } from './pages/Recurring.jsx';
import { Reports } from './pages/Reports.jsx';
import { Settings as SettingsPage } from './pages/Settings.jsx';
import { CategoryDetail } from './pages/CategoryDetail.jsx';
import { DevOps } from './pages/DevOps.jsx';
import { api } from './api.js';
import { todayISO } from './lib/format.js';
import { Modal } from './components/ui.jsx';
import { AIChat } from './components/NeonComponents.jsx';
import './index.css';


const PAGES = {
  overview: Overview,
  transactions: Transactions,
  budgets: Budgets,
  categories: Categories,
  categoryDetail: CategoryDetail,
  goals: SavingsGoals,
  analytics: Analytics,
  ai: AIAssistant,
  recurring: Recurring,
  reports: Reports,
  settings: SettingsPage,
  devops: DevOps,
};

function AppContent() {
  const { user, logout, loading: authLoading } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [globalAddExpenseOpen, setGlobalAddExpenseOpen] = useState(false);
  const [meta, setMeta] = useState({ categories: [], paymentMethods: [] });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    if (user) {
      api.meta().then(setMeta).catch(() => {});
    }
  }, [user]);

  const CurrentPageComponent = useMemo(() => PAGES[current] || Overview, [current]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: 340, padding: 32, textAlign: 'center' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-electric)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Initializing SpendWise AI...</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Loading secure encryption session</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPages />;
  }

  return (
    <div className="app-shell">
      {/* Background Ambient Glow Orbs */}
      <div className="bg-ambient" aria-hidden="true">
        <span className="bg-orb bg-orb-1" />
        <span className="bg-orb bg-orb-2" />
        <span className="bg-orb bg-orb-3" />
      </div>

      {/* Main Sidebar Navigation */}
      <Sidebar
        current={current}
        onNavigate={setCurrent}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="main-wrapper">
        {/* Topbar */}
        <Topbar
          onMenu={() => setSidebarOpen(true)}
          mobileOpen={sidebarOpen}
          searchValue={search}
          onSearchChange={(e) => setSearch(e.target.value)}
          onOpenAddExpense={() => setGlobalAddExpenseOpen(true)}
          onNavigate={setCurrent}
        />

        {/* Dynamic Page Component */}
        <main className="content-canvas" role="main">
          <CurrentPageComponent
            onNavigate={setCurrent}
            onOpenAddExpense={() => setGlobalAddExpenseOpen(true)}
            globalSearch={search}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomBar current={current} onNavigate={setCurrent} />

      {/* Floating Futuristic Neon Action Button for AI Copilot */}
      <button
        className="ai-fab-neon"
        onClick={() => setAiChatOpen(!aiChatOpen)}
        aria-label="Open AI Financial Copilot"
        title="SpendWise AI Copilot"
      >
        <Bot size={28} />
      </button>

      {/* Futuristic Floating Neon Frosted Glass AI Panel */}
      <AIChat
        open={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        onNavigate={setCurrent}
      />


      {/* Global Add Expense Modal */}
      {globalAddExpenseOpen && (
        <GlobalAddExpenseModal
          open={globalAddExpenseOpen}
          onClose={() => setGlobalAddExpenseOpen(false)}
          meta={meta}
          onSuccess={() => {
            setGlobalAddExpenseOpen(false);
            toast('Transaction added successfully!', 'ok');
            // If on transactions or overview, trigger refresh via navigation state
            setCurrent((c) => c);
          }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}



// ---------- Global Add Expense Modal ----------
function GlobalAddExpenseModal({ open, onClose, meta, onSuccess }) {
  const [form, setForm] = useState({
    type: 'expense',
    title: '',
    amount: '',
    category: meta.categories?.[0] || 'Food',
    date: todayISO(),
    paymentMethod: 'UPI',
    tags: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) {
      setErr('Title is required');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setErr('Amount must be positive');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      await api.createExpense(payload);
      onSuccess();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Quick Transaction Entry" onClose={onClose} wide>
      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        {err && (
          <div style={{ border: '1px solid rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
            {err}
          </div>
        )}

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
            <label className="field-label">Title / Counterparty *</label>
            <input
              required
              placeholder="e.g. Swiggy, Uber, Client Wire"
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
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {meta.categories?.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Date *</label>
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
            <label className="field-label">Tags</label>
            <input
              placeholder="coffee, meeting, personal"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Notes (Optional)</label>
          <textarea
            rows={2}
            placeholder="Details or invoice notes..."
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="button" className="btn-neon btn-neon-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-neon btn-neon-primary" disabled={loading || !form.title || !form.amount}>
            {loading ? 'Recording...' : 'Record Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Authentication Screens ----------
function AuthPages() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const toast = useToast();

  const handleAuth = useCallback((token, u) => {
    login(token, u);
    toast(`Welcome back, ${u.name}!`, 'ok');
  }, [login, toast]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
      <div className="bg-ambient" aria-hidden="true">
        <span className="bg-orb bg-orb-1" />
        <span className="bg-orb bg-orb-2" />
        <span className="bg-orb bg-orb-3" />
      </div>

      <div
        className="glass-card-neon"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 36,
          position: 'relative',
          zIndex: 10,
          boxShadow: '0 25px 65px -10px rgba(0, 0, 0, 0.9), var(--neon-glow-purple)',
        }}
      >
        <div
          className="floating-decor-ring"
          style={{ width: 220, height: 220, right: -60, top: -60 }}
          aria-hidden="true"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div className="brand-logo-neon">
            <span>₹</span>
          </div>
          <div>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>SpendWise AI</span>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fintech Intelligence
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 24 }}>
          Futuristic Neon-Purple Personal Expense & Asset Cockpit
        </p>

        {/* Auth mode toggle */}
        <div style={{ display: 'flex', gap: 8, padding: 4, background: 'rgba(16, 9, 32, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168, 85, 247, 0.2)', marginBottom: 20 }}>
          <button
            type="button"
            className={`btn-neon ${mode === 'login' ? 'btn-neon-primary' : 'btn-neon-secondary'}`}
            style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`btn-neon ${mode === 'register' ? 'btn-neon-primary' : 'btn-neon-secondary'}`}
            style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
            onClick={() => setMode('register')}
          >
            Create Account
          </button>
        </div>

        {mode === 'login' ? <LoginForm onSuccess={handleAuth} /> : <RegisterForm onSuccess={handleAuth} />}
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api.login(form);
      onSuccess(res.token, res.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      {err && (
        <div style={{ border: '1px solid rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: '#f87171', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
          {err}
        </div>
      )}
      <div className="field-group">
        <label className="field-label">Email Address</label>
        <input
          type="email"
          required
          placeholder="name@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="field-group">
        <label className="field-label">Password</label>
        <input
          type="password"
          required
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
      <button className="btn-neon btn-neon-primary" type="submit" disabled={loading} style={{ width: '100%', height: 44, marginTop: 8 }}>
        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In to Dashboard'}
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api.register(form);
      onSuccess(res.token, res.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      {err && (
        <div style={{ border: '1px solid rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: '#f87171', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
          {err}
        </div>
      )}
      <div className="field-group">
        <label className="field-label">Full Name</label>
        <input
          required
          placeholder="John Doe"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="field-group">
        <label className="field-label">Email Address</label>
        <input
          type="email"
          required
          placeholder="name@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="field-group">
        <label className="field-label">Password (Min 6 Characters)</label>
        <input
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
      <button className="btn-neon btn-neon-primary" type="submit" disabled={loading} style={{ width: '100%', height: 44, marginTop: 8 }}>
        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create SpendWise Account'}
      </button>
    </form>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}