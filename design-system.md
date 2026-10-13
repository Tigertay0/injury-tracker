# Design System: PitchSafe

Tokens live in `src/styles.css` (`:root`, dark overrides scoped to `.app-scope`, Tailwind `@theme`). Motion snippets live in `src/motion.css`. Components consume tokens only.

## Read

Free injury-risk tracker for amateur soccer players (13-25) and coaches. Landing and science pages are **Persuade/Read** (light theme locked); the app is **Operate**, mobile-first (players log on the bus home), light and dark via tokens.

- Mode: redesign, overhaul (old Firebase app's green-pitch/Bebas look was evidence, not authority).
- Dials: landing VARIANCE 7, MOTION 5, DENSITY 4. App VARIANCE 3, MOTION 3, DENSITY 7.
- Thesis: the load chart is the product. The hero is a working ACWR demo on labelled sample data, running the same `shared/` math as the app. Refused default: green pitch + condensed caps + shield + glassy floating stat cards.
- Signature moment: dragging "this week's training" moves the ratio marker through the zones and swaps the zone word (transitions.dev text swap).

## References

Captured to `.design/references/` (git-ignored; notes in `.design/references/notes.md`). SaaSFrame and Land-book were not reachable from the agent (human check); godly.design worked.

| Reference | Source | Mechanisms taken |
|---|---|---|
| Plausible demo (plausible.io/plausible.io) | SaaSFrame dashboard index | KPI strip driving one chart; one accent shared by chart and button; demo as the pitch |
| Hevy (hevyapp.com) | domain fit | Logging UI shows the previous value beside the input; summary strip above the form |
| Gentler Streak (gentler.app) | domain fit | Radio rows with icon/label/explainer; verdict sentence above the chart |
| Intervals.icu | domain fit | Training-load product; job-grouped feature bands; one dark-blue accent |
| Strava | domain fit | Gateway is one card with stacked account buttons |
| Superpower, Rerun | godly.design | Striped two-column comparison table; formula shown as a bordered card |

Rejected as anti-references (banned clusters): Oura, Gyroscope, Athlytic, Runna, Bevel.

## Color

Strategy: **Restrained** (cool neutrals + one blue accent) with a reserved semantic risk scale. Accent appears on the primary action, the current-week chart bars and selected states only.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--ground` | oklch(0.972 0.003 250) | oklch(0.175 0.008 255) | page |
| `--surface` | oklch(0.995 0.001 250) | oklch(0.215 0.009 255) | panels |
| `--ink` / `--ink-2` / `--ink-3` | 0.21 / 0.43 / 0.52 L | 0.955 / 0.78 / 0.69 L | text |
| `--accent` | oklch(0.5 0.19 263) | oklch(0.7 0.15 263) | primary action |
| `--risk-*` + `-soft` | low 152°, moderate 78°, high 50°, very high 27° | lighter steps | status only, always with an icon and a word |
| `--chart-past` / `--chart-now` | 0.70 0.10 262 / accent | 0.52 0.12 262 / 0.665 0.17 263 | load columns |

Verified: every text pair ≥ 4.5:1 in both themes, borders/bars/focus ≥ 3:1 (`contrast.py`); chart pair passes all six checks of the dataviz validator in both modes.

## Typography (Fontesk)

| Role | Family | Fontesk | License | Web embed |
|---|---|---|---|---|
| Display, big numbers | Saira Semi Condensed 600/800 | fontesk.com/saira-typeface/ | SIL OFL 1.1 | Yes (OFL.txt shipped in `public/fonts/saira-semi-condensed/`) |
| Text, UI, data | Public Sans variable 100-900 | fontesk.com/public-sans-typeface/ | SIL OFL 1.1 | Yes (OFL.txt in `public/fonts/public-sans/`) |

Self-hosted WOFF2, subset to Latin + French, `font-display: swap`, both preloaded, metric-adjusted fallbacks. Tabular figures (`.tnum`) on every number.

Scale (role tokens): caption 12, label 13, small 14, body 16, lead 18, h3 22, h2 28, h1 36, display-s 48, display-m 64, display-l 80, score 96. Sentence case headings; balance on headings, pretty on paragraphs.

Deviation: dataviz guidance puts hero numbers in the sans face; the owner chose Saira for big numbers in the selected direction.

## Space and layout

4/8 px scale. Marketing container 1200px; app content 1080px with a 240px sidebar on desktop and a bottom tab bar (5 items, "Log" centred) under 1024px. Every multi-column block collapses to one column under 768px. z-index: 10 sticky headers, 20 bottom bar, 40 overlays, 50 dialogs.

## Shape and depth

Shape lock: 10px controls (`--radius-control`), 16px panels (`--radius-panel`), pills only for status chips and the segmented control. Hairline borders instead of shadows; `shadow-lift` for the demo card and selected pills, `shadow-overlay` for dialogs, both tinted to the ground hue.

## Motion

Easing tokens `--ease-out`, `--ease-in-out`, `--ease-drawer`. Press scale 0.97 (`.press`). From the transitions-dev skill (verbatim, with reduced-motion guards): text swap (zone label), tabs sliding (segmented control), error shake (form fields; message persists until edited instead of auto-reverting), accordion (FAQ), skeleton pulse (app loading), success check (save buttons). Drawers and dialogs: 320ms in / 200ms out on `--ease-drawer`; dialog uses modal timings (250/150ms, scale 0.96). Chart and ruler move with `transform`/`opacity` only.

## Components (21st.dev)

| Component | 21st.dev source | What changed |
|---|---|---|
| Marketing header | [ln-dev7/header-17](https://21st.dev/@ln-dev7/components/header-17) | Tokens, Phosphor icons, router links, auth-aware actions, our sheet |
| Radio rows | [sean0205/c-radio-group-8](https://21st.dev/@sean0205/components/c-radio-group-8) | Added explainer line and trailing slot (risk chip), selected tint, 56px rows |
| Load chart | [bklitai/bar-chart](https://21st.dev/@bklitai/components/bar-chart) | Mechanisms only (rounded data-ends, faded neighbours, value-first tooltip); rebuilt as plain SVG without visx/Motion for hero performance; keyboard navigation and table view added |
| FAQ | [shadcnblockscom/faq3](https://21st.dev/@shadcnblockscom/components/faq3) | Single-column stacked questions; transitions.dev accordion motion |
| Button, sheet, slider, alert dialog | shadcn/ui (Radix) | Rewritten to tokens, 44px targets, exact transition properties |

The shadcn CLI could not resolve 21st.dev's `shadcn/button` registry dependency, so component code was placed by hand from `get_component` output.

## Icons and imagery

Phosphor (`@phosphor-icons/react`), regular weight, fill for active nav. Imagery is real: app screenshots captured from the sample dashboard (`public/screens/*.webp`), the OG image composed from them. No generated or stock photography.

## Browser surfaces

Themed `::selection`, caret, 2px focus outline (`--focus`), `color-scheme` per theme, theme-color meta, PWA manifest and icons (`public/manifest.webmanifest`).

## Project-specific bans

- No green-pitch palette, Bebas-style caps or shield icons (the old app's rut).
- No AI language: recommendations are rule-based and must never be labelled AI.
- Risk colour never alone: every status has an icon and a word.
- No em or en dashes in visible copy (placeholders use "N/A" or 0).
