import { Check, Circle, AlertCircle } from 'lucide-react';

const STEPS = [
  { key: 'requirement', label: 'Requirement' },
  { key: 'impact',      label: 'Impact Analysis' },
  { key: 'review',      label: 'Code Review' },
  { key: 'pr',          label: 'PR Ready' },
];

const PipelineStatus = ({ workflow }) => {
  const getState = (key) => {
    const s = String(workflow?.[key] || 'waiting').toLowerCase();
    return s;
  };

  return (
    <div style={{display:'flex', alignItems:'center', gap:'0', width:'100%'}}>
      {STEPS.map((step, idx) => {
        const s = getState(step.key);
        const isCompleted = s === 'completed';
        const isRunning = s === 'running';
        const isFailed = s === 'failed';
        const color = isCompleted ? '#76b900' : isRunning ? '#4a9eff' : isFailed ? '#cc3333' : '#2a2a2a';
        const textColor = isCompleted ? '#76b900' : isRunning ? '#4a9eff' : isFailed ? '#cc3333' : '#606060';

        return (
          <div key={step.key} style={{display:'flex', alignItems:'center', flex:1}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
              <div style={{
                width:'28px', height:'28px', borderRadius:'50%',
                background: isCompleted ? 'rgba(118,185,0,0.15)' : 'var(--surface-2)',
                border:`1.5px solid ${color}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                {isCompleted ? <Check size={13} color="#76b900"/> :
                 isFailed ? <AlertCircle size={13} color="#cc3333"/> :
                 isRunning ? <span style={{width:'8px', height:'8px', borderRadius:'50%',
                   background:'#4a9eff', boxShadow:'0 0 8px #4a9eff',}}/> :
                 <Circle size={10} color={color}/>}
              </div>
              <span style={{fontSize:'10px', color:textColor, fontWeight:600,
                fontFamily:'var(--font-mono)', whiteSpace:'nowrap', letterSpacing:'0.03em',}}>{step.label.toUpperCase()}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{flex:1, height:'1px',
                background: isCompleted ? '#76b900' : '#1e1e1e',
                margin:'0 4px', marginBottom:'18px',
                transition:'background 0.3s',}}/>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PipelineStatus;
