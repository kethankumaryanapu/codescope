const STATE_COLORS = {
  running:   { border:'#76b900', text:'#76b900', bg:'rgba(118,185,0,0.08)' },
  completed: { border:'#76b900', text:'#76b900', bg:'rgba(118,185,0,0.05)' },
  ready:     { border:'#4a9eff', text:'#4a9eff', bg:'rgba(74,158,255,0.06)' },
  failed:    { border:'#cc3333', text:'#cc3333', bg:'rgba(204,51,51,0.08)' },
  waiting:   { border:'#2a2a2a', text:'#606060', bg:'transparent' },
};

const AgentCard = ({ name, role, model, state = 'waiting', tasksCompleted, accuracy }) => {
  const s = String(state).toLowerCase();
  const c = STATE_COLORS[s] || STATE_COLORS.waiting;
  const isRunning = s === 'running';

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius:'var(--radius)',
      padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:'8px',
      transition:'border-color 0.2s',
    }}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontSize:'11px', fontWeight:700, color: c.text,
          fontFamily:'var(--font-mono)', letterSpacing:'0.06em',}}>{name.toUpperCase()}</span>
        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
          <span style={{
            width:'7px', height:'7px', borderRadius:'50%',
            background: c.border, flexShrink:0,
            boxShadow: isRunning ? `0 0 8px ${c.border}` : 'none',
          }}/>
          <span style={{fontSize:'10px', fontWeight:600, color: c.text,
            fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.05em',}}>{state}</span>
        </div>
      </div>
      <p style={{fontSize:'11px', color:'var(--text-3)', margin:0, lineHeight:1.4}}>{role}</p>
      {model && <span style={{fontSize:'10px', color:'var(--text-3)',
        fontFamily:'var(--font-mono)', borderTop:'1px solid var(--border)', paddingTop:'6px',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',}}>{model}</span>}
      {(tasksCompleted !== undefined || accuracy) && (
        <div style={{display:'flex', gap:'16px', marginTop:'2px'}}>
          {tasksCompleted !== undefined && (
            <div>
              <div style={{fontSize:'14px', fontWeight:700, color:'var(--text)', fontFamily:'var(--font-mono)'}}>{tasksCompleted}</div>
              <div style={{fontSize:'10px', color:'var(--text-3)'}}>tasks</div>
            </div>
          )}
          {accuracy && (
            <div>
              <div style={{fontSize:'14px', fontWeight:700, color:'var(--nvidia)', fontFamily:'var(--font-mono)'}}>{accuracy}</div>
              <div style={{fontSize:'10px', color:'var(--text-3)'}}>accuracy</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentCard;
