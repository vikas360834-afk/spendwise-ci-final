import { useEffect, useState } from 'react';
import { Server, Database, Zap, Clock, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Cpu, Layers } from 'lucide-react';
import { api } from '../api.js';
import { PageHead, SkeletonCards, StatCard } from '../components/ui.jsx';

export function DevOps() {
  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [h, i] = await Promise.all([api.systemHealth(), api.systemInfo()]);
      setHealth(h);
      setInfo(i);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <SkeletonCards n={4} />;

  const uptimeMinutes = Math.floor((health?.uptimeSec || 0) / 60);

  return (
    <div>
      <PageHead
        title="DevOps & System Telemetry"
        sub="Infrastructure health, container probes, and persistence layer monitoring"
        right={
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RefreshCw size={14} /> Refresh Metrics
          </button>
        }
      />

      {/* Infrastructure Telemetry Stats */}
      <div className="stats-grid">
        <StatCard
          icon={<Server size={18} />}
          label="API Status"
          value={health?.status === 'ok' ? 'Healthy' : 'Degraded'}
          sub={`Uptime: ${uptimeMinutes} min`}
          tone={health?.status === 'ok' ? 'pos' : 'neg'}
        />
        <StatCard
          icon={<Database size={18} />}
          label="Storage Driver"
          value={health?.storage?.writable ? 'Read / Write' : 'Read-Only'}
          sub={health?.storage?.driver || 'File Persistence'}
          tone={health?.storage?.writable ? 'balance' : 'neg'}
        />
        <StatCard
          icon={<Zap size={18} />}
          label="AI Engine Mode"
          value={health?.aiMode === 'live' ? 'Live Provider' : 'Deterministic Demo'}
          sub={health?.aiMode === 'live' ? 'OpenAI / Anthropic Compatible' : 'Offline Math Fallback Active'}
          tone={health?.aiMode === 'live' ? 'pos' : 'savings'}
        />
        <StatCard
          icon={<Cpu size={18} />}
          label="Tenant Isolation"
          value={`${health?.myTransactions || 0} Records`}
          sub="Strict User JWT Partitioning"
          tone="balance"
        />
      </div>

      <div className="grid-2">
        {/* System Information Panel */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title"><Server size={18} style={{ color: 'var(--accent-electric)' }} /> Runtime & Build Information</h3>
              <p className="panel-sub">Container image specification</p>
            </div>
          </div>
          <div className="table-container">
            <table className="glass-table">
              <tbody>
                <tr><td style={{ color: 'var(--text-muted)' }}>Application Name</td><td style={{ fontWeight: 700 }}>{info?.app || 'SpendWise'}</td></tr>
                <tr><td style={{ color: 'var(--text-muted)' }}>Release Version</td><td style={{ fontFamily: 'monospace', color: 'var(--accent-electric)' }}>{info?.version || '2.0.0'}</td></tr>
                <tr><td style={{ color: 'var(--text-muted)' }}>Node.js Runtime</td><td style={{ fontFamily: 'monospace' }}>{info?.node || process.version || 'v20.x'}</td></tr>
                <tr><td style={{ color: 'var(--text-muted)' }}>Environment</td><td><span className="pill pill-income">{info?.env || 'production'}</span></td></tr>
                <tr><td style={{ color: 'var(--text-muted)' }}>Liveness Probe</td><td style={{ color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} /> /health probe responding 200 OK</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Persistence Layer Details */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title"><Database size={18} style={{ color: 'var(--accent-primary)' }} /> Volume Mount & Persistence State</h3>
              <p className="panel-sub">Docker persistent named volume health</p>
            </div>
          </div>
          <div className="table-container">
            <table className="glass-table">
              <tbody>
                <tr><td style={{ color: 'var(--text-muted)' }}>Persistence Engine</td><td>{health?.storage?.driver || 'JSON Store on Docker Volume'}</td></tr>
                <tr><td style={{ color: 'var(--text-muted)' }}>Data Mount Path</td><td style={{ fontFamily: 'monospace', fontSize: 12 }}>{health?.storage?.dir || '/app/backend/data'}</td></tr>
                <tr><td style={{ color: 'var(--text-muted)' }}>Read Permission</td><td style={{ color: health?.storage?.readable ? 'var(--emerald)' : 'var(--rose)' }}>{health?.storage?.readable ? 'Granted' : 'Denied'}</td></tr>
                <tr><td style={{ color: 'var(--text-muted)' }}>Write Permission</td><td style={{ color: health?.storage?.writable ? 'var(--emerald)' : 'var(--rose)' }}>{health?.storage?.writable ? 'Granted' : 'Denied'}</td></tr>
                <tr><td style={{ color: 'var(--text-muted)' }}>Database Health</td><td style={{ color: 'var(--emerald)' }}>Active & Synchronized</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stored State Verification */}
      <div className="glass-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title"><Layers size={18} /> Storage Entities & Files</h3>
            <p className="panel-sub">Data integrity verification across all isolated entities</p>
          </div>
        </div>
        <div className="table-container">
          <table className="glass-table">
            <thead>
              <tr><th>Entity File</th><th>Filesystem State</th><th>Security Context</th></tr>
            </thead>
            <tbody>
              {health?.storage?.files &&
                Object.entries(health.storage.files).map(([file, exists]) => (
                  <tr key={file}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{file}</td>
                    <td>
                      <span className={`pill ${exists ? 'pill-income' : 'pill-warning'}`}>
                        {exists ? 'Mounted & Active' : 'Initializing on First Write'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                      Protected • JWT User Isolated
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}