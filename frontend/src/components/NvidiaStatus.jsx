const MODEL = import.meta.env.VITE_NVIDIA_MODEL ?? 'nvidia/llama-3.1-nemotron-70b-instruct';

const NvidiaStatus = () => (
  <div style={{display:'flex', alignItems:'center', gap:'8px',
    padding:'5px 12px',
    background:'rgba(118,185,0,0.08)',
    border:'1px solid rgba(118,185,0,0.22)',
    borderRadius:'var(--radius)',
    flexShrink:0,}}>
    <span style={{width:'7px', height:'7px', borderRadius:'50%',
      background:'#76b900', flexShrink:0,
      boxShadow:'0 0 6px rgba(118,185,0,0.7)',}}/>
    <div style={{display:'flex', flexDirection:'column', lineHeight:1.2}}>
      <span style={{fontSize:'10px', fontWeight:700, color:'#76b900',
        letterSpacing:'0.08em', fontFamily:'var(--font-mono)',}}>AI Engine</span>
      <span style={{fontSize:'10px', color:'var(--text-3)',
        fontFamily:'var(--font-mono)', letterSpacing:'0.02em',
        maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',}}>{MODEL}</span>
    </div>
  </div>
);
export default NvidiaStatus;
