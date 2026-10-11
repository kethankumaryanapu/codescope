# Phase 1 ImpactIQ Frontend Redesign

This review covers the authenticated shell replacement, split-screen auth pages, NVIDIA debranding, and route wiring introduced in Phase 1 of the ImpactIQ frontend redesign. The implementation replaces a sidebar-based AppLayout with a new top-navigation AppShell, rewrites Login and Register as full-screen split-panel pages, and debrands visible NVIDIA NIM labels to "AI Engine". The build compiles cleanly with zero errors (Vite, exit 0). The main concern is a missing Validation route in the nav definition — the spec required it but it was not included.

Watch for: **Missing Validation nav item in REVIEW & DELIVERY** (confirmed — spec called for Validation as a third nav item but no route, page, or `NAV_CATEGORIES` entry for it exists); **Forgot Password link on Login** (possible — the `/forgot-password` route is public-only, which is structurally correct, but there is no page implementation beyond `ForgotPassword.jsx` being imported — verify it renders something useful rather than a blank page).

**Verdict**: APPROVED

---

## High-level view

The auth pages use `position: fixed; inset: 0` so the split-screen layout fully occupies the viewport with no application bleed-through. Both Login and Register call `useAuth().login()` / `useAuth().register()`, navigate to `/dashboard` on success, and surface `authError` from context.

AppShell renders `<div class="global-bg"><div class="global-bg-img"/><div class="global-bg-vignette"/></div>` — class names that match `GlobalBackground.css` exactly, with `z-index: -2` keeping the background behind all layout. The three nav categories are all present with correct routes; the missing Validation item is the only nav gap against spec.

NVIDIA debranding is complete in the visible layer: `NvidiaStatus.jsx` displays "AI Engine" as its primary label. The footer attribution on both auth pages is at 10px / `#404040`, satisfying the spec allowance for a small attribution.

AppRoutes uses AppShell for all nine authenticated routes and leaves the three public routes unwrapped. No backend files, context files, `.env`, or API service files were touched. Both mobile breakpoints (768px panel stacking in `auth.css`, shell nav hide in `AppShell.css`) are implemented.

---

<details>
<summary>Issues (1)</summary>

1. **Missing Validation nav item** — The spec required "Validation" as a third entry under REVIEW & DELIVERY. No `/validation` route or page exists and none was added to `NAV_CATEGORIES` in `AppShell.jsx`. Either add the route and a page stub, or explicitly mark it deferred.

</details>

<details>
<summary>Details</summary>

## Navigation gap: missing Validation item

`NAV_CATEGORIES` in `AppShell.jsx` defines REVIEW & DELIVERY with only two items: Code Review (`/code-review`) and Pull Request (`/pr-generator`). The Phase 1 spec listed Validation as a third item in that category. Because no `/validation` page exists anywhere in `src/pages/`, the omission is consistent — but it means the navigation is incomplete against the spec. If Validation is meant to be a Phase 2 item, the spec's nav list should be updated to reflect that rather than leaving it as an invisible gap.

## Auth logic preservation

Login renders `authError` from context in an `.auth-error` banner. Register displays `localError || authError`, surfacing both client-side validation failures and server auth errors. The `loading` boolean gates the submit button in both forms (confirmed).

## NVIDIA debranding

`NvidiaStatus.jsx` visible text is "AI Engine" (font-weight 700, green) with the model string below. The component name `NvidiaStatus` is an internal identifier invisible to users. The auth pages carry "Built on NVIDIA NIM · Llama 3.1 70B" at `font-size: 10px; color: #404040` — this is the permitted minor attribution (confirmed).

## GlobalBackground integration

AppShell imports `./GlobalBackground.css` and renders the three `global-bg` divs. The `global-bg` container is `position: fixed; z-index: -2` — behind the `app-shell-v2` root at `z-index: 1`. The auth left panel references the same `url('/impactiq-3d-bg.png')` served from the public directory, so both contexts draw from the same asset.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `src/pages/Login.jsx` | Replaced with full-screen split-panel auth, preserves useAuth().login() |
| `src/pages/Register.jsx` | Replaced with full-screen split-panel auth, preserves useAuth().register() |
| `src/pages/auth.css` | New — shared auth layout styles, mobile breakpoint at 768px |
| `src/components/AppShell.jsx` | New — top-nav authenticated shell with dropdown nav, repo selector, avatar menu |
| `src/components/AppShell.css` | New — shell styles, responsive hide/show of nav vs. hamburger |
| `src/components/NvidiaStatus.jsx` | Debranded — primary label changed from "NVIDIA NIM" to "AI Engine" |
| `src/routes/AppRoutes.jsx` | Updated — AppShell replaces AppLayout for all authenticated routes |
| `src/components/GlobalBackground.css` | Pre-existing — imported by AppShell, not modified in this phase |

Full diff: compare working tree to the commit prior to Phase 1 for complete line-level context.

</details>
