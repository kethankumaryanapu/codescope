# Pass-2 Context Notes — CodeScope Visual Upgrade

Read-only investigation. No code was changed.

---

## (a) Pseudo-elements on `.ih-hero` and `.ih-card` — IntelligenceHub.css

### `.ih-hero`
Only `::after` is defined; there is **no `::before`** on `.ih-hero`.

```css
.ih-hero::after {
  content: '';
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(118, 185, 0, 0.07) 0%, transparent 70%);
  top: -100px;
  left: -80px;
  pointer-events: none;
}
/* animated when prefers-reduced-motion: no-preference */
/* animation: floatY 20s ease-in-out infinite; */
```

### `.ih-card`
Only `::before` is defined; there is **no `::after`** on `.ih-card`.

```css
.ih-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(to right, #76b900 0%, rgba(118, 185, 0, 0.2) 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.15s;
}
/* Revealed on hover: .ih-card:hover::before { opacity: 1; } */
```

---

## (b) Current CSS rules in AppShell.css

### `.shell-header`
```css
.shell-header {
  height: 60px;
  min-height: 60px;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(5, 10, 15, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(118, 185, 0, 0.12);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 0;
  flex-shrink: 0;
  overflow: visible;
}
```

### `.shell-logo`
```css
.shell-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
  margin-right: 28px;
}
```

### `.shell-nav-trigger`
```css
.shell-nav-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  color: #606060;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
  position: relative;
  line-height: 1;
}

/* ::after — underline bar */
.shell-nav-trigger::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 12px;
  right: 12px;
  height: 2px;
  background: #76b900;
  border-radius: 1px;
  opacity: 0;
  transition: opacity 0.15s;
}

/* hover */
.shell-nav-trigger:hover {
  color: #c0c0c0;
  background: rgba(255,255,255,0.04);
}

/* .active */
.shell-nav-trigger.active {
  color: #76b900;
  text-shadow: 0 0 12px rgba(118, 185, 0, 0.5);
}
.shell-nav-trigger.active::after {
  opacity: 1;
  box-shadow: 0 0 8px rgba(118, 185, 0, 0.6);
}

/* .open */
.shell-nav-trigger.open {
  color: #f0f0f0;
  background: rgba(255,255,255,0.06);
}
```

### `.shell-repo-select`
```css
.shell-repo-select {
  padding: 5px 10px;
  background: rgba(22, 27, 34, 0.9);
  border: 1px solid rgba(118, 185, 0, 0.2);
  border-radius: 6px;
  color: #c0c8d0;
  font-size: 12px;
  font-family: var(--font-mono);
  outline: none;
  cursor: pointer;
  max-width: 160px;
  flex-shrink: 0;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.shell-repo-select:hover,
.shell-repo-select:focus {
  border-color: rgba(118, 185, 0, 0.5);
  box-shadow: 0 0 0 3px rgba(118, 185, 0, 0.08);
}
```

### `.shell-avatar`
```css
.shell-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #76b900;
  border: 2px solid rgba(118, 185, 0, 0.4);
  color: #000;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: filter 0.15s, border-color 0.15s;
  line-height: 1;
  user-select: none;
}
.shell-avatar:hover {
  filter: brightness(1.12);
  border-color: rgba(118, 185, 0, 0.7);
  box-shadow: var(--glow-lime);
}
.shell-avatar:focus-visible {
  outline: 2px solid #76b900;
  outline-offset: 2px;
}
```

### `.shell-nav-item`
```css
.shell-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 12px;
  border-radius: 6px;
  color: #9ba3b0;
  font-size: 13px;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.shell-nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f0f0f0;
}
.shell-nav-item.active {
  background: rgba(118, 185, 0, 0.1);
  color: #76b900;
}
```

---

## (c) Current rules in WorkspaceHub.css

### `.wh-hero`
```css
.wh-hero {
  background: var(--wh-surface);   /* #1e2128 */
  border: 1px solid var(--wh-border);  /* #353b47 */
  border-radius: 14px;
  padding: 28px 28px 24px;
  margin-bottom: 22px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 24px rgba(0, 0, 0, 0.45);
}
/* ::before — lime top-edge accent bar */
.wh-hero::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(to right, #76b900 0%, rgba(118,185,0,0.3) 40%, transparent 70%);
  box-shadow: 0 0 40px rgba(118,185,0,0.15);
}
```

### `.wh-metric-card`
```css
.wh-metric-card {
  background: var(--wh-surface);
  border: 1px solid var(--wh-border);
  border-radius: 12px;
  padding: 20px 20px 18px;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease,
              transform 180ms ease, box-shadow 180ms ease;
  user-select: none;
  outline: none;
  position: relative;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.45);
}
.wh-metric-card:hover,
.wh-metric-card:focus-visible {
  background: var(--wh-surface-2);
  border-color: rgba(118, 185, 0, 0.35);
  transform: translateY(-2px);
  box-shadow: var(--glow-lime), 0 8px 32px rgba(0,0,0,0.5);
}
.wh-metric-card:focus-visible {
  outline: 2px solid #76b900;
  outline-offset: 2px;
}
```
No pseudo-elements defined on `.wh-metric-card`.

### `.wh-card`
```css
.wh-card {
  background: var(--wh-surface);
  border: 1px solid var(--wh-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.45);
}
```
No pseudo-elements, no hover state defined directly on `.wh-card`.

### `.wh-status-chip`
```css
.wh-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  background: rgba(118, 185, 0, 0.08);
  border: 1px solid rgba(118, 185, 0, 0.2);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: var(--wh-text-2);   /* #9ba3b0 */
  margin-bottom: 14px;
  font-family: var(--font-mono);
}
```

