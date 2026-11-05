import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Trash2, Loader2, Copy, Bot, Check, ShieldCheck, Zap, ArrowUpRight } from 'lucide-react';
import { api } from '../api.js';
import { PageHead } from '../components/ui.jsx';

export function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('demo');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [err, setErr] = useState('');
  const endRef = useRef(null);

  const SUGGESTIONS = [
    'How much did I spend this month?',
    'What is my biggest expense category?',
    'Compare this month\'s spending with last month',
    'How much money can I save?',
    'Am I exceeding my budget?',
    'Show my spending trends',
    'Give suggestions to reduce unnecessary expenses',
  ];

  useEffect(() => {
    api.aiStatus().then((r) => setMode(r?.mode || 'demo')).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (msg) => {
    const text = (msg || input).trim();
    if (!text || loading) return;
    setInput('');
    setErr('');

    const userMsg = { role: 'user', text, time: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await api.aiChat(text);
      const aiMsg = {
        role: 'assistant',
        text: res.reply,
        time: new Date().toISOString(),
        mode: res.mode,
        warning: res.warning,
      };
      setMessages((m) => [...m, aiMsg]);
      if (res.mode) setMode(res.mode);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'I ran into an issue connecting to the financial intelligence service. Please verify your connection or retry in a moment.',
          time: new Date().toISOString(),
          mode: 'error',
        },
      ]);
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const clear = () => {
    setMessages([]);
    setErr('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 120px)' }}>
      <PageHead
        title="AI Financial Intelligence"
        sub={mode === 'live' ? 'Connected to Live LLM engine • Grounded with your real ledger' : 'Operating in Secure Offline Mode • Deterministic calculations from your real transactions'}
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-neon btn-neon-secondary" onClick={clear} disabled={!messages.length}>
              <Trash2 size={15} /> <span>Clear Chat</span>
            </button>
          </div>
        }
      />

      {err && (
        <div className="glass-card-neon" style={{ borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--neon-rose)', padding: '12px 18px', marginBottom: 16 }}>
          {err}
        </div>
      )}

      {/* Main Glass Conversation Panel */}
      <div className="glass-card-neon" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 580 }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'rgba(217, 70, 239, 0.05)',
          }}
        >
          <div className="icon-tile-gradient icon-tile-magenta" style={{ width: 44, height: 44, borderRadius: 12 }}>
            <Bot size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              SpendWise Intelligence Copilot
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: 'var(--neon-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                }}
              >
                {mode === 'live' ? 'Live AI Active' : 'Verified Math Engine'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <ShieldCheck size={14} style={{ color: 'var(--neon-emerald)' }} />
              Zero hallucination: Answers calculated strictly from your recorded income and expenses
            </div>
          </div>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto', textAlign: 'center', padding: 24, maxWidth: 640 }}>
              <div className="icon-tile-gradient icon-tile-purple" style={{ width: 68, height: 68, borderRadius: 20, marginBottom: 18 }}>
                <Bot size={34} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
                How can I assist your finances today?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
                Ask questions about your monthly burn rate, biggest spend categories, budget velocity, or personalized savings targets.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="btn-neon btn-neon-secondary"
                    style={{ padding: '8px 14px', fontSize: 12.5, borderRadius: 99 }}
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '14px 18px',
                        borderRadius: 16,
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        background: isUser
                          ? 'var(--gradient-neon)'
                          : 'rgba(28, 12, 54, 0.78)',
                        border: isUser ? 'none' : '1px solid rgba(168, 85, 247, 0.28)',
                        color: isUser ? '#ffffff' : 'var(--text-primary)',
                        boxShadow: isUser ? '0 4px 20px rgba(168, 85, 247, 0.45)' : 'none',
                      }}
                    >
                      {!isUser && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {m.mode === 'live' ? 'Live AI Model' : 'Deterministic Actuals'}
                          </span>
                          <button
                            className="icon-btn"
                            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent' }}
                            onClick={() => copyText(m.text, idx)}
                            title="Copy reply"
                          >
                            {copiedIdx === idx ? <Check size={13} style={{ color: 'var(--neon-emerald)' }} /> : <Copy size={13} />}
                          </button>
                        </div>
                      )}

                      <div>{m.text}</div>

                      <div
                        style={{
                          fontSize: 10.5,
                          color: isUser ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-dim)',
                          marginTop: 8,
                          textAlign: isUser ? 'right' : 'left',
                        }}
                      >
                        {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {m.warning && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--neon-gold)' }}>
                          {m.warning}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      padding: '12px 18px',
                      borderRadius: 14,
                      background: 'rgba(28, 12, 54, 0.78)',
                      border: '1px solid rgba(168, 85, 247, 0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: 'var(--neon-magenta)',
                      fontSize: 13,
                    }}
                  >
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Synthesizing financial telemetry...</span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(168, 85, 247, 0.16)', background: 'rgba(255, 255, 255, 0.02)', overflowX: 'auto', display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <button
                key={s}
                className="btn-neon btn-neon-secondary"
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 99 }}
                onClick={() => send(s)}
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(168, 85, 247, 0.2)', display: 'flex', gap: 10, background: 'rgba(12, 5, 24, 0.75)' }}>
          <input
            type="text"
            placeholder="Ask about spending velocity, budget limits, savings goals..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
            aria-label="Message SpendWise Assistant"
            style={{ height: 44 }}
          />
          <button
            className="btn-neon btn-neon-primary"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ width: 44, height: 44, padding: 0 }}
            aria-label="Send query"
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
