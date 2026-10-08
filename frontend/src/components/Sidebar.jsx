import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FolderTree,
  FileText,
  Bot,
  Zap,
  Code2,
  GitPullRequest,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import './sidebar.css';

/* ── Navigation structure ── */
const NAV_GROUPS = [
  {
    label: 'WORKSPACE',
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Workspace Hub' },
      { to: '/files',      icon: FolderTree,       label: 'Codebase' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { to: '/requirements',   icon: FileText,      label: 'Requirements' },
      { to: '/agents',         icon: Bot,           label: 'Agents' },
      { to: '/impact-analysis', icon: Zap,          label: 'Impact Analysis' },
    ],
  },
  {
    label: 'REVIEW & DELIVERY',
    items: [
      { to: '/code-review',   icon: Code2,          label: 'Code Review' },
      { to: '/pr-generator',  icon: GitPullRequest, label: 'PR Generator' },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
];

const BOTTOM_ITEMS = [
  { to: '/settings', icon: Settings, label: 'Settings' },
];

/* ── Sidebar component ── */
const Sidebar = () => {
  const { isExpanded, toggle, isMobileOpen, toggleMobile } = useSidebar();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarClass =
    'sidebar' +
    (!isExpanded ? ' collapsed' : '') +
    (isMobileOpen ? ' mobile-open' : '');

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleMobile}
          aria-hidden="true"
        />
      )}

      <nav className={sidebarClass} aria-label="Main navigation">
        {/* ── Logo area ── */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" aria-hidden="true">
            IQ
          </div>
          <span className="sidebar-logo-text">
            Impact<span>IQ</span>
          </span>
        </div>

        {/* ── Scrollable nav groups ── */}
        <div className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="sidebar-group">
              <div className="sidebar-group-label">{group.label}</div>
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    'sidebar-item' + (isActive ? ' active' : '')
                  }
                  onClick={isMobileOpen ? toggleMobile : undefined}
                >
                  <span className="sidebar-item-indicator" aria-hidden="true" />
                  <span className="sidebar-item-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span className="sidebar-item-label">{label}</span>
                  <span className="sidebar-tooltip" aria-hidden="true">
                    {label}
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* ── Bottom pinned section ── */}
        <div className="sidebar-bottom">
          {/* Settings and other pinned nav items */}
          {BOTTOM_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'sidebar-item' + (isActive ? ' active' : '')
              }
              onClick={isMobileOpen ? toggleMobile : undefined}
            >
              <span className="sidebar-item-indicator" aria-hidden="true" />
              <span className="sidebar-item-icon" aria-hidden="true">
                <Icon size={16} />
              </span>
              <span className="sidebar-item-label">{label}</span>
              <span className="sidebar-tooltip" aria-hidden="true">
                {label}
              </span>
            </NavLink>
          ))}

          {/* Sign out button */}
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <span className="sidebar-item-indicator" aria-hidden="true" />
            <span className="sidebar-item-icon" aria-hidden="true">
              <LogOut size={16} />
            </span>
            <span className="sidebar-item-label">Sign Out</span>
            <span className="sidebar-tooltip" aria-hidden="true">
              Sign Out
            </span>
          </button>

          {/* Collapse / expand toggle */}
          <div className="sidebar-toggle">
            <button
              className="sidebar-toggle-btn"
              onClick={toggle}
              aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isExpanded ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
