import React from 'react';
import {
  CheckCircle2,
  Clock3,
  Loader2,
  AlertCircle,
  PlayCircle,
  Cpu,
  Layers,
} from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';

const STEP_CONFIG = {
  Completed: {
    icon: CheckCircle2,
    color: '#76b900',
    badgeBg: 'rgba(118, 185, 0, 0.12)',
    badgeBorder: 'rgba(118, 185, 0, 0.35)',
    spin: false,
  },
  Running: {
    icon: Loader2,
    color: '#00c8a0',
    badgeBg: 'rgba(0, 200, 160, 0.14)',
    badgeBorder: 'rgba(0, 200, 160, 0.40)',
    spin: true,
  },
  Ready: {
    icon: PlayCircle,
    color: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    spin: false,
  },
  Failed: {
    icon: AlertCircle,
    color: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.14)',
    badgeBorder: 'rgba(239, 68, 68, 0.40)',
    spin: false,
  },
  Skipped: {
    icon: Clock3,
    color: '#64748b',
    badgeBg: 'rgba(100, 116, 139, 0.12)',
    badgeBorder: 'rgba(100, 116, 139, 0.30)',
    spin: false,
  },
  Waiting: {
    icon: Clock3,
    color: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.08)',
    badgeBorder: 'rgba(148, 163, 184, 0.18)',
    spin: false,
  },
};

const AIStatus = () => {
  const { workflow } = useAnalysis();

  const getStepState = (status) => {
    return STEP_CONFIG[status] || STEP_CONFIG.Waiting;
  };

  const steps = [
    { name: 'Coordinator Agent', status: workflow?.coordinator || 'Waiting' },
    { name: 'Requirement Agent', status: workflow?.requirement || 'Waiting' },
    { name: 'Impact Agent', status: workflow?.impact || 'Waiting' },
    { name: 'Review Agent', status: workflow?.review || 'Waiting' },
    { name: 'PR Generator Agent', status: workflow?.pr || 'Waiting' },
  ];

  const completedCount = steps.filter((s) => s.status === 'Completed').length;
  const progress = workflow?.progress ?? Math.round((completedCount / steps.length) * 100);

  return (
    <div
      style={{
        background: 'rgba(16, 22, 34, 0.90)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '12px',
        padding: '22px 20px',
        border: '1px solid rgba(118, 185, 0, 0.22)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          paddingBottom: '14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={16} color="#76b900" />
          <h2
            style={{
              fontSize: '13px',
              margin: 0,
              color: '#f0f0f0',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            AI Agent Workflow
          </h2>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: '#76b900',
            background: 'rgba(118, 185, 0, 0.10)',
            border: '1px solid rgba(118, 185, 0, 0.25)',
            borderRadius: '999px',
            padding: '3px 9px',
            letterSpacing: '0.04em',
          }}
        >
          {completedCount} / {steps.length} Steps
        </span>
      </div>

      {/* ── Workflow Steps ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map((step, index) => {
          const cfg = getStepState(step.status);
          const Icon = cfg.icon;

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '11px 13px',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon
                  size={15}
                  color={cfg.color}
                  className={cfg.spin ? 'spin' : ''}
                  style={{ flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#e2e8f0',
                    letterSpacing: '-0.1px',
                  }}
                >
                  {step.name}
                </span>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: cfg.badgeBg,
                  border: `1px solid ${cfg.badgeBorder}`,
                  color: cfg.color,
                  fontWeight: 700,
                  fontSize: '10.5px',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                {step.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Pipeline Progress Bar ── */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              color: '#8b949e',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Pipeline Progress
          </span>
          <span
            style={{
              color: '#76b900',
              fontWeight: 700,
              fontSize: '13.5px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {progress}%
          </span>
        </div>

        <div
          style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #76b900 0%, #00c8a0 100%)',
              borderRadius: '999px',
              boxShadow: '0 0 12px rgba(118, 185, 0, 0.4)',
              transition: 'width 0.5s ease-in-out',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AIStatus;
