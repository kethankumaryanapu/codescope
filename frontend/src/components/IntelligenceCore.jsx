import { useAnalysis } from '../context/AnalysisContext';

const AGENTS = [
  { id: 'coordinator', label: 'Coordinator', angle: 270, workflowKey: 'coordinator' },
  { id: 'requirement', label: 'Requirement', angle: 342, workflowKey: 'requirement' },
  { id: 'impact',      label: 'Impact',      angle: 54,  workflowKey: 'impact' },
  { id: 'review',      label: 'Review',      angle: 126, workflowKey: 'review' },
  { id: 'pr',          label: 'PR',          angle: 198, workflowKey: 'pr' },
];

function stateColor(state) {
  if (!state) return '#2a2a2a';
  const s = String(state).toLowerCase();
  if (s === 'running') return '#76b900';
  if (s === 'completed') return '#76b900';
  if (s === 'ready') return '#4a9eff';
  if (s === 'failed') return '#cc3333';
  return '#333333';
}

function stateTextColor(state) {
  if (!state) return '#606060';
  const s = String(state).toLowerCase();
  if (s === 'running' || s === 'completed') return '#76b900';
  if (s === 'ready') return '#4a9eff';
  if (s === 'failed') return '#cc3333';
  return '#606060';
}

const IntelligenceCore = ({ size = 380 }) => {
  const { workflow, isAnalyzing, isReviewing } = useAnalysis();
  const cx = size / 2;
  const cy = size / 2;
  const orbitR = size * 0.34;
  const nodeR = 22;
  const coreR = size * 0.1;
  const progress = workflow?.progress ?? 0;
  const circumference = 2 * Math.PI * (coreR + 18);
  const dashOffset = circumference * (1 - progress / 100);
  const isActive = isAnalyzing || isReviewing;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{overflow: 'visible', display: 'block', margin: '0 auto'}}
    >
      <defs>
        <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isActive ? '#76b900' : '#333'} stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0"/>
        </radialGradient>
        <style>{`
          @keyframes dashFlow {
            to { stroke-dashoffset: -20; }
          }
          @keyframes corePulse {
            0%,100% { opacity:0.6; }
            50% { opacity:1; }
          }
          @keyframes coreGlowPulse {
            0%,100% { opacity:0.2; }
            50% { opacity:0.5; }
          }
          .agent-running-line { animation: dashFlow 0.8s linear infinite; }
          .core-pulse { animation: corePulse 2s ease-in-out infinite; }
          .core-glow { animation: coreGlowPulse 2s ease-in-out infinite; }
        `}</style>
      </defs>

      <circle cx={cx} cy={cy} r={orbitR} fill="none" stroke="#1e1e1e" strokeWidth="1"/>

      <circle cx={cx} cy={cy} r={coreR + 18} fill="none" stroke="#1e1e1e" strokeWidth="3"/>
      <circle
        cx={cx} cy={cy} r={coreR + 18}
        fill="none"
        stroke="#76b900"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{transition: 'stroke-dashoffset 0.6s ease'}}
      />

      <circle cx={cx} cy={cy} r={coreR + 24} fill="url(#coreGrad)" className={isActive ? 'core-glow' : ''}/>

      <circle
        cx={cx} cy={cy}
        r={coreR}
        fill={isActive ? 'rgba(118,185,0,0.12)' : '#141414'}
        stroke={isActive ? '#76b900' : '#2a2a2a'}
        strokeWidth={isActive ? '1.5' : '1'}
        className={isActive ? 'core-pulse' : ''}
        filter={isActive ? 'url(#greenGlow)' : undefined}
      />

      <text x={cx} y={cy - 6} textAnchor="middle" fill={isActive ? '#76b900' : '#606060'} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)" letterSpacing="1">
        IMPACT
      </text>
      <text x={cx} y={cy + 7} textAnchor="middle" fill={isActive ? '#76b900' : '#606060'} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)" letterSpacing="1">
        IQ
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fill={isActive ? '#76b900' : '#2a2a2a'} fontSize="7" fontFamily="var(--font-mono)">
        {isActive ? 'PROCESSING' : `${progress}%`}
      </text>

      {AGENTS.map((agent) => {
        const rad = (agent.angle * Math.PI) / 180;
        const nx = cx + orbitR * Math.cos(rad);
        const ny = cy + orbitR * Math.sin(rad);
        const state = workflow?.[agent.workflowKey];
        const color = stateColor(state);
        const textColor = stateTextColor(state);
        const isRunning = String(state).toLowerCase() === 'running';
        const isCompleted = String(state).toLowerCase() === 'completed';

        const dx = nx - cx;
        const dy = ny - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const lx1 = cx + (coreR / dist) * dx;
        const ly1 = cy + (coreR / dist) * dy;
        const lx2 = nx - (nodeR / dist) * dx;
        const ly2 = ny - (nodeR / dist) * dy;

        return (
          <g key={agent.id}>
            <line
              x1={lx1} y1={ly1} x2={lx2} y2={ly2}
              stroke={isRunning || isCompleted ? '#76b900' : '#1e1e1e'}
              strokeWidth={isRunning ? '1.5' : '1'}
              strokeDasharray={isRunning ? '4 4' : isCompleted ? 'none' : '2 4'}
              className={isRunning ? 'agent-running-line' : undefined}
              opacity={isCompleted ? 0.6 : 1}
            />
            <circle
              cx={nx} cy={ny} r={nodeR}
              fill={isCompleted ? 'rgba(118,185,0,0.15)' : '#141414'}
              stroke={color}
              strokeWidth={isRunning ? '2' : '1.5'}
              filter={isRunning ? 'url(#greenGlow)' : undefined}
            />
            <text x={nx} y={ny + 1} textAnchor="middle" dominantBaseline="middle"
              fill={textColor} fontSize="8" fontWeight="700" fontFamily="var(--font-mono)" letterSpacing="0.5">
              {agent.label.toUpperCase()}
            </text>
            <text x={nx} y={ny + nodeR + 11} textAnchor="middle"
              fill={textColor} fontSize="7.5" fontFamily="var(--font-mono)" opacity="0.9">
              {state || 'WAITING'}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default IntelligenceCore;
