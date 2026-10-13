# CodeScope cinematic UI upgrade — visual layer review

This change layers a 5-depth 3D background system over the existing CodeScope frontend, upgrades the navbar to glassmorphic treatment, applies 3D tilt cards to IntelligenceHub, refreshes the auth split-screen with ambient orbs and a layered card, and hardens WorkspaceHub panels with shadow and surface depth. No routes, API calls, auth logic, or business data were touched. The `prefers-reduced-motion` guard is applied in index.css for keyframe definitions, in GlobalBackground.css for layer animations, and in IntelligenceHub.css for card entrance staggering; the JS tilt handlers check the media query reactively via subscribed `useState`/`useEffect` pairs. Watch for: `GlobalBackground.css` references the `floatY` keyframe that lives only in `index.css` — a cross-file dependency not yet self-contained, unlike the `ambientDrift` fix already applied to `auth.css`.

**Verdict**: APPROVED

---

## High-level view

The 5-layer background system is fully realised in `GlobalBackground.css` with all six required class names, correct z-index ordering, and `pointer-events: none` on every layer including the `.global-bg` container. `AppShell.jsx` emits the matching `aria-hidden="true"` container with all six child divs and six `.bg-fragment` spans. The `floatY` keyframe referenced by `.bg-fragment` is defined only in `index.css` — a cross-file dependency that works in production but means `GlobalBackground.css` is not self-contained; the same pattern was already fixed for `ambientDrift` in `auth.css` and should be applied here too.

IntelligenceHub tilt handlers gate on reactive `prefersReduced` and `isTouch` state (fixed in the second iteration from stale one-time reads), and card entrance stagger is scoped to `@media (prefers-reduced-motion: no-preference)`. The auth page's local `@keyframes ambientDrift` definition inside the motion guard is confirmed self-contained. WorkspaceHub shadow and surface upgrades are isolated behind scoped `--wh-*` tokens.

The build record reports exit code 0, 9.14 s, 2213 modules, no errors — one pre-existing 885 kB chunk-size warning is unrelated to this change.

---

<details>
<summary>Issues (1)</summary>

1. **`floatY` cross-file keyframe dependency** — `.bg-fragment` in `GlobalBackground.css` references `floatY` which is defined only in `index.css`. If `GlobalBackground.css` is ever imported in isolation (Storybook, micro-frontend), the animation silently drops. Add `@keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }` inside the `@media (prefers-reduced-motion: no-preference)` block in `GlobalBackground.css`, mirroring the fix already applied to `ambientDrift` in `auth.css`. (confirmed)

</details>

---

<details>
<summary>Details</summary>

### `floatY` cross-file dependency in GlobalBackground.css

`.bg-fragment` in `GlobalBackground.css` contains:

```css
@media (prefers-reduced-motion: no-preference) {
  .bg-fragment {
    animation: floatY var(--dur, 24s) ease-in-out infinite var(--delay, 0s);
  }
}
```

`floatY` is only defined in `index.css`. In the Vite production build both files land in the same document so the keyframe resolves, but `GlobalBackground.css` cannot stand alone. The team already identified this exact risk with `ambientDrift` and fixed it in `auth.css` (build-verify.md, Finding 1). Adding a local `@keyframes floatY` definition to `GlobalBackground.css` closes the gap with a two-line change.

### IntelligenceHub tilt system

`handleTiltMove` and `handleTiltLeave` write `--tx`/`--ty` as inline CSS custom properties directly on the card element, consumed by `transform: perspective(900px) rotateX(var(--ty, 0deg)) rotateY(var(--tx, 0deg))` at rest and `translateY(-4px) translateZ(8px)` on `:hover`. Both handlers early-return when `prefersReduced || isTouch`. The reactive `matchMedia` subscriptions via `addEventListener('change', …)` with cleanup on unmount mean the guard responds correctly to OS preference changes at runtime — not just at mount time, which was the stale-read bug fixed in the second iteration.

Card entrance stagger (`opacity: 0; animation: fadeUp …`) scoped inside `@media (prefers-reduced-motion: no-preference)` means cards without motion preference have no initial `opacity: 0` applied — they display immediately without waiting for an animation that never fires.

### Auth page motion containment

`.auth-left::before` and `::after` pseudo-elements carry `pointer-events: none` and are animated only inside the `@media (prefers-reduced-motion: no-preference)` block with a locally-defined `@keyframes ambientDrift`. The mobile breakpoint additionally sets `animation: none; display: none`, suppressing the orbs on small screens regardless of motion preference — correct belt-and-suspenders approach for a layout that hides the left panel entirely.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `src/index.css` | Cinematic CSS tokens (`--lime`, `--cyan`, `--bg`, `--surface-*`, `--border`, `--glow-*`) in `:root`; guarded keyframes (`ambientDrift`, `floatY`, `fadeUp`, `scanline`) and `.fade-up-stagger` utility |
| `src/components/GlobalBackground.css` | 6-layer depth system with z-index architecture, responsive opacity breakpoints |
| `src/components/AppShell.jsx` | `global-bg` container with 6 child layers and 6 `.bg-fragment` spans; no logic changes |
| `src/components/AppShell.css` | Glassmorphic navbar (`backdrop-filter: blur(12px)`, hairline border); active-tab lime underline with glow; `:focus-visible` rings on all interactive elements |
| `src/pages/IntelligenceHub.css` | Feature cards: layered gradient surface, `--tx`/`--ty` tilt vars, hover lift, icon holographic gradient; entrance stagger guarded by motion query |
| `src/pages/IntelligenceHub.jsx` | Reactive `prefersReduced`/`isTouch` state with `matchMedia` subscriptions; `handleTiltMove`/`handleTiltLeave` wired to card events |
| `src/pages/auth.css` | Ambient orbs on `.auth-left`; layered `.auth-card` surface; lime gradient `.auth-submit-btn`; self-contained `@keyframes ambientDrift` inside motion guard |
| `src/pages/WorkspaceHub.css` | Scoped `--wh-*` tokens; shadow layering on `.wh-hero`, `.wh-metric-card`, `.wh-card`; hero top-accent line; metric card hover lift + glow |

Full diff: `git diff main -- src/index.css src/components/GlobalBackground.css src/components/AppShell.jsx src/components/AppShell.css src/pages/IntelligenceHub.css src/pages/IntelligenceHub.jsx src/pages/auth.css src/pages/WorkspaceHub.css`

</details>
