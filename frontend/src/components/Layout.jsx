import { useState, useRef, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Target,
  BarChart3,
  Bot,
  Settings,
  PiggyBank,
  FolderTree,
  Repeat,
  FileText,
  Sparkles,
  Menu,
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  Search,
  Sun,
  Moon,
  LogOut,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  UserCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { todayYM, monthLabel } from '../lib/format.js';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'goals', label: 'Savings Goals', icon: PiggyBank },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'ai', label: 'AI Assistant', icon: Bot },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ current, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();

  const handleNav = (id) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 2, 12, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 40,
          }}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`floating-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Minimal Glowing Brand Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <span>₹</span>
          </div>
          <div>
            <div className="sidebar-logo-text">SpendWise</div>
            <div className="sidebar-logo-badge">Neon Fintech</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = current === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.id)}
                title={item.label}
              >
                <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                <span className="sidebar-link-text">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile Avatar & Collapse Toggle at Bottom */}
        <div className="sidebar-footer">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(168, 85, 247, 0.18)',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--gradient-neon)',
                boxShadow: 'var(--neon-glow-magenta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="sidebar-footer-text" style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Explorer'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || 'Logged In'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="icon-btn"
              style={{ width: 28, height: 28, padding: 0, borderRadius: 8 }}
            >
              <LogOut size={13} />
            </button>
          </div>

          <button
            className="btn-neon btn-neon-secondary"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ width: '100%', height: 32, padding: 0, borderRadius: 8, fontSize: 12 }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}

export function Topbar({
  onMenu,
  mobileOpen,
  searchValue,
  onSearchChange,
  onOpenAddExpense,
  onNavigate,
  selectedMonth,
  onMonthChange,
}) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Budget Velocity Alert', desc: 'Entertainment has consumed 88% of limit.', type: 'warn', time: '12m ago' },
    { id: 2, title: 'Upcoming Subscription', desc: 'WiFi bill of ₹1,299 due in 3 days.', type: 'info', time: '1h ago' },
    { id: 3, title: 'Savings Milestone', desc: 'Personal savings rate reached 24% this period.', type: 'success', time: 'Yesterday' },
  ]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date());
  }, []);

  const dismissNotif = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="topbar-futuristic" role="banner">
      {/* Mobile Menu Trigger */}
      <button
        className="btn-neon btn-neon-secondary"
        onClick={onMenu}
        aria-label="Toggle Navigation"
        style={{ width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Menu size={18} />
      </button>

      {/* Personalized Welcome Banner with live date */}
      <div style={{ display: 'none', minWidth: 200 }} className="welcome-banner">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{greeting}, <span style={{ color: 'var(--neon-magenta)' }}>{user?.name || 'Explorer'}</span></span>
          <span style={{ fontSize: 16 }}>👋</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
          <Calendar size={12} style={{ color: 'var(--neon-cyan)' }} />
          <span>{todayStr} • {monthLabel(selectedMonth || todayYM())}</span>
        </div>
      </div>

      {/* Neon Global Search Control */}
      <div className="search-neon">
        <Search size={16} />
        <input
          type="search"
          placeholder="Search transactions, categories, tags..."
          value={searchValue}
          onChange={onSearchChange}
          aria-label="Global ledger search"
        />
        <span className="search-kbd-badge">/</span>
      </div>

      {/* Topbar Actions */}
      <div className="topbar-actions">
        {/* Prominent Add Transaction CTA */}
        <button
          className="btn-neon btn-neon-primary"
          onClick={onOpenAddExpense}
          title="Record transaction"
          style={{ height: 40 }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Transaction</span>
        </button>

        {/* Notification Bell with interactive drawer */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="btn-neon btn-neon-secondary"
            style={{ width: 40, height: 40, padding: 0, position: 'relative' }}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 17,
                  height: 17,
                  borderRadius: '50%',
                  background: 'var(--neon-magenta)',
                  boxShadow: 'var(--neon-glow-magenta)',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {notifications.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="ai-chat-drawer"
              style={{
                width: 340,
                height: 'auto',
                maxHeight: 380,
                bottom: 'auto',
                top: 52,
                right: 0,
                zIndex: 60,
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(217, 70, 239, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={15} style={{ color: 'var(--neon-magenta)' }} />
                  <span style={{ fontWeight: 800, fontSize: 13.5 }}>Neon Alerts</span>
                </div>
                {notifications.length > 0 ? (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: 'rgba(217, 70, 239, 0.2)',
                      color: 'var(--neon-magenta)',
                    }}
                  >
                    {notifications.length} active
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>All caught up</span>
                )}
              </div>

              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                    No unread telemetry notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(168, 85, 247, 0.16)',
                        display: 'flex',
                        gap: 10,
                        position: 'relative',
                      }}
                    >
                      {n.type === 'warn' && <AlertTriangle size={16} style={{ color: 'var(--neon-magenta)', flexShrink: 0, marginTop: 2 }} />}
                      {n.type === 'info' && <Clock size={16} style={{ color: 'var(--neon-cyan)', flexShrink: 0, marginTop: 2 }} />}
                      {n.type === 'success' && <CheckCircle2 size={16} style={{ color: 'var(--neon-emerald)', flexShrink: 0, marginTop: 2 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{n.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{n.desc}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{n.time}</div>
                      </div>
                      <button
                        onClick={() => dismissNotif(n.id)}
                        className="icon-btn"
                        style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'transparent' }}
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar with drop-down */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="btn-neon btn-neon-secondary"
            style={{ width: 40, height: 40, padding: 0, borderRadius: '50%', overflow: 'hidden' }}
            aria-label="User Profile"
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'var(--gradient-neon)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </button>

          {profileOpen && (
            <div
              className="ai-chat-drawer"
              style={{
                width: 240,
                height: 'auto',
                bottom: 'auto',
                top: 52,
                right: 0,
                zIndex: 60,
                padding: '14px',
              }}
            >
              <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(168, 85, 247, 0.18)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user?.name || 'Explorer'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
              </div>
              <button
                className="sidebar-link"
                style={{ padding: '8px 10px', fontSize: 12.5 }}
                onClick={() => {
                  setProfileOpen(false);
                  if (onNavigate) onNavigate('settings');
                }}
              >
                <Settings size={15} />
                <span>Account Settings</span>
              </button>
              <button
                className="sidebar-link"
                style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--neon-rose)', marginTop: 4 }}
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Theme Mode Toggle */}
        <button
          className="btn-neon btn-neon-secondary"
          style={{ width: 40, height: 40, padding: 0 }}
          onClick={toggle}
          aria-label="Toggle Theme"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .welcome-banner { display: block !important; }
        }
      `}</style>
    </header>
  );
}

export function MobileBottomBar({ current, onNavigate }) {
  const items = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Ledger', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'ai', label: 'Copilot', icon: Bot },
  ];

  return (
    <nav className="mobile-bottom-bar" role="navigation" aria-label="Mobile navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            className={`mobile-bottom-link ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}