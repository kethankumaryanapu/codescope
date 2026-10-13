# Pass 2 UI Upgrade — CodeScope Frontend

Pass 2 adds a decorative SVG connection-line/particle layer (`BgSvgLayer`), deepens the perspective grid and ambient lighting in `GlobalBackground.css`, upgrades the Intelligence Hub hero and feature cards, refines the AppShell navbar glass effect and active states, and adds surface depth to WorkspaceHub's hero and metric/content cards. All changes are scoped to CSS and one JSX component; no routes, API calls, business logic, or backend files were touched. The build passes cleanly (exit 0, 9.67 s).

Watch for: **(confirmed)** `BgSvgLayer` uses inline `style={{ animation: ... }}` on every line and particle, bypassing the `@media (prefers-reduced-motion)` CSS guard; **(confirmed)** `floatY` keyframe is defined in both `index.css` and `GlobalBackground.css`, creating a redundant declaration; **(possible)** `overflow: visible` on `.global-bg-svg` combined with `preserveAspectRatio="none"` could allow SVG geometry near the 100-viewBox boundary to render outside the fixed container on some browsers.

**Verdict**: NEEDS_CHANGES

---

## High-level view

Every CSS animation across all six changed files is guarded by `@media (prefers-reduced-motion: no-preference)`. The gap is in `AppShell.jsx`: the 12 `<line>` and 35 `<circle>` elements in `BgSvgLayer` carry inline `style={{ animation: ... }}` strings. CSS media queries cannot override inline styles, so these 47 animated elements play regardless of the user's motion preference setting — the one place the motion guard was applied correctly at the CSS level is defeated by the JSX that consumes it.

The SVG layer has `overflow: visible` set in `.global-bg-svg`. This is low risk because the element sits inside the `position: fixed` `.global-bg` container, but particle coordinates at the viewbox edge (e.g. `cx=3, r=1.5`) can extend 1–2 px outside the SVG bounding box. Browser clipping behavior on fixed-position overflow differs enough to be worth a targeted fix.

All existing class names targeted by the CSS changes are confirmed present in their respective JSX components — no orphan selectors. `package.json` is unchanged; no new dependencies were added.

---

<details>
<summary>Issues (3)</summary>

1. **BgSvgLayer ignores prefers-reduced-motion** — All 47 animated elements in `BgSvgLayer` use inline `style={{ animation: ... }}`, which CSS media queries cannot override. Users with `prefers-reduced-motion: reduce` will see continuous animation. Move the animation values to CSS classes in `GlobalBackground.css` (already guarded by the `@media (prefers-reduced-motion: no-preference)` block), apply those classes to the elements, and remove the inline style attributes. This was flagged in the pass 2 report's own "Remaining Issues" section and was not fixed.

2. **Duplicate `floatY` keyframe** — `floatY` is defined identically in both `index.css` (inside the `prefers-reduced-motion: no-preference` guard at the bottom) and `GlobalBackground.css` (at the bottom, also guarded). While CSS last-write wins and the definitions are identical today, the duplication is a maintenance trap: a future change to one copy will silently diverge from the other. Remove the definition from `GlobalBackground.css` and rely on the single declaration in `index.css`.

3. **SVG `overflow: visible` on fixed-position layer** — `.global-bg-svg` sets `overflow: visible`. With `preserveAspectRatio="none"` and particle/node coordinates placed at coordinates 3–97 (well inside the viewport), the risk is low in practice, but SVG stroke half-widths and particle radii at the boundary (e.g. `cx=3, r=1.5`) can render 1–2 px outside the SVG bounding box. On browsers that don't clip fixed-position overflow, this is invisible; on those that do, particles near the edges may be clipped. Worth either clamping all coordinates to `[3, 97]` (already largely the case) or switching to `overflow: hidden` on the SVG element since the container already clips it.

</details>

<details>
<summary>Details</summary>

### `BgSvgLayer` and the prefers-reduced-motion gap

The `BgSvgLayer` component hardcodes animation directly in JSX:

```jsx
style={{ animation: `dashFlow ${dur}s linear infinite` }}
// and
style={{ animation: `particleDrift ${p.dur}s ease-in-out infinite` }}
```

Because these are inline styles, the browser applies them with the highest specificity and CSS media queries cannot suppress them. A user who has enabled `prefers-reduced-motion: reduce` in their OS settings will still see 12 animated dashed lines and 35 drifting particles. The fix is to move animation into CSS classes:

```css
/* GlobalBackground.css — inside the existing guard */
@media (prefers-reduced-motion: no-preference) {
  .bg-svg-edge  { animation: dashFlow var(--dur, 10s) linear infinite; }
  .bg-svg-dot   { animation: particleDrift var(--dur, 24s) ease-in-out infinite; }
}
```

Then in JSX, pass `--dur` as a CSS custom property via inline style and set the class:

```jsx
<line className="bg-svg-edge" style={{ '--dur': `${dur}s` }} ... />
<circle className="bg-svg-dot" style={{ '--dur': `${p.dur}s` }} ... />
```

The pass 2 report explicitly flags this issue under "Remaining Issues" but marks it as a "future pass" item. Given the goal of WCAG compliance and the explicit `prefers-reduced-motion` requirement in the original brief, this is a blocking concern rather than a deferred nicety.


</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `frontend/src/index.css` | Added `dashFlow`, `particleDrift`, `blink` keyframes inside existing `prefers-reduced-motion` guard |
| `frontend/src/components/AppShell.jsx` | Added `BgSvgLayer` component (SVG decorative layer); inserted before vignette in background div |
| `frontend/src/components/AppShell.css` | Header blur/saturation, logo hover glow, active nav underline gradient, repo select, avatar ring, active dropdown item, page content opacity |
| `frontend/src/components/GlobalBackground.css` | Art opacity/blend mode, grid depth gradients, lights third gradient, fragment opacity/size, `floatY` keyframe (duplicate), `.global-bg-svg` positioning rule |
| `frontend/src/pages/IntelligenceHub.css` | Hero `::before` gradients, `::after` cursor blink, min-height/padding, logo glow, title gradient, status dot, repo chip depth; card `::after` shimmer, background, `:active` state, icon `::before` ring |
| `frontend/src/pages/WorkspaceHub.css` | Hero background/border/shadow + accent bar gradient; metric card gradient + compound hover shadow; content card gradient + hover; status chip gradient |

Full diff available via `git diff main` against the base branch.
</details>
