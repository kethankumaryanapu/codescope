import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import NvidiaStatus from './NvidiaStatus';
import './GlobalBackground.css';
import './AppShell.css';

const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const { repositories, selectedRepo, setSelectedRepo } = useAnalysis();
  const navigate = useNavigate();
  const location = useLocation();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  // Close dropdowns when route changes
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

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
        <Link to="/hub" className="shell-logo">
          <div className="shell-logo-mark">IQ</div>
          <span className="shell-logo-text">
            Impact<span className="shell-logo-accent">IQ</span>
          </span>
        </Link>

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
        </div>
      </header>

      {/* Page content */}
      <main className="shell-page-content">{children}</main>
    </div>
  );
};

export default AppShell;
