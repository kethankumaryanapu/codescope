import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FolderTree, FileText,
  ShieldCheck, FolderGit2
} from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';
import './IntelligenceHub.css';

const ENTRY_CARDS = [
  {
    icon: FolderTree,
    title: 'Codebase Index',
    description: 'Manage and inspect indexed repository files.',
    to: '/files',
    dataKey: 'files',
  },
  {
    icon: FileText,
    title: 'Requirement Analysis',
    description: 'Define and analyze requirement stories against your codebase.',
    to: '/requirements',
    dataKey: null,
  },
  {
    icon: ShieldCheck,
    title: 'AI Code Review',
    description: 'Run automated pre-review analysis on code changes.',
    to: '/code-review',
    dataKey: null,
  },
];

const IntelligenceHub = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRepo, repoFiles } = useAnalysis();

  /* Pointer-tilt handlers for feature cards — reactive media query subscriptions */
  const [prefersReduced, setPrefersReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  );

  useEffect(() => {
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqTouch   = window.matchMedia('(hover: none)');
    const onReduced = (e) => setPrefersReduced(e.matches);
    const onTouch   = (e) => setIsTouch(e.matches);
    mqReduced.addEventListener('change', onReduced);
    mqTouch.addEventListener('change', onTouch);
    return () => {
      mqReduced.removeEventListener('change', onReduced);
      mqTouch.removeEventListener('change', onTouch);
    };
  }, []);

  const handleTiltMove = (e) => {
    if (prefersReduced || isTouch) return;
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.setProperty('--tx', `${(x * 6).toFixed(2)}deg`);
    card.style.setProperty('--ty', `${(-y * 6).toFixed(2)}deg`);
  };
  const handleTiltLeave = (e) => {
    e.currentTarget.style.setProperty('--tx', '0deg');
    e.currentTarget.style.setProperty('--ty', '0deg');
  };

  return (
    <div className="ih-root">
      {/* Hero */}
      <section className="ih-hero" aria-label="CodeScope identity">
        <div className="ih-hero-scrim" aria-hidden="true" />
        <div className="ih-hero-content">
          <div className="ih-brand">
            <img src="/codescope-logo.png" alt="CodeScope" className="ih-logo-img" />
            <span className="ih-logo-text">Code<span className="ih-logo-accent">Scope</span></span>
          </div>
          <p className="ih-hero-subtitle-tag">Multi-Agent Code Intelligence Platform</p>
          <h1 className="ih-hero-title">
            Understand Changes. Predict Impact. Review with Confidence.
          </h1>
          <p className="ih-hero-subtitle">
            AI-powered code intelligence for complex software systems.
          </p>
          {selectedRepo && (
            <div className="ih-status-line">
              <FolderGit2 size={13} />
              <span>{selectedRepo.name}</span>
              <span className="ih-status-dot" aria-hidden="true" />
              <span>{selectedRepo.branch}</span>
              {repoFiles.length > 0 && (
                <><span className="ih-status-dot" aria-hidden="true" /><span>{repoFiles.length} files indexed</span></>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Hub content */}
      <section className="ih-content" aria-label="Hub overview">
        {selectedRepo && (
          <div className="ih-repo-chip">
            <FolderGit2 size={13} aria-hidden="true" />
            <span>{selectedRepo.name}</span>
            <span className="ih-chip-branch">{selectedRepo.branch}</span>
          </div>
        )}
        <div className="ih-cards">
          {ENTRY_CARDS.map(card => {
            const Icon = card.icon;
            const metaText = card.dataKey === 'files' && repoFiles.length > 0
              ? `${repoFiles.length} files`
              : null;
            return (
              <button
                key={card.to}
                className="ih-card"
                onClick={() => navigate(card.to)}
                onMouseMove={handleTiltMove}
                onMouseLeave={handleTiltLeave}
                aria-label={`Navigate to ${card.title}`}
              >
                <div className="ih-card-header">
                  <div className="ih-card-icon">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  {metaText && <span className="ih-card-meta">{metaText}</span>}
                </div>
                <div className="ih-card-title">{card.title}</div>
                <div className="ih-card-desc">{card.description}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default IntelligenceHub;
