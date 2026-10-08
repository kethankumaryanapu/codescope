# ImpactIQ Sidebar Redesign — Implementation Plan

## Codebase Findings

**Root layout bug (confirmed by reading source):** `WorkspaceHub.jsx` renders `<Topbar />` + `<Sidebar />` inline at the top of its `return`. The sidebar is `position:fixed; top:48px; width:56px`, but `.dashboard-main` has no `margin-left` or `padding-left`, so all page content starts at `left:0` and is covered by the 56px sidebar.

**Key architecture facts:**
- All 9 authenticated pages are thin wrappers: `const Page = () => <WorkspaceHub activeTab="X" />`
- `WorkspaceHub.jsx` is both the layout host AND the multi-tab content switcher — it renders topbar + sidebar + all tab content
- No shared `AppLayout` exists yet; layout is embedded in `WorkspaceHub`
- Icon library: `lucide-react` (installed, no new deps needed)
- Styling: plain CSS + CSS custom properties in `src/index.css` (no Tailwind, no modules)
- No `SidebarContext` exists — must be created

**Fix strategy:** Extract layout out of `WorkspaceHub` into a new `AppLayout` component. Inject `AppLayout` at the `AppRoutes` level. Remove `<Topbar />` and `<Sidebar />` from `WorkspaceHub`. Use a CSS flex row for the shell so sidebar width is a flex child and main content fills the remainder.

---

## Files Created

| Path | Purpose |
|---|---|
| `src/context/SidebarContext.jsx` | NEW — expanded/collapsed state + localStorage persistence |
| `src/components/AppLayout.jsx` | NEW — application shell: SidebarProvider + Sidebar + main area |
| `src/components/sidebar.css` | NEW — all sidebar CSS classes (no inline styles) |

## Files Modified

| Path | Change |
|---|---|
| `src/components/Sidebar.jsx` | Full rewrite — collapsible, grouped, NVIDIA-styled |
| `src/index.css` | Add CSS custom properties + app-shell layout classes |
| `src/routes/AppRoutes.jsx` | Wrap authenticated routes with `<AppLayout>` |
| `src/pages/WorkspaceHub.jsx` | Remove `<Topbar />`, `<Sidebar />`, and outer shell `<div>` |

---

## Plan

- [ ] 1. **Create `src/context/SidebarContext.jsx`**
      Create a React context with `SidebarProvider` and `useSidebar()` hook.
      Shape: `{ isExpanded: boolean, toggle: () => void, isMobileOpen: boolean, toggleMobile: () => void }`.
      `isExpanded` initializes from `localStorage.getItem('impactiq_sidebar_expanded')` — parse as JSON, default `true` if missing.
      On every `toggle()` call, flip state and write new value to `localStorage.setItem('impactiq_sidebar_expanded', JSON.stringify(newVal))`.
      `isMobileOpen` starts `false`; `toggleMobile()` flips it.
      Files: `src/context/SidebarContext.jsx`
      Verify: `npm run build` — no errors.

- [ ] 2. **Add CSS layout infrastructure to `src/index.css`**
      In a new `/* ============================================================ APP SHELL ============================================================ */` section, add:
      - CSS custom properties in `:root`: `--sidebar-w-expanded: 248px`, `--sidebar-w-collapsed: 64px`, `--topbar-h: 48px`
      - `.app-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg); }`
      - `.app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }`
      - `.page-content { flex: 1; overflow-y: auto; }`
      - `.mobile-menu-btn { display: none; align-items: center; justify-content: center; width: 36px; height: 36px; background: transparent; border: none; color: var(--text-2); cursor: pointer; flex-shrink: 0; }`
      - Responsive: `@media (max-width: 767px) { .app-main { width: 100%; } .mobile-menu-btn { display: flex !important; } }`
      Do NOT remove existing `.dashboard-shell` or `.dashboard-main` rules yet — they may still be referenced elsewhere until step 5 cleans WorkspaceHub.
      Files: `src/index.css`
      Verify: `npm run build` — no errors.

