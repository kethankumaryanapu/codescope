# ImpactIQ Intelligence Hub — authenticated home and navigation

The change replaces the post-login landing with a purpose-built Intelligence Hub: a hero area carrying the ImpactIQ identity, a three-domain primary navigation bar, a module strip that reacts to domain selection, and three entry cards wired to real application routes. AppRoutes now redirects authenticated users from `/` and all auth pages to `/hub` instead of `/dashboard`. AppShell was simplified by removing the inline dropdown nav (Phase 1's Option A), leaving the header as logo + repo selector + AI Engine status + settings icon + avatar. The build compiles cleanly (Vite exit 0, reported by the implement step).

Watch for: **NvidiaStatus model string renders NVIDIA branding** (confirmed — the second line of the `NvidiaStatus` widget renders `nvidia/llama-3.1-nemotron-70b-instruct` as visible text in every authenticated page's header, violating the "no NVIDIA branding in the user-facing interface" requirement); **orphaned nav CSS in AppShell.css** (confirmed — `.shell-nav`, `.shell-nav-cat`, `.shell-nav-trigger`, `.shell-nav-dropdown`, `.shell-mobile-nav` and related classes remain in `AppShell.css` but are no longer rendered by the simplified `AppShell.jsx`, adding dead weight without functional impact).

**Verdict**: NEEDS_CHANGES

---

## High-level view

The hero is transparent — the 3D visual comes entirely from AppShell's fixed `global-bg` layer. A radial-gradient scrim darkens only the text-side of the hero, leaving the 3D image visible elsewhere. No second `background-image` on the hero element.

NvidiaStatus renders "AI Engine" in bold green as its primary label, but the raw model string (`nvidia/llama-3.1-nemotron-70b-instruct`) appears on the line below in 10px monospace — visible to every authenticated user on every page. The requirement prohibits NVIDIA branding in the user-facing interface. This is a confirmed blocking issue.

The domain/module strip lives inside the hub page, not the persistent shell. Domain state is seeded from `location.pathname`, so deep-linking to `/agents` pre-selects INTELLIGENCE. Because module routes render their own pages through AppShell rather than nesting inside IntelligenceHub, the strip only appears when the user is on `/hub` itself — the intended behavior.

`AppShell.css` retains ~80 lines of Phase 1 dropdown nav CSS (`.shell-nav`, `.shell-nav-trigger`, `.shell-nav-dropdown`, `.shell-mobile-nav`, and variants) that are no longer referenced by any JSX. Not a functional regression, but dead weight that will confuse future editors.

---

<details>
<summary>Issues (2)</summary>

1. **NVIDIA model string visible in header** — `NvidiaStatus.jsx` renders `nvidia/llama-3.1-nemotron-70b-instruct` (or `VITE_NVIDIA_MODEL` if set) as a visible second line in the header pill on every authenticated page. The requirement prohibits NVIDIA branding in the user-facing UI. Either remove the model string line, replace it with a generic label (e.g. "70B Instruct"), or truncate it before the vendor prefix.

2. **Orphaned nav CSS in AppShell.css** — `.shell-nav`, `.shell-nav-trigger`, `.shell-nav-dropdown`, `.shell-mobile-nav`, and their variants (≈80 lines) remain in `AppShell.css` after the dropdown nav was removed from `AppShell.jsx`. No functional impact, but the dead styles should be removed to avoid confusion in future edits.

</details>

<details>
<summary>Details</summary>

## NVIDIA model string visible in header

`NvidiaStatus.jsx` line 1 reads `import.meta.env.VITE_NVIDIA_MODEL ?? 'nvidia/llama-3.1-nemotron-70b-instruct'`. Line 18 renders this value directly as a styled `<span>` inside the status pill — visible in the header bar on every authenticated route including the new `/hub`. The primary "AI Engine" label is correctly debranded, but the secondary model string is not. A user with no `VITE_NVIDIA_MODEL` env var set sees `nvidia/llama-3.1-nemotron-70b-instruct` in 10px monospace on every page load.

Fix options: remove the model `<span>` entirely; replace it with a static string like "70B Instruct"; or strip the vendor prefix before display (`MODEL.split('/').pop()` produces `llama-3.1-nemotron-70b-instruct`, which omits the "nvidia/" prefix).

## Orphaned nav CSS

The Phase 1 `AppShell.jsx` rendered `.shell-nav > .shell-nav-cat > .shell-nav-trigger` dropdown navigation. Option B (implemented here) removes that JSX entirely. `AppShell.css` was not correspondingly pruned — the classes `.shell-nav`, `.shell-nav-cat`, `.shell-nav-trigger`, `.shell-nav-trigger::after`, `.shell-nav-backdrop`, `.shell-nav-dropdown`, `.shell-nav-item`, `.shell-mobile-nav`, `.shell-mobile-cat-label`, `.shell-mobile-item`, `.shell-mobile-menu-btn` remain. These are roughly 80 lines that currently style nothing.


</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `src/pages/IntelligenceHub.jsx` | New — authenticated home: hero, domain nav, module strip, entry cards |
| `src/pages/IntelligenceHub.css` | New — hub-specific styles; transparent background, responsive breakpoints at 900px and 580px |
| `src/routes/AppRoutes.jsx` | Updated — `/hub` route added; `/`, `/login`, `/register`, `/forgot-password` all redirect to `/hub` on auth |
| `src/components/AppShell.jsx` | Updated — dropdown nav JSX removed (Option B); header now: logo + repo selector + NvidiaStatus + settings + avatar |
| `src/components/AppShell.css` | Not updated — retains orphaned Phase 1 nav CSS |
| `src/components/NvidiaStatus.jsx` | Not updated — model string still renders NVIDIA vendor prefix |

Full diff: `git diff main -- src/pages/IntelligenceHub.jsx src/pages/IntelligenceHub.css src/routes/AppRoutes.jsx src/components/AppShell.jsx`

</details>
