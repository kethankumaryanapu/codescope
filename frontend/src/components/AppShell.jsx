import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { Settings, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import NvidiaStatus from './NvidiaStatus';
import './GlobalBackground.css';
import './AppShell.css';

const NAV_CATEGORIES = [
  {
    id: 'workspace',
    label: 'WORKSPACE',
    items: [
      { to: '/dashboard', label: 'Workspace Hub' },
      { to: '/files', label: 'Codebase' },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    items: [
      { to: '/requirements', label: 'Requirements' },
      { to: '/agents', label: 'Agents' },
      { to: '/impact-analysis', label: 'Impact Analysis' },
    ],
  },
  {
    id: 'review',
    label: 'REVIEW & DELIVERY',
    items: [
      { to: '/code-review', label: 'Code Review' },
      { to: '/pr-generator', label: 'Pull Request' },
    ],
  },
];

const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const { repositories, selectedRepo, setSelectedRepo } = useAnalysis();
  const navigate = useNavigate();
  const location = useLocation();

  const [openCat, setOpenCat] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  // Close all dropdowns when route changes
  useEffect(() => {
    setOpenCat(null);
    setUserMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Is any item in a category currently active?
  const isCatActive = (cat) =>
    cat.items.some(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(item.to + '/')
    );

  return (
    <div className="app-shell-v2">
      {/* Global 3D background */}
      <div className="global-bg" aria-hidden="true">
        <div className="global-bg-img" />
        <div className="global-bg-vignette" />
      </div>

      {/* Header */}
      <header className="shell-header">
        {/* Logo */}
        <Link to="/dashboard" className="shell-logo">
          <div className="shell-logo-mark">IQ</div>
          <span className="shell-logo-text">
            Impact<span className="shell-logo-accent">IQ</span>
          </span>
        </Link>

        {/* Primary nav — desktop */}
        <nav className="shell-nav" aria-label="Primary navigation">
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.id} className="shell-nav-cat">
              <button
                className={`shell-nav-trigger ${isCatActive(cat) ? 'active' : ''} ${openCat === cat.id ? 'open' : ''}`}
                onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
                aria-expanded={openCat === cat.id}
              >
                {cat.label}
                <span
                  style={{
                    display: 'inline-flex',
                    transition: 'transform 0.2s',
                    transform: openCat === cat.id ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronDown size={12} />
                </span>
              </button>
              {openCat === cat.id && (
                <>
                  <div className="shell-nav-backdrop" onClick={() => setOpenCat(null)} />
                  <div className="shell-nav-dropdown">
                    {cat.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `shell-nav-item${isActive ? ' active' : ''}`
                        }
                        onClick={() => setOpenCat(null)}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>

        {/* Right side actions */}
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

          {/* Settings icon */}
          <Link to="/settings" className="shell-action-btn" aria-label="Settings">
            <Settings size={16} />
          </Link>

          {/* Avatar + user dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="shell-avatar"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              {userInitial}
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="shell-dropdown-backdrop"
                  onClick={() => setUserMenuOpen(false)}
                />
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
                  <button
                    className="shell-dropdown-item danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="shell-mobile-menu-btn"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div
          className="shell-mobile-nav"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.id} className="shell-mobile-cat">
              <div className="shell-mobile-cat-label">{cat.label}</div>
              {cat.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `shell-mobile-item${isActive ? ' active' : ''}`
                  }
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
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
