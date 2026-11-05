import { useEffect, useState } from 'react';
import { User, Palette, Download, Trash2, Shield, CheckCircle2, AlertTriangle, Key, HardDrive } from 'lucide-react';
import { api, download } from '../api.js';
import { PageHead, Confirm, Modal } from '../components/ui.jsx';

export function Settings() {
  const [settings, setSettings] = useState({
    currency: 'INR',
    theme: 'dark',
    monthlyBudgetDefault: 0,
    notifications: { budgetAlerts: true, weeklySummary: false },
  });
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('preferences');
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, u] = await Promise.all([api.getSettings(), api.me()]);
        setSettings(s);
        setProfile({ name: u.name, email: u.email });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const savePrefs = async (e) => {
    e.preventDefault();
    setErr('');
    setSuccess('');
    setSaving(true);
    try {
      await api.updateSettings({
        currency: settings.currency,
        theme: settings.theme,
        monthlyBudgetDefault: Number(settings.monthlyBudgetDefault) || 0,
        notifications: settings.notifications,
      });
      setSuccess('Preferences saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr('');
    setSuccess('');
    setSaving(true);
    try {
      await api.updateProfile({ name: profile.name });
      setSuccess('Profile display name updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await api.exportAll();
      await download(res, 'spendwise-complete-backup.json');
      setSuccess('Data exported as portable JSON');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setErr(e.message);
    }
  };

  const wipeAllData = async () => {
    try {
      await api.deleteMyData();
      setConfirmWipe(false);
      setSuccess('All your transactions, budgets, goals and recurring items have been erased.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      setErr(e.message);
    }
  };

  if (loading) {
    return (
      <div className="glass-card-neon" style={{ height: 260 }}>
        <div className="skeleton-shimmer" style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  return (
    <div>
      <PageHead title="Settings & Security" sub="Manage account credentials, display currency, theme, and data portability" />

      {success && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--neon-emerald)', padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> <span>{success}</span>
        </div>
      )}

      {err && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> <span>{err}</span>
        </div>
      )}

      <div className="glass-card-neon" style={{ maxWidth: 740, padding: 28 }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid rgba(168, 85, 247, 0.18)', paddingBottom: 16, marginBottom: 22 }}>
          <button
            className={`btn-neon ${activeTab === 'preferences' ? 'btn-neon-primary' : 'btn-neon-secondary'}`}
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => setActiveTab('preferences')}
          >
            <Palette size={15} /> <span>Preferences</span>
          </button>
          <button
            className={`btn-neon ${activeTab === 'profile' ? 'btn-neon-primary' : 'btn-neon-secondary'}`}
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => setActiveTab('profile')}
          >
            <User size={15} /> <span>Profile & Identity</span>
          </button>
          <button
            className={`btn-neon ${activeTab === 'data' ? 'btn-neon-primary' : 'btn-neon-secondary'}`}
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => setActiveTab('data')}
          >
            <HardDrive size={15} /> <span>Data & Privacy</span>
          </button>
        </div>

        {activeTab === 'preferences' && (
          <form onSubmit={savePrefs} style={{ display: 'grid', gap: 18, maxWidth: 480 }}>
            <div className="field-group">
              <label className="field-label">Base Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              >
                <option value="INR">Indian Rupee (₹ INR)</option>
                <option value="USD">US Dollar ($ USD)</option>
                <option value="EUR">Euro (€ EUR)</option>
                <option value="GBP">British Pound (£ GBP)</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Default Theme Mode</label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              >
                <option value="dark">Dark Futuristic Purple Glassmorphism</option>
                <option value="light">Crisp Light Mode</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Default Monthly Spending Target (₹)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={settings.monthlyBudgetDefault}
                onChange={(e) => setSettings({ ...settings, monthlyBudgetDefault: Number(e.target.value) || 0 })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="submit" className="btn-neon btn-neon-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={saveProfile} style={{ display: 'grid', gap: 18, maxWidth: 480 }}>
            <div className="field-group">
              <label className="field-label">Full Name</label>
              <input
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Email Address (Read-only)</label>
              <input
                disabled
                value={profile.email}
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="submit" className="btn-neon btn-neon-primary" disabled={saving || !profile.name.trim()}>
                {saving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'data' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Export Complete Account Backup</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                Download your complete JSON archive containing all transactions, category budgets, savings goals, and recurring payment rules.
              </p>
              <button className="btn-neon btn-neon-secondary" onClick={handleExportBackup}>
                <Download size={16} /> <span>Export JSON Archive</span>
              </button>
            </div>

            <div style={{ paddingTop: 20, borderTop: '1px solid rgba(168, 85, 247, 0.18)' }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--neon-rose)', marginBottom: 6 }}>Danger Zone: Reset Account Data</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                Permanently deletes all your transaction entries, budgets, and goals. Your login credentials and account profile will remain active.
              </p>
              <button
                className="btn-neon"
                style={{ background: 'var(--neon-rose)', color: '#fff', boxShadow: '0 4px 18px rgba(244, 63, 94, 0.4)' }}
                onClick={() => setConfirmWipe(true)}
              >
                <Trash2 size={16} /> <span>Erase All Financial Records</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmWipe && (
        <Confirm
          title="Permanently Erase Financial Data?"
          body="This action will delete all recorded transactions, categories, budgets, and savings goals from your account. This cannot be undone."
          confirmLabel="Erase Everything"
          onConfirm={wipeAllData}
          onCancel={() => setConfirmWipe(false)}
        />
      )}
    </div>
  );
}
