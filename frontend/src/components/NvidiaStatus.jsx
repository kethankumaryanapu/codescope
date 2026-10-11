/* AI Engine connection status — no vendor branding in visible UI */
const NvidiaStatus = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '5px 12px',
    background: 'rgba(118,185,0,0.08)',
    border: '1px solid rgba(118,185,0,0.22)',
    borderRadius: 'var(--radius)',
    flexShrink: 0,
  }}>
    <span style={{
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: '#76b900',
      flexShrink: 0,
      boxShadow: '0 0 6px rgba(118,185,0,0.7)',
    }} />
    <span style={{
      fontSize: '11px',
      fontWeight: 700,
      color: '#76b900',
      letterSpacing: '0.06em',
      fontFamily: 'var(--font-mono)',
      whiteSpace: 'nowrap',
    }}>
      AI Engine
    </span>
  </div>
);

export default NvidiaStatus;
