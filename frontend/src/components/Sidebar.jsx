import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Zap, FolderTree, Bot,
  Code2, GitPullRequest, BarChart3, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to:'/dashboard',       icon:LayoutDashboard, title:'Dashboard' },
  { to:'/requirements',    icon:FileText,         title:'Requirements' },
  { to:'/impact-analysis', icon:Zap,              title:'Impact Analysis' },
  { to:'/files',           icon:FolderTree,       title:'Files' },
  { to:'/agents',          icon:Bot,              title:'Agents' },
  { to:'/code-review',     icon:Code2,            title:'Code Review' },
  { to:'/pr-generator',    icon:GitPullRequest,   title:'PR Generator' },
  { to:'/analytics',       icon:BarChart3,        title:'Analytics' },
  { to:'/settings',        icon:Settings,         title:'Settings' },
];

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{position:'fixed', top:'48px', left:0, bottom:0,
      width:'56px',
      background:'var(--surface)',
      borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column',
      alignItems:'center',
      paddingTop:'8px', paddingBottom:'8px',
      zIndex:100,
      gap:'2px',}}>
      <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', width:'100%'}}>
        {NAV.map(({ to, icon: Icon, title }) => (
          <NavLink
            key={to}
            to={to}
            title={title}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', justifyContent:'center',
              width:'100%', height:'48px',
              color: isActive ? '#76b900' : 'var(--text-3)',
              borderLeft: isActive ? '3px solid #76b900' : '3px solid transparent',
              background: isActive ? 'rgba(118,185,0,0.08)' : 'transparent',
              textDecoration:'none',
              transition:'color 0.15s, background 0.15s',
              flexShrink:0,
            })}
          >
            <Icon size={18} />
          </NavLink>
        ))}
      </div>
      <button
        onClick={handleLogout}
        title="Logout"
        style={{display:'flex', alignItems:'center', justifyContent:'center',
          width:'100%', height:'48px',
          color:'var(--text-3)', background:'transparent',
          border:'none', cursor:'pointer',
          transition:'color 0.15s',}}
        onMouseEnter={e => e.currentTarget.style.color='#cc3333'}
        onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}
      >
        <LogOut size={18} />
      </button>
    </nav>
  );
};

export default Sidebar;
