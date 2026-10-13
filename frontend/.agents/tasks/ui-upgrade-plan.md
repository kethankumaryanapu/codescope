# UI Upgrade Implementation Plan — CodeScope Premium 3D Visual

> **Scope:** Visual-only. No backend changes, no route changes, no auth/API/Socket.IO changes.
> **Build command:** `npm run build` (Vite 6, from `frontend/`)
> **Dev command:** `npm run dev`
> **No test framework** present in package.json — verification is build + manual visual check.

---

## 0. Codebase Findings (read before implementing)

### 0.1 GlobalBackground.css — current selectors that matter

| Selector | Current state |
|---|---|
| `.global-bg` | `position: fixed; inset: 0; z-index: -2; background: #050a0f` — the base container. **Keep as-is.** |
| `.global-bg-img` | `position: absolute; inset: 0; background-image: url('/codescope-3d-bg.png'); background-size: cover; background-position: center 40%; opacity: 0.55; mix-blend-mode: normal` — the image layer. **This is the primary target for depth/parallax layering.** |
| `.global-bg-vignette` | Multi-layer radial/linear gradient overlay for edge fade. **Keep; may deepen for inner pages.** |
| `.page-content` | Defined here as `background: rgba(5, 10, 15, 0.35)`. **Conflict risk:** also exists in `index.css` (partially) and `AppShell.css` (`.shell-page-content`). `.page-content` in GlobalBackground will apply globally — the inner-page dimming for non-home routes goes here via a route-aware class on `<body>` or on `.global-bg-img` directly. |

**No rename needed.** All three selectors are stable and referenced correctly. The `.global-bg-img` `opacity` and any new parallax children go into new sibling divs inside `.global-bg`, not by renaming `.global-bg-img`.

### 0.2 AppShell.jsx — global-bg div

`AppShell.jsx` already renders the background at the **top of its return**, before the header:

```jsx
<div className="global-bg" aria-hidden="true">
  <div className="global-bg-img" />
  <div className="global-bg-vignette" />
</div>
```

This is in `AppShell` (the authenticated shell, wraps all inner pages). It is **not** in auth pages — auth pages use their own layout with no `.global-bg`.

The `/hub` (IntelligenceHub) route is the home route; all other authenticated routes are "inner pages". The distinction for dimming must be done inside `AppShell` by checking `location.pathname`.

### 0.3 IntelligenceHub.jsx — card mouse-event handlers

**None exist.** The `ih-card` elements are plain `<button>` elements with only an `onClick` calling `navigate(card.to)`. There are no `onMouseMove`, `onMouseEnter`, `onMouseLeave`, or pointer-tilt handlers. All 3D tilt effects must be added fresh.

### 0.4 AppShell.css — exact selectors for header / repo / dropdown

| Selector | Current value (key properties) |
|---|---|
| `.shell-header` | `height: 60px; position: sticky; top: 0; z-index: 100; background: #0f1117; border-bottom: 1px solid #252830` |
| `.shell-repo-select` | `padding: 5px 10px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #9ba3b0; font-size: 12px; max-width: 160px` |
| `.shell-nav-dropdown` | `position: absolute; top: calc(100% + 6px); background: #16191f; border: 1px solid #252830; border-radius: 8px; box-shadow: 0 8px 28px rgba(0,0,0,0.65); padding: 6px; z-index: 150` |
| `.shell-user-dropdown` | `position: absolute; right: 0; top: 40px; width: 220px; background: #16191f; border: 1px solid #252830; border-radius: 8px` |
| `.shell-action-btn` | `width: 32px; height: 32px; border-radius: 7px; background: rgba(255,255,255,0.04); border: 1px solid #2e333d` |
| `.shell-avatar` | `width/height: 32px; border-radius: 50%; background: #76b900` |
| `.shell-nav-trigger.active::after` | 2px lime underline bar at bottom |

### 0.5 auth.css — existing selectors

All target selectors **are present**:

| Selector | Present? | Notes |
|---|---|---|
| `.auth-submit-btn` | ✅ | `background: #76b900; color: #000; border-radius: 7px` |
| `.auth-card` | ✅ | `background: #16191f; border: 1px solid #252b35; border-radius: 12px; padding: 40px` |
| `.auth-input` | ✅ | `background: transparent; border: none` (inside `.auth-input-wrap`) |
| `.auth-left` | ✅ | `width: 50%; background: #0d0f12` with `::before`/`::after` CSS glows |
| `.auth-right` | ✅ | `width: 50%; background: #111318` |
| `.auth-wordmark` | ✅ | Uses `.auth-wordmark-impact` / `.auth-wordmark-iq` sub-classes |

