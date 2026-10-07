const StatCard = ({ label, value, unit = '', trend, color }) => (
  <div style={{background:'var(--surface)',
    border:'1px solid var(--border)',
    borderRadius:'var(--radius)',
    padding:'16px',
    display:'flex', flexDirection:'column', gap:'4px',}}>
    <span style={{fontSize:'10px', color:'var(--text-3)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase'}}>
      {label}
    </span>
    <div style={{display:'flex', alignItems:'baseline', gap:'4px'}}>
      <span style={{fontSize:'24px', fontWeight:700,
        color: color || 'var(--text)',
        fontFamily:'var(--font-mono)',
        lineHeight:1.1,}}>{value}</span>
      {unit && <span style={{fontSize:'12px', color:'var(--text-3)', fontFamily:'var(--font-mono)'}}>{unit}</span>}
    </div>
    {trend && <span style={{fontSize:'11px', color:'var(--nvidia)', marginTop:'2px'}}>{trend}</span>}
  </div>
);

export default StatCard;