- [ ] 3. **Create `src/components/sidebar.css`**
      All sidebar styles go here. Key rules (use classes, no inline styles):
      ```css
      .sidebar { position: relative; width: var(--sidebar-w-expanded); min-width: var(--sidebar-w-expanded); height: 100vh; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: width 200ms ease, min-width 200ms ease; overflow: hidden; z-index: 10; flex-shrink: 0; }
      .sidebar.collapsed { width: var(--sidebar-w-collapsed); min-width: var(--sidebar-w-collapsed); }
      .sidebar-logo { height: var(--topbar-h); display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; gap: 10px; overflow: hidden; white-space: nowrap; }
      .sidebar-logo-mark { width: 28px; height: 28px; background: #76b900; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: #000; }
      .sidebar-logo-text { font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--text); letter-spacing: 0.02em; opacity: 1; transition: opacity 150ms ease; white-space: nowrap; }
      .sidebar.collapsed .sidebar-logo-text { opacity: 0; pointer-events: none; width: 0; overflow: hidden; }
      .sidebar-nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px 0; scrollbar-width: thin; }
      .sidebar-group-label { padding: 12px 16px 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; color: var(--text-3); text-transform: uppercase; white-space: nowrap; overflow: hidden; transition: opacity 150ms ease, max-height 150ms ease; max-height: 40px; opacity: 1; }
      .sidebar.collapsed .sidebar-group-label { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
      .sidebar-item { position: relative; display: flex; align-items: center; gap: 10px; padding: 0 12px; height: 40px; color: var(--text-3); text-decoration: none; border-radius: 6px; margin: 1px 8px; font-size: 13px; font-weight: 500; transition: color 150ms ease, background 150ms ease; white-space: nowrap; overflow: hidden; cursor: pointer; background: transparent; border: none; width: calc(100% - 16px); text-align: left; }
      .sidebar-item:hover { color: var(--text); background: var(--surface-2); }
      .sidebar-item:focus-visible { outline: 2px solid #76b900; outline-offset: -2px; }
      .sidebar-item.active { color: #76b900; background: rgba(118,185,0,0.08); }
      .sidebar-item-indicator { position: absolute; left: -8px; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #76b900; border-radius: 0 2px 2px 0; opacity: 0; transition: opacity 150ms ease; flex-shrink: 0; }
      .sidebar-item.active .sidebar-item-indicator { opacity: 1; }
      .sidebar-item-icon { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 20px; }
      .sidebar-item-label { flex: 1; overflow: hidden; text-overflow: ellipsis; transition: opacity 150ms ease; }
      .sidebar.collapsed .sidebar-item { padding: 0; justify-content: center; margin: 1px 8px; }
      .sidebar.collapsed .sidebar-item-label { opacity: 0; width: 0; overflow: hidden; pointer-events: none; flex: 0; }
      .sidebar-bottom { border-top: 1px solid var(--border); padding: 8px 0; flex-shrink: 0; }
      .sidebar-toggle { display: flex; align-items: center; padding: 4px 8px; justify-content: flex-end; }
      .sidebar.collapsed .sidebar-toggle { justify-content: center; }
      .sidebar-toggle-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-sm); background: transparent; border: 1px solid var(--border); color: var(--text-3); cursor: pointer; transition: color 150ms, background 150ms, border-color 150ms; flex-shrink: 0; }
      .sidebar-toggle-btn:hover { color: var(--text); background: var(--surface-2); border-color: var(--border-2); }
      .sidebar-tooltip { position: absolute; left: calc(var(--sidebar-w-collapsed) - 4px); top: 50%; transform: translateY(-50%); background: var(--surface-3); color: var(--text); font-size: 12px; padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-2); white-space: nowrap; pointer-events: none; opacity: 0; z-index: 300; transition: opacity 100ms ease; }
      .sidebar.collapsed .sidebar-item:hover .sidebar-tooltip { opacity: 1; }
      .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 199; }
      @media (max-width: 767px) {
        .sidebar { position: fixed; top: 0; left: 0; bottom: 0; height: 100vh; z-index: 200; transform: translateX(-100%); transition: transform 200ms ease; width: var(--sidebar-w-expanded) !important; min-width: var(--sidebar-w-expanded) !important; }
        .sidebar.mobile-open { transform: translateX(0); }
        .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 199; cursor: pointer; }
      }
      ```
      Files: `src/components/sidebar.css`
      Verify: `npm run build` — no errors.

