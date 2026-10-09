import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderTree, FileText, Bot, Zap,
  ShieldCheck, GitPullRequest, FolderGit2
} from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';
import './IntelligenceHub.css';

const DOMAINS = [
  {
    id: 'workspace',
    label: 'WORKSPACE',
    modules: [
      { to: '/dashboard', label: 'Workspace Hub', icon: LayoutDashboard },
      { to: '/files', label: 'Codebase', icon: FolderTree },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    modules: [
      { to: '/requirements', label: 'Requirements', icon: FileText },
      { to: '/agents', label: 'Agents', icon: Bot },
      { to: '/impact-analysis', label: 'Impact Analysis', icon: Zap },
    ],
  },
  {
    id: 'review',
    label: 'REVIEW & DELIVERY',
    modules: [
      { to: '/code-review', label: 'Code Review', icon: ShieldCheck },
      { to: '/pr-generator', label: 'Pull Request', icon: GitPullRequest },
    ],
  },
];

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

  // Determine which domain is active based on current path
  const activeDomainId = (() => {
    for (const domain of DOMAINS) {
      if (domain.modules.some(m => location.pathname === m.to || location.pathname.startsWith(m.to + '/'))) {
        return domain.id;
      }
    }
    return 'workspace';
  })();

  const [selectedDomain, setSelectedDomain] = useState(activeDomainId);

  const currentDomain = DOMAINS.find(d => d.id === selectedDomain) || DOMAINS[0];

  return (
    <div className="ih-root">
      {/* Hero */}
      <section className="ih-hero" aria-label="ImpactIQ identity">
        <div className="ih-hero-scrim" aria-hidden="true" />
        <div className="ih-hero-content">
          <div className="ih-brand">
            <div className="ih-logo-mark">IQ</div>
            <span className="ih-logo-text">Impact<span className="ih-logo-accent">IQ</span></span>
          </div>
          <h1 className="ih-hero-title">
            AI-powered code intelligence for complex software systems.
          </h1>
          <p className="ih-hero-subtitle">
            Understand change impact, coordinate intelligent analysis, and review code with confidence.
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

      {/* Primary domain nav */}
      <nav className="ih-domain-nav" aria-label="Feature domains">
        {DOMAINS.map(domain => (
          <button
            key={domain.id}
            className={`ih-domain-btn${selectedDomain === domain.id ? ' active' : ''}`}
            onClick={() => setSelectedDomain(domain.id)}
          >
            {domain.label}
          </button>
        ))}
      </nav>

      {/* Module strip */}
      <div className="ih-module-strip" role="navigation" aria-label={`${currentDomain.label} modules`}>
        {currentDomain.modules.map(mod => {
          const Icon = mod.icon;
          const isActive = location.pathname === mod.to || location.pathname.startsWith(mod.to + '/');
          return (
            <button
              key={mod.to}
              className={`ih-module-item${isActive ? ' active' : ''}`}
              onClick={() => navigate(mod.to)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{mod.label}</span>
            </button>
          );
        })}
      </div>

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
