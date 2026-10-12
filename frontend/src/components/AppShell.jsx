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

/* ── BgSvgLayer — decorative SVG connection lines + particles ── */
const BgSvgLayer = () => {
  const nodes = [
    [8, 18], [25, 42], [45, 15], [62, 55], [78, 22],
    [90, 65], [15, 75], [50, 85], [72, 38], [35, 68]
  ];
  const edges = [
    [0,1],[1,2],[2,4],[4,5],[0,6],[3,4],[3,7],[7,8],[5,8],[2,3],[6,7],[1,3]
  ];
  // 35 hardcoded particles at fixed positions, alternating lime/cyan
  const particles = [
    {x:5,y:12,r:1,c:'#76b900',op:0.18,dur:18},{x:18,y:8,r:1.5,c:'#00c8a0',op:0.15,dur:22},
    {x:30,y:22,r:1,c:'#76b900',op:0.22,dur:27},{x:42,y:5,r:1,c:'#00c8a0',op:0.16,dur:19},
    {x:55,y:30,r:1.5,c:'#76b900',op:0.2,dur:31},{x:68,y:10,r:1,c:'#00c8a0',op:0.17,dur:25},
    {x:80,y:28,r:1,c:'#76b900',op:0.19,dur:33},{x:92,y:15,r:1.5,c:'#00c8a0',op:0.15,dur:20},
    {x:97,y:45,r:1,c:'#76b900',op:0.21,dur:28},{x:85,y:50,r:1,c:'#00c8a0',op:0.18,dur:23},
    {x:10,y:35,r:1.5,c:'#76b900',op:0.16,dur:35},{x:22,y:58,r:1,c:'#00c8a0',op:0.2,dur:17},
    {x:38,y:48,r:1,c:'#76b900',op:0.22,dur:29},{x:50,y:62,r:1.5,c:'#00c8a0',op:0.15,dur:21},
    {x:65,y:40,r:1,c:'#76b900',op:0.19,dur:26},{x:75,y:60,r:1,c:'#00c8a0',op:0.17,dur:32},
    {x:88,y:78,r:1.5,c:'#76b900',op:0.18,dur:24},{x:3,y:55,r:1,c:'#00c8a0',op:0.16,dur:30},
    {x:14,y:70,r:1,c:'#76b900',op:0.21,dur:18},{x:28,y:80,r:1.5,c:'#00c8a0',op:0.15,dur:34},
    {x:42,y:72,r:1,c:'#76b900',op:0.2,dur:22},{x:58,y:78,r:1,c:'#00c8a0',op:0.18,dur:27},
    {x:70,y:88,r:1.5,c:'#76b900',op:0.16,dur:20},{x:82,y:92,r:1,c:'#00c8a0',op:0.19,dur:31},
    {x:94,y:82,r:1,c:'#76b900',op:0.22,dur:25},{x:7,y:90,r:1.5,c:'#00c8a0',op:0.15,dur:19},
    {x:20,y:95,r:1,c:'#76b900',op:0.17,dur:28},{x:35,y:88,r:1,c:'#00c8a0',op:0.21,dur:23},
    {x:48,y:95,r:1.5,c:'#76b900',op:0.16,dur:33},{x:62,y:92,r:1,c:'#00c8a0',op:0.19,dur:17},
    {x:76,y:98,r:1,c:'#76b900',op:0.18,dur:26},{x:90,y:94,r:1.5,c:'#00c8a0',op:0.15,dur:35},
    {x:52,y:20,r:1,c:'#76b900',op:0.2,dur:21},{x:33,y:35,r:1,c:'#00c8a0',op:0.17,dur:29},
    {x:60,y:70,r:1.5,c:'#76b900',op:0.22,dur:24}
  ];
  return (
    <svg
      className="global-bg-svg"
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {edges.map(([a,b],i) => {
        const dashLen = 12 + (i % 5) * 4;
        const dur = 6 + (i % 7) * 2;
        const isLime = i % 2 === 0;
        return (
          <line
            key={i}
            x1={nodes[a][0]} y1={nodes[a][1]}
            x2={nodes[b][0]} y2={nodes[b][1]}
            stroke={isLime ? 'rgba(118,185,0,0.15)' : 'rgba(0,200,160,0.12)'}
            strokeWidth="0.5"
            strokeDasharray={dashLen}
            style={{
              animation: `dashFlow ${dur}s linear infinite`,
              strokeDashoffset: 0
            }}
          />
        );
      })}
      {particles.map((p,i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y} r={p.r}
          fill={p.c}
          opacity={p.op}
          style={{ animation: `particleDrift ${p.dur}s ease-in-out infinite` }}
        />
      ))}
    </svg>
  );
};

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
        <BgSvgLayer />
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