- [ ] 4. **Rewrite `src/components/Sidebar.jsx`**
      Complete replacement. Key structure:
      - Imports: `useSidebar` from `../context/SidebarContext`, `useAuth` from `../context/AuthContext`, `NavLink`, `useNavigate` from `react-router-dom`, `ChevronLeft`, `ChevronRight`, `LayoutDashboard`, `FolderTree`, `FileText`, `Bot`, `Zap`, `Code2`, `GitPullRequest`, `BarChart3`, `Settings`, `LogOut` from `lucide-react`, `./sidebar.css`
      - NAV_GROUPS constant (4 groups: WORKSPACE, INTELLIGENCE, REVIEW & DELIVERY, INSIGHTS) with items matching existing routes exactly
      - BOTTOM_ITEMS: `[{ to: '/settings', icon: Settings, label: 'Settings' }]`
      - Reads `{ isExpanded, toggle, isMobileOpen, toggleMobile }` from `useSidebar()`
      - Reads `{ user, logout }` from `useAuth()`
      - `const navigate = useNavigate()`
      - Sidebar root `className={'sidebar' + (!isExpanded ? ' collapsed' : '') + (isMobileOpen ? ' mobile-open' : '')}`
      - Logo area: `.sidebar-logo` with `.sidebar-logo-mark` showing "IQ" text, and `.sidebar-logo-text` showing `Impact<span style={{color:'#76b900'}}>IQ</span>`
      - Nav: `.sidebar-nav`, loop NAV_GROUPS, each group: `.sidebar-group-label` + items as NavLink with `className={({isActive}) => 'sidebar-item' + (isActive ? ' active' : '')}`, each item contains: `<span className="sidebar-item-indicator"/>`, `<span className="sidebar-item-icon"><Icon size={16}/></span>`, `<span className="sidebar-item-label">{label}</span>`, `<span className="sidebar-tooltip">{label}</span>`
      - `.sidebar-bottom`: Settings NavLink (same structure), logout button with `className="sidebar-item"` + `onClick={handleLogout}` showing `LogOut` icon and "Sign Out" label
      - Collapse toggle: `.sidebar-toggle` with `.sidebar-toggle-btn` rendering `<ChevronLeft size={14}/>` when expanded, `<ChevronRight size={14}/>` when collapsed; `title` attribute shows "Collapse sidebar" or "Expand sidebar"; `aria-label` same
      - Mobile overlay: `{isMobileOpen && <div className="sidebar-overlay" onClick={toggleMobile} />}` rendered OUTSIDE the sidebar nav (sibling, or in AppLayout)
      - Logout handler: calls `logout()` then `navigate('/login')`
      Files: `src/components/Sidebar.jsx`
      Verify: `npm run build` — no errors.

- [ ] 5. **Create `src/components/AppLayout.jsx`**
      ```jsx
      import { SidebarProvider, useSidebar } from '../context/SidebarContext';
      import Sidebar from './Sidebar';
      import Topbar from './Topbar';
      import { Menu } from 'lucide-react';

      const AppShell = ({ children }) => {
        const { isMobileOpen, toggleMobile } = useSidebar();
        return (
          <div className="app-shell">
            <Sidebar />
            <div className="app-main">
              {/* Mobile menu button — hidden on desktop via CSS */}
              <button
                className="mobile-menu-btn"
                onClick={toggleMobile}
                aria-label="Open navigation"
                style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 50 }}
              >
                <Menu size={20} />
              </button>
              <Topbar />
              <div className="page-content">
                {children}
              </div>
            </div>
          </div>
        );
      };

      const AppLayout = ({ children }) => (
        <SidebarProvider>
          <AppShell>{children}</AppShell>
        </SidebarProvider>
      );

      export default AppLayout;
      ```
      Note: The mobile-menu-btn position:absolute trick works because the Topbar already has position:sticky + its own padding. A cleaner approach: add a `leftSlot` prop to Topbar so it can render the hamburger inside its left area. Use the simpler absolute approach unless it causes visual overlap — if it does, pass the button as a sibling before `<Topbar />` in the flex column.
      Files: `src/components/AppLayout.jsx`
      Verify: `npm run build` — no errors.

- [ ] 6. **Modify `src/routes/AppRoutes.jsx`**
      Import `AppLayout` from `../components/AppLayout`.
      Wrap each of the 9 authenticated route elements with `<AppLayout>`:
      ```jsx
      <Route path="/dashboard" element={isAuthenticated ? <AppLayout><Dashboard /></AppLayout> : <Navigate to="/login" />} />
      ```
      Apply the same pattern for `/files`, `/requirements`, `/impact-analysis`, `/agents`, `/code-review`, `/pr-generator`, `/analytics`, `/settings`.
      Public routes (`/login`, `/register`, `/forgot-password`) must NOT use `<AppLayout>`.
      Files: `src/routes/AppRoutes.jsx`
      Verify: `npm run build` — no errors.

