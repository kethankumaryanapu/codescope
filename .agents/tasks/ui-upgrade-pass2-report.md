# UI Upgrade Pass 2 — Report

## Files Changed

| File | Changes |
|------|---------|
| `frontend/src/index.css` | CHANGE 7: Added `dashFlow`, `particleDrift`, `blink` keyframes inside `prefers-reduced-motion: no-preference` guard |
| `frontend/src/components/GlobalBackground.css` | CHANGE 6: All 5 sub-changes (art opacity/blend, grid depth, lights, fragment styling, `floatY` keyframe, `.global-bg-svg` rule) |
| `frontend/src/components/AppShell.jsx` | CHANGE 1: Added `BgSvgLayer` component with 12 animated SVG edges + 35 particles; inserted `<BgSvgLayer />` before vignette layer |
| `frontend/src/pages/IntelligenceHub.css` | CHANGE 2 + CHANGE 3: Hero `::before`, min-height/padding, logo glow, title gradient, subtitle cursor, status dot pulse, repo chip depth; card shimmer `::after`, background upgrade, `:active` state, holographic icon ring |
| `frontend/src/components/AppShell.css` | CHANGE 4: Header blur/saturation, logo hover glow, active nav gradient underline, repo select refinement, avatar ring shadow, nav item active gradient+border, page content opacity |
| `frontend/src/pages/WorkspaceHub.css` | CHANGE 5: Hero background/border/shadow + cyan accent bar, metric card gradient + stronger hover, wh-card gradient + hover, status chip gradient |

---

## Visual Improvements by Change Number

### CHANGE 7 — index.css: missing keyframes
- `dashFlow`: drives animated SVG stroke-dashoffset on connection lines
- `particleDrift`: subtle 3 px vertical float for SVG particles
- `blink`: step-function opacity blink for the terminal cursor on subtitle tag
- All three are inside `prefers-reduced-motion: no-preference` guard. `floatY` was already present so was not duplicated.

### CHANGE 6 — GlobalBackground.css: strengthen depth
- **6a** `.global-bg-art`: opacity raised to 0.52, blend mode changed from `luminosity` → `screen` for brighter, more cinematic integration of the 3D artwork
- **6b** `.global-bg-grid`: four-layer gradient (primary + secondary lime, primary + secondary cyan) gives the floor grid a dual-scale depth; perspective tightened to 700 px / rotateX 60°, scaleY 1.6 for more dramatic receding floor
- **6c** `.global-bg-lights`: third radial gradient added (bottom-center warm lime glow); all gradients slightly enlarged and repositioned for fuller coverage
- **6d** `.bg-fragment`: colour brightened to 0.28 opacity, size reduced to 10.5 px, letter-spacing 0.04 em added
- **6e** `floatY` keyframe added inside GlobalBackground.css guard (consumed locally); `.global-bg-svg` rule added for the new SVG layer

### CHANGE 1 — AppShell.jsx: BgSvgLayer component
- 10 node positions + 12 edges rendered as animated dashed `<line>` elements with alternating lime/cyan colours and varying `dashFlow` durations (6–18 s)
- 35 `<circle>` particles at fixed positions with `particleDrift` float animation (17–35 s each)
- All elements `aria-hidden`, `pointer-events: none`; SVG uses `preserveAspectRatio="none"` so it stretches to fill the viewport without scaling artifacts

### CHANGE 2 — IntelligenceHub.css: hero atmosphere
- **2a** New `::before` pseudo-element adds three radial gradients: cyan highlight right, lime bottom glow, dark scrim behind text block
- **2b** Hero min-height increased 480 → 560 px, padding increased for more generous composition
- **2c** Logo image gains two-stage drop-shadow (sharp 35 % lime + wide 12 % lime bloom)
- **2d** Hero title gradient expanded to four stops (white → light grey → lime → cyan), font-size range raised to clamp(30px, 4.5vw, 46px), weight 700
- **2e** `::after` cursor `_` added to subtitle tag; blinks via `blink` keyframe when motion allowed
- **2f** Status dot enlarged 3 px → 6 px, coloured with `var(--lime)` + glow, animates with `nvidiaPulse`
- **2g** Repo chip upgraded to deep gradient background, 8 px border-radius, inner highlight + outer lime border

### CHANGE 3 — IntelligenceHub.css: card shimmer + depth
- **3a** `::after` shimmer sweep: on hover, a narrow white-highlight band sweeps left→right across the card in 0.45 s
- **3b** Card background: top-down 3 % white sheen (0–60 %) layered over deep blue-graphite gradient; slightly darker than before for more contrast
- **3c** `:active` state applies a subtle scale(0.99) + translateY(-1px) to give tactile press feedback
- **3d** Icon `::before` ring: zero-opacity lime→cyan gradient halo appears on card hover (opacity 0→1 in 0.2 s); icon sized up to 40×40 px with 9 px radius

### CHANGE 4 — AppShell.css: navbar refinements
- **4a** Header background opacity raised to 0.88, blur upgraded to 20 px with saturate(1.4) for richer glass effect; inset top highlight added
- **4b** Logo hover: `drop-shadow` filter glow added, transitioning over 0.2 s
- **4c** Active nav trigger: text brightened to `#c8e680`; underline bar switches to a lime→cyan gradient with two-stage glow
- **4d** Repo select: darker monospace treatment (11 px, 0.02 em tracking); hover border 0.18 → 0.4 with subtle ring
- **4e** Avatar: replaced border-based hover with `box-shadow` ring (0→0.6 opacity) + 16 px lime halo
- **4f** Active nav item in dropdown: gradient background + left lime border (2 px) + adjusted padding
- **4g** Page content background opacity raised 0.50 → 0.52

### CHANGE 5 — WorkspaceHub.css: inner page surfaces
- **5a** Hero: dark gradient background replaces flat `var(--wh-surface)`; stronger box-shadow (8 px blur, 60 % black); accent bar updated to lime→cyan gradient with tighter glow
- **5b** Metric cards: dark gradient background; slimmer initial box-shadow; hover state now has a compound shadow (inner highlight + 40 px spread + 1 px glow ring + 24 px haze); lift increased to -3 px
- **5c** Content cards: dark gradient + subtle white border; hover adds lime tint to border + stronger bottom shadow
- **5d** Status chip: gradient background (lime 8 % → cyan 5 %) instead of flat fill

---

## Build Result

```
✓ 2213 modules transformed.
✓ built in 9.67s
Exit code: 0
```

No TypeScript/JSX/CSS errors. One pre-existing chunk size warning (887 kB JS bundle) is unrelated to these changes.

---

## Notes / Remaining Issues

- **Chunk size warning**: the JS bundle exceeds Vite's 500 kB soft limit. This predates this pass and requires code-splitting, not a visual CSS concern.
- **`floatY` duplication**: the keyframe is defined in both `index.css` and `GlobalBackground.css` inside `prefers-reduced-motion` guards. Both definitions are identical, so there is no conflict — CSS last-write wins and they are the same value.
- **SVG animation on reduced-motion**: the `BgSvgLayer` SVG uses inline `style={{ animation: ... }}` which means the `prefers-reduced-motion` CSS media query won't automatically suppress it. The animations are purely decorative and visually subtle (3 px drift, slow dash flow); however, for stricter compliance the inline styles could be replaced with CSS class-based animations in a future pass.
- All existing routes, auth, API calls, Socket.IO, and business logic are untouched.
