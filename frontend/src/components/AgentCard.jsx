import React from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  AlertCircle,
  Bot,
  FileText,
  Zap,
  ShieldCheck,
  GitPullRequest,
  Cpu,
} from 'lucide-react';

const STATE_CONFIG = {
  completed: {
    label: 'Completed',
    Icon: CheckCircle2,
    color: '#76b900',
    badgeBg: 'rgba(118, 185, 0, 0.12)',
    badgeBorder: 'rgba(118, 185, 0, 0.35)',
    cardBorder: 'rgba(118, 185, 0, 0.28)',
    accentBar: '#76b900',
    spin: false,
  },
  running: {
    label: 'Running',
    Icon: Loader2,
    color: '#00c8a0',
    badgeBg: 'rgba(0, 200, 160, 0.14)',
    badgeBorder: 'rgba(0, 200, 160, 0.40)',
    cardBorder: 'rgba(0, 200, 160, 0.35)',
    accentBar: '#00c8a0',
    spin: true,
  },
  active: {
    label: 'Active',
    Icon: PlayCircle,
    color: '#00c8a0',
    badgeBg: 'rgba(0, 200, 160, 0.12)',
    badgeBorder: 'rgba(0, 200, 160, 0.32)',
    cardBorder: 'rgba(0, 200, 160, 0.25)',
    accentBar: '#00c8a0',
    spin: false,
  },
  ready: {
    label: 'Ready',
    Icon: PlayCircle,
    color: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    cardBorder: 'rgba(56, 189, 248, 0.25)',
    accentBar: '#38bdf8',
    spin: false,
  },
  failed: {
    label: 'Failed',
    Icon: AlertCircle,
    color: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.14)',
    badgeBorder: 'rgba(239, 68, 68, 0.40)',
    cardBorder: 'rgba(239, 68, 68, 0.35)',
    accentBar: '#ef4444',
    spin: false,
  },
  skipped: {
    label: 'Skipped',
    Icon: Clock,
    color: '#64748b',
    badgeBg: 'rgba(100, 116, 139, 0.12)',
    badgeBorder: 'rgba(100, 116, 139, 0.30)',
    cardBorder: 'rgba(100, 116, 139, 0.20)',
    accentBar: '#64748b',
    spin: false,
  },
  waiting: {
    label: 'Waiting',
    Icon: Clock,
    color: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.08)',
    badgeBorder: 'rgba(148, 163, 184, 0.20)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    accentBar: '#475569',
    spin: false,
  },
};

function getAgentIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('coordinator')) return Bot;
  if (n.includes('requirement')) return FileText;
  if (n.includes('impact')) return Zap;
  if (n.includes('review')) return ShieldCheck;
  if (n.includes('pr') || n.includes('pull')) return GitPullRequest;
  return Cpu;
}

const AgentCard = ({ name, role, model, state = 'waiting', tasksCompleted, accuracy }) => {
  const s = String(state || 'waiting').toLowerCase();
  const cfg = STATE_CONFIG[s] || STATE_CONFIG.waiting;
  const StatusIcon = cfg.Icon;
  const DomainIcon = getAgentIcon(name);

  return (
    <div
      style={{
        background: 'rgba(16, 22, 34, 0.90)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${cfg.cardBorder}`,
        borderTop: `2px solid ${cfg.accentBar}`,
        borderRadius: '12px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
        position: 'relative',
      }}
    >
      {/* ── Top Row: Identity & Status ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: cfg.color,
              flexShrink: 0,
            }}
          >
            <DomainIcon size={20} />
          </div>
          <div>
            <h3
              style={{
                fontSize: '15.5px',
                fontWeight: 700,
                color: '#f0f0f0',
                margin: 0,
                letterSpacing: '-0.2px',
                lineHeight: 1.25,
              }}
            >
              {name}
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: '#9ba3b0',
                margin: '4px 0 0 0',
                lineHeight: 1.4,
              }}
            >
              {role}
            </p>
          </div>
        </div>

        {/* ── Status Badge ── */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            background: cfg.badgeBg,
            border: `1px solid ${cfg.badgeBorder}`,
            color: cfg.color,
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <StatusIcon size={12} className={cfg.spin ? 'spin' : ''} />
          <span>{cfg.label}</span>
        </div>
      </div>

      {/* ── Model Assignment Tag ── */}
      {model && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            fontSize: '11.5px',
            fontFamily: 'var(--font-mono)',
            color: '#c0c8d0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: 'fit-content',
            maxWidth: '100%',
          }}
          title={model}
        >
          <Cpu size={12} color="#76b900" style={{ flexShrink: 0 }} />
          <span style={{ color: '#76b900', fontWeight: 600 }}>NIM:</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{model}</span>
        </div>
      )}

      {/* ── Metrics Footer ── */}
      {(tasksCompleted !== undefined || accuracy) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            paddingTop: '12px',
            marginTop: '2px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {tasksCompleted !== undefined && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7a8d',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Tasks Executed
              </span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#f0f0f0',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {tasksCompleted}
              </span>
            </div>
          )}

          {accuracy && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7a8d',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Benchmark Accuracy
              </span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#76b900',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {accuracy}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentCard;