- [ ] 7. **Modify `src/pages/WorkspaceHub.jsx` — remove embedded layout**
      This is the layout detachment step.
      - Remove import of `Topbar` (line: `import Topbar from "../components/Topbar"`)
      - Remove import of `Sidebar` (line: `import Sidebar from "../components/Sidebar"`)
      - In the `return (...)` of `WorkspaceHub`, remove `<Topbar />` and the wrapping `<div className="dashboard-shell" style={{display:"flex", ...}}>` + `<Sidebar />` and the corresponding closing `</div>`
      - The `<div className="dashboard-main" style={{flex:1, padding:"20px", minWidth:0}}>` should now be the outermost returned element. Rename its `className` from `"dashboard-main"` to `"page-content-inner"` to avoid confusion with the old layout class — or just leave the className as-is and keep the inline `padding:"20px"` style. Both work since `.dashboard-main` still has a flex:1 rule in index.css that now applies harmlessly.
      - Do NOT change any functional logic, state, handlers, or tab rendering code. Only remove the layout wrapper elements.
      Files: `src/pages/WorkspaceHub.jsx`
      Verify: `npm run build` — no errors.

- [ ] 8. **Final build verification and layout check**
      Run `npm run build` from `c:\Users\Kethan Kumar Yanapu\OneDrive\Desktop\ImpactIQ\ImpactIQ\frontend`.
      Expected: build succeeds with zero errors or warnings about missing modules.
      If build fails, fix the reported import/JSX errors before proceeding.
      After a clean build, run `npm run dev` and manually verify:
      - Sidebar is visible at left edge, 248px wide (expanded), with logo, grouped nav items, and collapse toggle
      - Clicking the toggle collapses to 64px icon rail, labels disappear, group labels disappear
      - Active route item shows NVIDIA green color + left indicator bar
      - Page content (WorkspaceHub tabs) fills the space to the right of the sidebar with no overlap
      - Login/Register/ForgotPassword pages render without any sidebar
      - Resizing to <768px hides the permanent sidebar (drawer behavior)
      Files: no file changes
      Verify: `npm run build` exits 0.

---

## Design Decisions

**Decision: inject AppLayout at AppRoutes level, not in App.jsx**
Rationale: Auth pages must not have the sidebar. Wrapping per-route in AppRoutes is surgical — it's already where auth gating happens, so adding AppLayout alongside the auth guard is consistent and avoids conditional rendering of the layout in a parent.

**Decision: CSS flex row for the shell (not margin-left approach)**
Rationale: Flex row means the sidebar's width is factored into layout by the browser automatically. The margin-left approach requires JavaScript to update a CSS variable on every toggle, which means a flash if JS is slow. Flex row + CSS transition on sidebar width gives a smooth collapse with no JS involvement.

**Decision: CSS transition on sidebar `width` and `min-width` (not `transform`)**
Rationale: Transform-based collapse would require the sidebar to always occupy its full width in the flow (using absolute positioning) — recreating the original overlap problem. Width transition lets the flex layout reflow smoothly so the main content area grows/shrinks in sync.

**Decision: new `sidebar.css` file instead of extending `index.css`**
Rationale: `index.css` is already long and covers global tokens and utilities. Sidebar component styles are self-contained. A co-located `sidebar.css` keeps the component modular and avoids the global file growing further.

**Decision: `SidebarProvider` lives inside `AppLayout`, not in `App.jsx`**
Rationale: The sidebar context is only relevant within the authenticated shell. Auth pages don't need it. Scoping the provider to AppLayout keeps the context tree clean.

---

## Navigation Mapping (existing routes → new labels)

| Route | Old label | New label |
|---|---|---|
| `/dashboard` | Dashboard | Workspace Hub |
| `/files` | Files | Codebase |
| `/requirements` | Requirements | Requirements |
| `/agents` | Agents | Agents |
| `/impact-analysis` | Impact Analysis | Impact Analysis |
| `/code-review` | Code Review | Code Review |
| `/pr-generator` | PR Generator | PR Generator |
| `/analytics` | Analytics | Analytics |
| `/settings` | Settings | Settings (bottom-pinned) |
