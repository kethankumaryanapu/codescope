import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation, NavLink } from 'react-router-dom';
import { Settings, LogOut, ChevronDown, Menu, X,
         LayoutDashboard, FolderTree, FileText, Bot, Zap,
         ShieldCheck, GitPullRequest } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import NvidiaStatus from './NvidiaStatus';
import './GlobalBackground.css';
import './AppShell.css';

/* ── Navigation structure (matches existing routes) ── */
const NAV_CATEGORIES = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Workspace Hub', icon: LayoutDashboard },
      { to: '/files',     label: 'Codebase',      icon: FolderTree },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { to: '/requirements',   label: 'Requirements',    icon: FileText },
      { to: '/agents',         label: 'Agents',          icon: Bot },
      { to: '/impact-analysis', label: 'Impact Analysis', icon: Zap },
    ],
  },
  {
    id: 'review',
    label: 'Review & Delivery',
    items: [
      { to: '/code-review',  label: 'Code Review',  icon: ShieldCheck },
      { to: '/pr-generator', label: 'Pull Request', icon: GitPullRequest },
    ],
  },
];

/* ── Single nav category with dropdown ── */
const NavCategory = ({ cat, location }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const isActive = cat.items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  );

  return (
    <div className="shell-nav-cat" ref={ref}>
      <button
        className={`shell-nav-trigger${isActive ? ' active' : ''}${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {cat.label}
        <ChevronDown size={12} className={`shell-nav-chevron${open ? ' rotated' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="shell-nav-backdrop" onClick={() => setOpen(false)} />
          <div className="shell-nav-dropdown" role="menu">
            {cat.items.map((item) => {
              const Icon = item.icon;
              const itemActive =
                location.pathname === item.to ||
                location.pathname.startsWith(item.to + '/');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`shell-nav-item${itemActive ? ' active' : ''}`}
                  role="menuitem"
                >
                  <Icon size={14} aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

/* ── App shell ── */
const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const { repositories, selectedRepo, setSelectedRepo } = useAnalysis();
  const navigate = useNavigate();
  const location = useLocation();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  useEffect(() => {
    setUserMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell-v2">
      {/* Global 3D background — 5-layer depth system */}
      <div className="global-bg" aria-hidden="true">
        <div className="global-bg-art" />
        <div className="global-bg-grid" />
        <div className="global-bg-lights" />
        <span className="bg-fragment" style={{'--dur':'26s','--delay':'0s',top:'18%',left:'8%'}}>runImpactAnalysis()</span>
        <span className="bg-fragment" style={{'--dur':'31s','--delay':'-8s',top:'35%',right:'12%'}}>git diff HEAD~1</span>
        <span className="bg-fragment" style={{'--dur':'22s','--delay':'-14s',top:'62%',left:'18%'}}>AST.traverse(node)</span>
        <span className="bg-fragment" style={{'--dur':'28s','--delay':'-5s',top:'72%',right:'22%'}}>embeddings.search()</span>
        <span className="bg-fragment" style={{'--dur':'34s','--delay':'-20s',top:'45%',left:'55%'}}>reviewCode(diff)</span>
        <span className="bg-fragment" style={{'--dur':'19s','--delay':'-11s',top:'25%',right:'38%'}}>merge --ff-only</span>
        <div className="global-bg-vignette" />
        <div className="global-bg-leftfade" />
      </div>

      {/* ── Header ── */}
      <header className="shell-header">
        {/* Logo */}
        <Link to="/hub" className="shell-logo">
          <img src="/codescope-logo.png" alt="CodeScope" className="shell-logo-img" />
          <span className="shell-logo-text">
            Code<span className="shell-logo-accent">Scope</span>
          </span>
        </Link>

        {/* Primary nav — desktop */}
        <nav className="shell-nav" aria-label="Primary navigation">
          {NAV_CATEGORIES.map((cat) => (
            <NavCategory key={cat.id} cat={cat} location={location} />
          ))}
        </nav>

        {/* Right-side actions */}
        <div className="shell-actions">
          {/* Repo selector */}
          {repositories && repositories.length > 0 && (
            <select
              value={selectedRepo?.id || ''}
              onChange={(e) => {
                const repo = repositories.find((r) => r.id === e.target.value);
                if (repo) setSelectedRepo(repo);
              }}
              className="shell-repo-select"
              aria-label="Select repository"
            >
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id} style={{ background: '#1a1a1a' }}>
                  {repo.name}
                </option>
              ))}
            </select>
          )}

          {/* AI Engine status */}
          <NvidiaStatus />

          {/* Settings */}
          <Link to="/settings" className="shell-action-btn" aria-label="Settings">
            <Settings size={16} />
          </Link>

          {/* Avatar + user dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="shell-avatar"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              {userInitial}
            </button>
            {userMenuOpen && (
              <>
                <div className="shell-dropdown-backdrop" onClick={() => setUserMenuOpen(false)} />
                <div className="shell-user-dropdown">
                  <div className="shell-user-info">
                    <span className="shell-user-label">SIGNED IN AS</span>
                    <span className="shell-user-email">
                      {user?.email || user?.name || 'developer'}
                    </span>
                  </div>
                  <Link
                    to="/settings"
                    className="shell-dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={14} /> Settings
                  </Link>
                  <button className="shell-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="shell-mobile-menu-btn"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="shell-mobile-nav" role="navigation" aria-label="Mobile navigation">
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <div className="shell-mobile-cat-label">{cat.label}</div>
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to ||
                  location.pathname.startsWith(item.to + '/');
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`shell-mobile-item${isActive ? ' active' : ''}`}
                  >
                    <Icon size={14} aria-hidden="true" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Page content */}
      <main className="shell-page-content">{children}</main>
    </div>
  );
};

export default AppShell;