**Note:** The left panel comment says "ImpactIQ Authentication" — the `.auth-wordmark-iq` class colors `#00c8a0` (teal). This branding color is a visual issue: the wordmark shows "ImpactIQ" naming. The `auth.css` selector `.auth-wordmark-iq` must be kept (it's a CSS class name, not visible text), but the displayed text in `auth.jsx` should be verified to say "CodeScope" not "ImpactIQ". This is a **branding check**, not a CSS rename.

### 0.6 WorkspaceHub.css — existing selectors

All target selectors **are present**:

| Selector | Present? | Key properties |
|---|---|---|
| `.wh-hero` | ✅ | `background: var(--wh-surface); border-radius: 14px; padding: 28px` with `::before` lime accent bar |
| `.wh-metric-card` | ✅ | `background: var(--wh-surface); border-radius: 12px` with hover lift `translateY(-2px)` |
| `.wh-card` | ✅ | `background: var(--wh-surface); border-radius: 12px; padding: 24px` |

Custom tokens `--wh-surface`, `--wh-surface-2`, `--wh-surface-3`, `--wh-border`, `--wh-border-2` are scoped under `.workspace-hub {}`. These are safe to enhance without touching other pages.

---

## Implementation Plan

---

- [ ] 1. **CSS Design Tokens — add missing cinematic variables to `index.css`**

  Add `--lime`, `--cyan`, `--glow`, `--surface-1`, `--surface-2`, `--surface-3` as aliases to existing values, plus new `--blur-glass`, `--border-glow`, `--glow-lime`, `--glow-cyan` for consistent reuse. Also add `@keyframes ambientDrift`, `@keyframes floatY`, and `@keyframes fadeUp` that all subsequent items reference.

  Files: `src/index.css`

  Verify: `npm run build` — exits 0, no CSS parse errors.

---

- [ ] 2. **GlobalBackground.css — 5-layer depth stack + ambient animation + inner-page dimming**

  Replace the single `.global-bg-img` div with five sibling divs inside `.global-bg` in AppShell (see item 3). In CSS, target the new class names:

  - `.global-bg-art` — the actual image, `opacity: 0.55`, `mix-blend-mode: normal`, `animation: ambientDrift 30s ease-in-out infinite`
  - `.global-bg-grid` — CSS perspective grid floor using `repeating-linear-gradient`, `opacity: 0.07`, `animation: ambientDrift 40s reverse infinite`
  - `.global-bg-particles` — 8–10 pseudo-element dots (`::before`/`::after` on sub-divs) with `animation: floatY 20s ease-in-out infinite`, `opacity: 0.12`
  - `.global-bg-lime-light` — radial gradient lime glow, bottom-left, `opacity: 0.12`
  - `.global-bg-cyan-light` — radial gradient cyan glow, top-right, `opacity: 0.10`
  - `.global-bg-vignette` — unchanged from current (multi-edge gradient)

  Add `.global-bg-img` as a **backwards-compatible alias** pointing to `.global-bg-art` so no other files break (AppShell uses `.global-bg-img` — will be changed in item 3).

  Add `.app-shell-v2.inner-route .global-bg-art` rule: `opacity: 0.20; filter: blur(3px)` — dims and softens the background on all non-hub pages. The `inner-route` class is added by AppShell logic (item 3).

  Add `@media (prefers-reduced-motion: reduce)` block that sets all animation-duration to `0.01ms` and removes blur filters.

  Files: `src/components/GlobalBackground.css`

  Verify: `npm run build` — exits 0.

---

- [ ] 3. **AppShell.jsx — expand global-bg div + inner-route class + pointer-tilt hook**

  Three changes, all visual-only:

  a. Expand the existing `<div className="global-bg">` to render five children matching the CSS layers from item 2:
  ```jsx
  <div className="global-bg" aria-hidden="true">
    <div className="global-bg-art" />
    <div className="global-bg-grid" />
    <div className="global-bg-lime-light" />
    <div className="global-bg-cyan-light" />
    <div className="global-bg-vignette" />
  </div>
  ```
  Remove the old `<div className="global-bg-img" />` line.

  b. Derive `isInnerRoute` from `location.pathname`: hub (`/hub` or `/`) = home; all others = inner. Apply `inner-route` class to `.app-shell-v2`:
  ```jsx
  const isInnerRoute = location.pathname !== '/hub' && location.pathname !== '/';
  <div className={`app-shell-v2${isInnerRoute ? ' inner-route' : ''}`}>
  ```

  c. Import and apply a `usePointerTilt` hook (created in item 4) to the `.shell-header` element — this enables the subtle pointer parallax on the navbar. The hook returns `{ style }` with `transform: perspective(800px) rotateX(...) rotateY(...)` at max ±1.5° (very subtle for a sticky header).

  Files: `src/components/AppShell.jsx`

  Verify: `npm run build` — exits 0. Dev server shows background layers; `/hub` shows full-opacity art, any inner page shows dimmed/blurred art.

---

- [ ] 4. **Create `usePointerTilt.js` hook**

  A tiny custom hook (~40 lines) that:
  - Tracks `mousemove` on a ref element (or `window` if no ref)
  - Returns `{ ref, style }` with `transform: perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg)`
  - Accepts `{ maxDeg = 6, perspective = 900, disabled = false }` options
  - Sets `disabled = true` automatically when `window.matchMedia('(hover: none)').matches` (touch devices)
  - Respects `prefers-reduced-motion` via `window.matchMedia('(prefers-reduced-motion: reduce)')` — returns empty style if true
  - On `mouseleave`, smoothly resets to `rotateX(0) rotateY(0)` via a short CSS transition rather than a JS animation loop

  Files: `src/hooks/usePointerTilt.js` (new file)

  Verify: `npm run build` — exits 0.

---

- [ ] 5. **AppShell.css — glassmorphic navbar upgrade**

  Modify existing selectors **only** (no new class names for existing elements):

  - `.shell-header`: change `background: #0f1117` → `background: rgba(8, 10, 14, 0.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.06)`
  - `.shell-nav-trigger.active::after`: already has a 2px lime underline — add `box-shadow: 0 0 6px rgba(118,185,0,0.5)` glow
  - `.shell-nav-trigger:focus-visible`: add `outline: 2px solid #76b900; outline-offset: 2px`
  - `.shell-repo-select`: add `transition: border-color 0.15s, box-shadow 0.15s` and focus state `box-shadow: 0 0 0 2px rgba(118,185,0,0.25)`
  - `.shell-nav-dropdown`, `.shell-user-dropdown`: add `backdrop-filter: blur(8px); background: rgba(22,25,31,0.92)`
  - `.shell-action-btn:focus-visible`: already present — verify lime outline is there ✅
  - `.shell-avatar:focus-visible`: already present ✅

  Files: `src/components/AppShell.css`

  Verify: `npm run build` — exits 0. Navbar shows blur glass effect.

---

- [ ] 6. **IntelligenceHub.jsx — add pointer-tilt to cards**

  Import `usePointerTilt` and apply it to each `.ih-card` button. Because there are multiple cards, use a per-card approach: wrap the ENTRY_CARDS `.map()` in a sub-component `HubCard` that calls `usePointerTilt({ maxDeg: 6, perspective: 900 })` independently and spreads the returned `style` onto the `<button>`.

  No changes to card content, routes, or business logic.

  Files: `src/pages/IntelligenceHub.jsx`

  Verify: `npm run build` — exits 0.

---

- [ ] 7. **IntelligenceHub.css — cinematic card surfaces + hero depth**

  Enhance existing selectors:

  - `.ih-card`: add `background: linear-gradient(145deg, #1e2128 0%, #252830 100%); box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease`
  - `.ih-card:hover`: add `box-shadow: 0 12px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(118,185,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)` (remove the plain `transform: translateY(-1px)` — the tilt hook handles transform now; replace with `transform: translateZ(8px)` inside a `transform-style: preserve-3d` context on the parent card)
  - `.ih-card-icon`: add `background: linear-gradient(135deg, rgba(118,185,0,0.15) 0%, rgba(0,200,160,0.08) 100%)` holographic tile gradient
  - `.ih-hero`: increase scrim from `rgba(0,0,0,0.45)` to `rgba(0,0,0,0.55)` for better headline readability
  - `.ih-hero-title`: add `text-shadow: 0 1px 20px rgba(0,0,0,0.5)` for lift
  - `.ih-cards`: add `transform-style: preserve-3d` (needed for tilt children)
  - Add `@keyframes fadeUp` usage: `.ih-card:nth-child(1)` delay 0ms, `.ih-card:nth-child(2)` delay 60ms, `.ih-card:nth-child(3)` delay 120ms — `animation: fadeUp 0.45s ease-out both`

  `@keyframes fadeUp` is defined in `index.css` (item 1) and reused here.

  Files: `src/pages/IntelligenceHub.css`

  Verify: `npm run build` — exits 0.

---

- [ ] 8. **auth.css — cinematic lit panel + depth treatment**

  The auth pages render **without** `AppShell`, so they have no `.global-bg`. Add a self-contained depth treatment:

  - `.auth-page`: add `background: radial-gradient(ellipse 120% 100% at 50% -10%, rgba(118,185,0,0.04) 0%, #0a0a0a 50%)`
  - `.auth-left`: deepen the existing CSS-only corner glows — increase `rgba(118,185,0,0.12)` to `0.18` on `::before`, add a third ambient glow via a new `.auth-left-glow` child div (a positioned div rendered in the JSX, not a pseudo-element, to avoid pseudo-element count limits)
  - `.auth-card`: add `box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`
  - `.auth-input-wrap`: already has focus glow — ensure the `box-shadow: 0 0 0 3px rgba(118,185,0,0.08)` is present ✅
  - `.auth-submit-btn:not(:disabled):hover`: already has lime glow ✅ — add `transform: translateY(-1px)`
  - `.auth-wordmark-iq`: rename **displayed color** only — currently `color: #00c8a0` (teal). This is fine as a visual accent. No rename of the CSS class itself. However, **verify in `Login.jsx` / `Register.jsx`** that the text content renders "CodeScope" not "ImpactIQ" (branding check from finding 0.5).

  Files: `src/pages/auth.css`

  Verify: `npm run build` — exits 0. Login page shows lit card and ambient glow on left panel.

---

- [ ] 9. **WorkspaceHub.css — elevate metric cards + hero surface**

  Enhance existing selectors inside the `.workspace-hub` scope:

  - `.wh-hero`: add `box-shadow: 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`; strengthen `::before` gradient to extend further right
  - `.wh-metric-card`: change `background` to `linear-gradient(145deg, var(--wh-surface) 0%, rgba(37,40,48,0.9) 100%)`; hover `box-shadow` already present ✅ — increase to `0 12px 36px rgba(0,0,0,0.5)`; add `inset 0 1px 0 rgba(255,255,255,0.05)` for inner highlight
  - `.wh-card`: add `inset 0 1px 0 rgba(255,255,255,0.04)` inner highlight via `box-shadow`
  - `.wh-metric-value`: add `background: linear-gradient(135deg, #f2f4f7 60%, rgba(118,185,0,0.7) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text` for green-tinted value numerals (only apply when `.wh-metric-card` has a lime accent variant; use a scoped `.wh-metric-card.lime .wh-metric-value` selector to avoid breaking all cards)
  - `.wh-repo-select`: add same focus box-shadow as `.shell-repo-select` for visual consistency
  - Add `animation: fadeUp 0.4s ease-out both` to `.wh-metric-card:nth-child(n)` with 60ms staggered delays (1–4)

  Files: `src/pages/WorkspaceHub.css`

  Verify: `npm run build` — exits 0.

---

- [ ] 10. **Inner-page panel opacity — shell-page-content + page-specific washes**

  The `AppShell.css` `.shell-page-content` currently has `background: rgba(10, 10, 10, 0.42)`. For inner routes (when `.app-shell-v2.inner-route` is set by item 3), increase this to `rgba(8, 10, 14, 0.65)` to ensure the dimmed/blurred background art doesn't interfere with panel readability.

  Add the rule:
  ```css
  .app-shell-v2.inner-route .shell-page-content {
    background: rgba(8, 10, 14, 0.65);
  }
  ```

  Also add a `.app-shell-v2.inner-route .global-bg-art` rule as a belt-and-suspenders override (GlobalBackground.css handles it too — the dual rule ensures specificity wins regardless of import order).

  Files: `src/components/AppShell.css`

  Verify: `npm run build` — exits 0. Inner pages (`/dashboard`, `/files`, `/requirements`, etc.) show panels cleanly without background art bleeding through.

---

- [ ] 11. **Auth JSX branding verification — check Login.jsx and Register.jsx**

  Read `Login.jsx` and `Register.jsx`. Confirm the visible wordmark text says "CodeScope" (not "ImpactIQ"). If it says "ImpactIQ", update only the display text — do not change CSS class names (`.auth-wordmark-impact`, `.auth-wordmark-iq`), IDs, or any logic. This is a text-only change if needed.

  Files: `src/pages/Login.jsx`, `src/pages/Register.jsx` (read first, modify only if branding is wrong)

  Verify: `npm run build` — exits 0. Auth page wordmark shows "CodeScope".

---

- [ ] 12. **Full build + visual checklist**

  Run `npm run build` from `frontend/`. Expected: exit 0, no warnings about missing assets (both `codescope-3d-bg.png` and `codescope-logo.png` exist in `public/`).

  Visual checklist to confirm in browser via `npm run preview`:
  - [ ] `/hub` — full-opacity background art visible, hero cards tilt on pointer hover, ambient drift animation running
  - [ ] `/dashboard` — background art dimmed + blurred, panels readable, metric cards lift on hover
  - [ ] `/login`, `/register` — no background art (auth pages render outside AppShell), lit card with ambient glow on left panel
  - [ ] Navbar — glassmorphic blur visible, active tab has lime underline + glow, repo selector focus ring
  - [ ] Mobile (≤768px) — no horizontal overflow, hamburger works, repo selector hidden (existing CSS)
  - [ ] `prefers-reduced-motion` — animations disabled

  Files: none (verification only)

  Verify: `npm run build` exits 0.

---

## Potential Conflicts and Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | **`.page-content` defined in both `GlobalBackground.css` and potentially other places** — two rules compete. | GlobalBackground.css owns `.page-content` wash; inner-route override goes in `AppShell.css` via `.app-shell-v2.inner-route .shell-page-content` (more specific selector, wins cleanly). |
| 2 | **`backdrop-filter` on `.shell-header` breaks z-index stacking** — `backdrop-filter` creates a new stacking context. The nav dropdowns (`z-index: 150`) are children of the header; they will still render above the page content correctly since they are inside the stacking context. Confirm dropdowns still appear over `.shell-page-content` after change. | Test nav dropdowns on dev server before committing. |
| 3 | **Pointer tilt + `transform-style: preserve-3d`** on cards may conflict with `overflow: hidden` on `.ih-card` — `overflow: hidden` + `border-radius` flattens 3D children in some browsers (Chrome issue). | Use `transform` on the card itself (not a child), and keep `overflow: hidden`. The tilt hook applies style to the outermost element, so no 3D child flattening. |
| 4 | **`-webkit-text-fill-color` gradient on metric values** — if `.wh-metric-value` has `color` set elsewhere, the gradient fill may be overridden. Scope strictly to `.wh-metric-card.lime .wh-metric-value` and do not apply globally. | Scoped selector in item 9. |
| 5 | **Auth pages have no `.global-bg` (no AppShell)** — the background image fix (message 2 of the original request) is already solved: the auth pages use their own CSS panel design without images. No regression risk here. | No action needed; confirmed by reading `auth.css` and `AppShell.jsx`. |
| 6 | **`ambientDrift` animation performance** — animating `background-position` triggers paint. | Use `transform: translateX/Y` on the `.global-bg-art` element instead of animating `background-position`. The element is `position: absolute` and `will-change: transform` can be set safely since it's a single fixed layer. |
| 7 | **`lucide-react` version `^1.28.0`** — unusual semver (major version 1, not 0.x). Confirm icons used in items 6/3 (`FolderTree`, `FileText`, `ShieldCheck`) exist. | Already verified: all icons are already imported and used in the existing IntelligenceHub.jsx. No new icons added. |
| 8 | **No test runner** — there is no Jest/Vitest/etc. in `package.json`. All verification is build-only (`npm run build`) plus manual browser check. | Acceptable per project setup. |