---

## (d) Current rules in GlobalBackground.css

### `.global-bg-art`
```css
.global-bg-art {
  position: absolute;
  inset: 0;
  background-image: url('/codescope-3d-bg.png');
  background-size: cover;
  background-position: center 38%;
  opacity: 0.45;
  mix-blend-mode: luminosity;
  pointer-events: none;
  z-index: 1;
}
/* animated when prefers-reduced-motion: no-preference */
/* animation: ambientDrift 38s ease-in-out infinite; */
```

### `.global-bg-grid`
```css
.global-bg-grid {
  position: absolute;
  top: 50%;
  bottom: 0;
  left: -20%;
  right: -20%;
  background-image:
    linear-gradient(rgba(118, 185, 0, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(118, 185, 0, 0.06) 1px, transparent 1px);
  background-size: 60px 60px;
  transform: perspective(800px) rotateX(55deg) scaleY(1.4);
  transform-origin: center bottom;
  opacity: 0.4;
  pointer-events: none;
  z-index: 2;
}
```

### `.global-bg-lights`
```css
.global-bg-lights {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 40% 35% at 15% 25%, rgba(118, 185, 0, 0.12) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 85% 75%, rgba(0, 200, 160, 0.09) 0%, transparent 70%);
  opacity: 1;
  pointer-events: none;
  z-index: 3;
}
```

### `.bg-fragment`
```css
.bg-fragment {
  position: absolute;
  font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(118, 185, 0, 0.22);
  white-space: nowrap;
  pointer-events: none;
  z-index: 4;
  user-select: none;
}
/* animated when prefers-reduced-motion: no-preference */
/* animation: floatY var(--dur, 24s) ease-in-out infinite var(--delay, 0s); */
```

---

## (e) Structure of the `global-bg` div in AppShell.jsx

```jsx
<div className="global-bg" aria-hidden="true">
  {/* Layer 1 */}
  <div className="global-bg-art" />

  {/* Layer 2 */}
  <div className="global-bg-grid" />

  {/* Layer 3 */}
  <div className="global-bg-lights" />

  {/* Layer 4 — six .bg-fragment <span> elements, in JSX order */}
  <span className="bg-fragment" style={{'--dur':'26s','--delay':'0s',  top:'18%',left:'8%' }}>runImpactAnalysis()</span>
  <span className="bg-fragment" style={{'--dur':'31s','--delay':'-8s', top:'35%',right:'12%'}}>git diff HEAD~1</span>
  <span className="bg-fragment" style={{'--dur':'22s','--delay':'-14s',top:'62%',left:'18%' }}>AST.traverse(node)</span>
  <span className="bg-fragment" style={{'--dur':'28s','--delay':'-5s', top:'72%',right:'22%'}}>embeddings.search()</span>
  <span className="bg-fragment" style={{'--dur':'34s','--delay':'-20s',top:'45%',left:'55%' }}>reviewCode(diff)</span>
  <span className="bg-fragment" style={{'--dur':'19s','--delay':'-11s',top:'25%',right:'38%'}}>merge --ff-only</span>

  {/* Layer 5 */}
  <div className="global-bg-vignette" />

  {/* Layer 6 */}
  <div className="global-bg-leftfade" />
</div>
```

Child elements in render order:

| # | Element | Class |
|---|---------|-------|
| 1 | `<div>` | `global-bg-art` |
| 2 | `<div>` | `global-bg-grid` |
| 3 | `<div>` | `global-bg-lights` |
| 4 | `<span>` | `bg-fragment` — `runImpactAnalysis()` |
| 5 | `<span>` | `bg-fragment` — `git diff HEAD~1` |
| 6 | `<span>` | `bg-fragment` — `AST.traverse(node)` |
| 7 | `<span>` | `bg-fragment` — `embeddings.search()` |
| 8 | `<span>` | `bg-fragment` — `reviewCode(diff)` |
| 9 | `<span>` | `bg-fragment` — `merge --ff-only` |
| 10 | `<div>` | `global-bg-vignette` |
| 11 | `<div>` | `global-bg-leftfade` |

---

## (f) Existing `@keyframes` in index.css

All four keyframes are declared inside a single
`@media (prefers-reduced-motion: no-preference)` block:

```css
@media (prefers-reduced-motion: no-preference) {
  @keyframes ambientDrift {
    0%, 100% { transform: translate(0, 0); }
    50%       { transform: translate(-6px, -8px); }
  }
  @keyframes floatY {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-10px); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
}
```

One additional keyframe is defined **outside** the reduced-motion guard:

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

And the `nvidiaPulse` keyframe, also **outside** the guard:

```css
@keyframes nvidiaPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(118, 185, 0, 0.5); }
  50%       { box-shadow: 0 0 0 6px rgba(118, 185, 0, 0); }
}
```

### Summary table

| Keyframe | Guard | Purpose |
|----------|-------|---------|
| `spin` | none | Spinner (`.spin` class) |
| `nvidiaPulse` | none | Green pulse glow (`.pulse-glow` class) |
| `ambientDrift` | `prefers-reduced-motion: no-preference` | Slow background art drift |
| `floatY` | `prefers-reduced-motion: no-preference` | Vertical float for decorative elements |
| `fadeUp` | `prefers-reduced-motion: no-preference` | Staggered entrance animation |
| `scanline` | `prefers-reduced-motion: no-preference` | Scanline sweep (defined but no current consumer) |
