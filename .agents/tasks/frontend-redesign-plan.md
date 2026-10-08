# ImpactIQ Extreme Frontend Redesign — Implementation Plan

---

## 1. Existing Codebase Findings

### Architecture
- **Framework**: Vite 6 + React 19 + React Router DOM 7. No TypeScript. ESM modules. No test runner.
- **Single mega-component**: `WorkspaceHub.jsx` (~1800 lines) handles ALL 9 tabs. Every page file (Dashboard, Agents, CodeReview, PRGenerator, etc.) is a one-liner that renders `<WorkspaceHub activeTab="..."/>`. **Do not refactor this structure — only change visual output.**
- **Contexts**: `AnalysisContext` supplies `workflow`, `analysisData`, `reviewData`, `repositories`, `selectedRepo`, `runImpactAnalysis`, `runCodeReview`, etc. `AuthContext` supplies `user`, `isAuthenticated`, `logout`.
- **Components in use**: Navbar (72px), Sidebar (250px full labels), AIStatus, MetricCard, DependencyGraph, ImpactTable, MarkdownView, ReviewCard, AnimatedBackground, Loader.
- **Icon library**: lucide-react 1.28 only. No Three.js, no R3F.
- **Deps**: mammoth (docx parsing) — must remain.

### Current Theme Problems to Fix
- `:root` uses purple (`#6366f1`), pink (`#ec4899`), cyan (`#06b6d4`), violet (`#8b5cf6`).
- `body` background is a 7-layer radial-gradient aurora (purple/pink/cyan orbs).
- `AnimatedBackground` runs a full-screen canvas particle system — removes it entirely.
- `Sidebar` is 250px wide with a large "AI WORKSPACE" blurb.
- `Navbar` is 72px with search bar and globe/bell icons.
- Auth pages are two-column (marketing left panel + form right) — simplify to single column.

### Risk Areas
1. **WorkspaceHub.jsx is 1800 lines** — every inline style edit risks a JSX syntax error. Edit carefully with exact string replacement.
2. **Topbar imports NvidiaStatus** before FEAT-002 creates it — resolved by creating a stub in FEAT-001 Step 3.
3. **WorkspaceHub imports Navbar** — import must be swapped to Topbar in FEAT-001 Step 5.
4. **Register.jsx has complex OTP multi-step flow** — reskin only, never remove the step state machine or otpInputRefs.
5. **VITE_NVIDIA_MODEL env var** — must use `import.meta.env.VITE_NVIDIA_MODEL ?? 'nvidia/llama-3.1-nemotron-70b-instruct'` — never render any key/secret.

---

## 2. Dependencies to Add

**None.** The redesign uses CSS, SVG, and lucide-react (already installed). No Three.js, React Three Fiber, or other packages are needed or allowed.

---

## 3. Ordered Implementation Steps

> Each step leaves the codebase in a buildable state. Run `cd frontend && npm run build` to verify after each FEAT.

- [ ] 1. **FEAT-001 — Theme Foundation & Shell**
       Replace `index.css` with NVIDIA graphite+green design tokens. Remove `AnimatedBackground` from `App.jsx`. Create new `Topbar.jsx` (48px, ImpactIQ logo + repo selector + NvidiaStatus stub + user avatar). Replace `Sidebar.jsx` with icon-only 56px rail (green active indicator, tooltips, LogOut at bottom). Update `WorkspaceHub.jsx` to import Topbar instead of Navbar and adjust minHeight from 72px→48px.
       Files: `frontend/src/index.css`, `frontend/src/App.jsx`, `frontend/src/components/Topbar.jsx` (new), `frontend/src/components/NvidiaStatus.jsx` (stub), `frontend/src/components/Sidebar.jsx`, `frontend/src/pages/WorkspaceHub.jsx` (import swap only)
       Verify: `cd frontend && npm run build` — exits 0

- [ ] 2. **FEAT-002 — New & Reskinned Components**
       Build 7 new components: full `NvidiaStatus.jsx`, `IntelligenceCore.jsx` (SVG orbit + CSS animation, reads `workflow` from `useAnalysis`), `AgentCard.jsx`, `ImpactFileList.jsx`, `PipelineStatus.jsx`, `StatCard.jsx`. Reskin existing: `AIStatus.jsx`, `MetricCard.jsx`, `DependencyGraph.jsx`, `ReviewCard.jsx`, `MarkdownView.jsx` — all keep logic intact, only change colors/borders/backgrounds to use CSS token vars.
       Files: `frontend/src/components/NvidiaStatus.jsx`, `frontend/src/components/IntelligenceCore.jsx` (new), `frontend/src/components/AgentCard.jsx` (new), `frontend/src/components/ImpactFileList.jsx` (new), `frontend/src/components/PipelineStatus.jsx` (new), `frontend/src/components/StatCard.jsx` (new), `frontend/src/components/AIStatus.jsx`, `frontend/src/components/MetricCard.jsx`, `frontend/src/components/DependencyGraph.jsx`, `frontend/src/components/ReviewCard.jsx`, `frontend/src/components/MarkdownView.jsx`
       Verify: `cd frontend && npm run build` — exits 0

- [ ] 3. **FEAT-003 — Page Reskins & Build Fix**
       Reskin all 9 WorkspaceHub tabs: replace hardcoded purple/indigo hex values with CSS token vars, integrate `IntelligenceCore` into overview+agents tabs, `ImpactFileList` into impact tab (replacing `ImpactTable`), `PipelineStatus` into PR tab, `NvidiaStatus` into requirement+settings tabs, `AgentCard` (×5) into agents tab. Reskin `Login.jsx` → single-column centered dark form (remove left panel entirely). Reskin `Register.jsx` → single column, OTP step preserved. Reskin `ForgotPassword.jsx` → single column. Run build, fix ALL errors.
       Files: `frontend/src/pages/WorkspaceHub.jsx`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`, `frontend/src/pages/ForgotPassword.jsx`
       Verify: `cd frontend && npm run build` — exits 0 with zero errors

---

## 4. Build Verification Checklist

After all FEATs are applied, confirm:

- [ ] `npm run build` exits 0 with zero errors and zero unresolved import warnings
- [ ] `index.css` `:root` contains `--nvidia: #76b900` and no `#6366f1` / `#ec4899` / `#8b5cf6`
- [ ] `App.jsx` does not contain `AnimatedBackground`
- [ ] `Topbar.jsx` exists and is imported in `WorkspaceHub.jsx`
- [ ] `Sidebar.jsx` is icon-only (no text labels, no "AI WORKSPACE" blurb)
- [ ] `IntelligenceCore.jsx` exists with no `import.*three` or `@react-three` statements
- [ ] `NvidiaStatus.jsx` renders model name from env var but never any API key string
- [ ] `Login.jsx` has no left-panel grid, no `.shimmer-text`, no `.animated-border` class
- [ ] `WorkspaceHub.jsx` agents tab renders `<AgentCard ...>` (grep for `AgentCard`)
- [ ] `WorkspaceHub.jsx` impact tab renders `<ImpactFileList` (grep for `ImpactFileList`)
- [ ] `WorkspaceHub.jsx` pr tab renders `<PipelineStatus` (grep for `PipelineStatus`)

---

## 5. FEAT Artifact Location

Detailed per-feature step files are in:
```
.agents/tasks/task-frontend-redesign/
├── task.json
├── context.json
└── features/
    ├── FEAT-001.json   — Theme + Shell
    ├── FEAT-002.json   — Components
    └── FEAT-003.json   — Pages + Build Fix
```

Each FEAT file contains exact file paths, step-by-step instructions grounded in the actual codebase, and the verification command.
