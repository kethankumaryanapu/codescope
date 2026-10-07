const RISK_COLORS = {
  high:     { bg:'rgba(204,51,51,0.1)',  border:'rgba(204,51,51,0.3)',  text:'#cc3333' },
  medium:   { bg:'rgba(230,126,0,0.1)', border:'rgba(230,126,0,0.3)', text:'#e67e00' },
  low:      { bg:'rgba(118,185,0,0.1)', border:'rgba(118,185,0,0.3)', text:'#76b900' },
  critical: { bg:'rgba(204,51,51,0.15)', border:'rgba(204,51,51,0.5)', text:'#ff4444' },
};

const ImpactFileList = ({ files = [] }) => {
  if (!files.length) return (
    <div style={{padding:'24px', textAlign:'center', color:'var(--text-3)', fontSize:'12px', fontFamily:'var(--font-mono)'}}>
      No impacted files. Run impact analysis to see results.
    </div>
  );

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
      {files.map((file, idx) => {
        const risk = String(file.risk || file.risk_level || 'medium').toLowerCase();
        const c = RISK_COLORS[risk] || RISK_COLORS.medium;
        const path = file.file || file.file_path || file.filePath || file.rootPath || '';
        const module = file.module || file.chunk_type || '';
        const reason = file.reason || '';

        return (
          <div key={idx} style={{
            display:'flex', alignItems:'flex-start',
            gap:'10px', padding:'10px 12px',
            background:'var(--surface)',
            border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)',
            borderLeft:`3px solid ${c.text}`,
          }}>
            <span style={{
              fontSize:'9px', fontWeight:700, letterSpacing:'0.08em',
              color:c.text, background:c.bg, border:`1px solid ${c.border}`,
              borderRadius:'3px', padding:'2px 6px',
              fontFamily:'var(--font-mono)', textTransform:'uppercase',
              flexShrink:0, marginTop:'1px',
            }}>{risk}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:'12px', fontFamily:'var(--font-mono)',
                color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',}}>{path}</div>
              {module && <div style={{fontSize:'10px', color:'var(--text-3)', marginTop:'2px'}}>{module}</div>}
              {reason && <div style={{fontSize:'11px', color:'var(--text-2)', marginTop:'3px',
                overflow:'hidden', textOverflow:'ellipsis',
                display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',}}>{reason}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ImpactFileList;
