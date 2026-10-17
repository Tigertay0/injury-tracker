# Design System: PitchSafe

Tokens live in `src/styles.css` (`:root`, dark overrides scoped to `.app-scope`, `.theme-night` and `.site-night`, Tailwind `@theme`). Motion snippets live in `src/motion.css`. Components consume tokens only.

## Read

Free injury-risk tracker for amateur soccer players (13-25) and coaches. Marketing pages (home, science, use, legal, sign-in) are **Persuade/Read** on a dark "floodlit" night ground (`.site-night`); the app is **Operate**, mobile-first, light and dark via tokens.

- 2026-10-13 direction change, chosen by the owner from three previews: **Floodlit** home (Glass Fold WebGL shader hero, Aceternity Container Scroll tilting the real dashboard, spotlight cards). The owner's taste for rich shaders and scroll motion overrides the default "no glow/glass" bans on the marketing pages.
- Owner feedback, 2026-10-13: small rounded corners read as AI-made, so the shape went square everywhere.
- Owner feedback, 2026-10-17: the square, boxy look reads as tacky. Shape is now **rounded everywhere**, with a clear size per role (see Shape and depth). This replaces the square rule.
- Removed AI tells: kicker pill above the hero headline, eyebrow labels above headings, gradient text on numbers, decorative status dots.

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
| Every role (display, text, UI, data) | Host Grotesk variable 300-800, by Element Type | fontesk.com/host-grotesk-typeface/ | SIL OFL 1.1 | Yes (OFL.txt in `public/fonts/host-grotesk/`) |

Chosen by the owner on 2026-10-13 over Mona Sans and Schibsted Grotesk (all three OFL from Fontesk). One family; hierarchy comes from size, weight (700 headings, 600/500 UI, 400 body) and size-specific tracking set on the text tokens (h3 -0.015em up to score -0.05em; big marketing headings -0.04em to -0.045em). Self-hosted variable WOFF2 subset to Latin, `font-display: swap`, preloaded, metric-adjusted Arial fallback. Tabular figures (`.tnum`) on every number.

Scale (role tokens): caption 12, label 13, small 14, body 16, lead 18, h3 22, h2 28, h1 36, display-s 48, display-m 64, display-l 80, score 96. Sentence case headings; balance on headings, pretty on paragraphs.

## Space and layout

4/8 px scale. Marketing container 1200px; app content 1080px with a 240px sidebar on desktop and a bottom tab bar (5 items, "Log" centred) under 1024px. Every multi-column block collapses to one column under 768px. z-index: 10 sticky headers, 20 bottom bar, 40 overlays, 50 dialogs.

## Shape and depth

Shape lock: one rounded system, three tokens in `src/styles.css`. Nothing else uses an ad-hoc radius, and no interactive control has a square corner.

| Token | Value | Used for |
|---|---|---|
| `--radius-control` | 12px | buttons, inputs, selects, the segmented control, small cards, icon tiles, nav items |
| `--radius-panel` | 24px | dashboard tiles, page panels, dialogs, sheets, the phone and desktop frames on the home page |
| `--radius-chip` | 9999px | chips, tags, progress and zone bars, slider track and thumb, the walkthrough tap marker (dot, ripple and numbered still marker) |

Radio dots stay round (`rounded-full`), because that is what people expect a radio to look like. The origin button's growing fill circle is round for the same reason: it is a mechanism, not a shape. Clerk gets `borderRadius: '12px'`. Load chart columns have a 4px rounded top and a flat base.

Nested radii step down: a rounded element inside a padded rounded container uses inner radius = outer radius - padding, so the corners stay concentric. Never go below about 6px; where the sum would, use `--radius-control` (the smallest token) instead. A container that wraps a control from outside is the same rule read the other way: outer = inner + padding. Every derived radius in the app is written as `calc()` on the tokens, and this is the full list:

| Where | Radius | Why |
|---|---|---|
| Segmented control | 12px (`--radius-control`) | the outer shape |
| Its sliding fill and every segment | `calc(var(--radius-control) - 1px)` = 11px | sits flush inside the 1px border; the dividers are short inset hairlines (a border would curve round a rounded segment) and fade out beside the selected segment |
| Floating header bar | `calc(var(--radius-control) + 8px)` = 20px | outer = inner + padding: the 12px call-to-action button sits 8px inside it |
| Home-page phone frame, inner screen | `calc(var(--radius-panel) - 7px)` = 17px | 6px bezel plus the 1px border |
| Remove button in a drill row | `calc(var(--radius-control) - 4px)` = 8px | 4px inside the 12px drill list |
| Last row of the My drills list | `calc(var(--radius-panel) - 1px)` = 23px | flush inside the panel's 1px border, so the row's hover and focus ring follow the panel corners |
| Walkthrough progress line | `--radius-chip`, inset 20px (24px from `sm`) from the sides and 10px above the bottom | a line on the edge of its 24px step button would be cut by the corner curve, so it floats inside |
| Screen inside the Container Scroll frame | `--radius-control` | the frame is `--radius-panel` with 24px of padding; 24 - 24 would be 0, so the floor applies |
| Blocks inside a dashboard tile (the "Do this first" box, advice rows, the See all button) | `--radius-control` | tile padding is 16px, 20px from 300px wide: 24 - 20 = 4px, below the floor |

Hairline borders instead of shadows; `shadow-lift` for the use-app card, the slider thumb and the mobile log button, `shadow-overlay` for dialogs, both tinted to the ground hue. The segmented control uses a solid accent fill and no shadow. Focus outlines follow `border-radius`, so a rounded control gets a rounded ring.

## Motion

Easing tokens `--ease-out`, `--ease-in-out`, `--ease-drawer`. Press scale 0.97 on plain pressables (`.press`); buttons press to 0.98 through Motion's `whileTap`. Buttons also have the origin fill (see Components): a circle grows from the pointer over 500ms on `cubic-bezier(0.16,1,0.3,1)`, from the centre for keyboard focus. Hover fills only where the device can hover; touch fills on press. Reduced motion: the fill fades in over 120ms and nothing scales. From the transitions-dev skill (verbatim, with reduced-motion guards): text swap (zone label), tabs sliding (segmented control), error shake (form fields; message persists until edited instead of auto-reverting), accordion (FAQ), skeleton pulse (app loading), success check (save buttons). Drawers and dialogs: 320ms in / 200ms out on `--ease-drawer`; dialog uses modal timings (250/150ms, scale 0.96). Chart and ruler move with `transform`/`opacity` only.

## Components (21st.dev)

| Component | 21st.dev source | What changed |
|---|---|---|
| Marketing header | [ln-dev7/header-17](https://21st.dev/@ln-dev7/components/header-17) | Floating rounded glass bar over the hero, auth-aware actions, our sheet on phones |
| Home hero background | [meerbahadin10/glass-fold](https://21st.dev/meerbahadin10/glass-fold) (GradFlow) | Shader kept; PitchSafe blues; pauses off screen; still frame for reduced motion |
| Dashboard reveal | [aceternity/container-scroll-animation](https://21st.dev/aceternity/container-scroll-animation) | motion/react, typed, rounded frame, flat card for reduced motion; shows a real dark dashboard screenshot |
| Radio rows | [sean0205/c-radio-group-8](https://21st.dev/@sean0205/components/c-radio-group-8) | Added explainer line and trailing slot (risk chip), selected tint, 56px rows |
| Load chart | [bklitai/bar-chart](https://21st.dev/@bklitai/components/bar-chart) | Mechanisms only (faded neighbours, value-first tooltip; columns have a 4px rounded top); rebuilt as plain SVG without visx/Motion for hero performance; keyboard navigation and table view added |
| FAQ | [shadcnblockscom/faq3](https://21st.dev/@shadcnblockscom/components/faq3) | Single-column stacked questions; transitions.dev accordion motion |
| Button | [OriginButton](https://21st.dev) (the owner's pick) | Behaviour in `origin-button.tsx`, looks in `button.tsx`. Five variants, each with a fill and the text colour that reads over it: primary floods to a darker accent (accent mixed 35% toward ink, in oklab), secondary to ink, ghost to sunken, danger to a darker red, inverse (the opposite of the ground: the white header button on the night pages) to surface. Disabled, busy and `aria-disabled` buttons get no fill and no press scale. `asChild` makes a Link the button; alert dialog Action and Cancel wrap it too. On the night marketing pages the white call-to-action pills (header, hero, close band) are `inverse`, the dark outlined controls (Play and Pause, mobile Sign in, the hero's sample-dashboard link, which keeps a glass background through a class override) are `secondary`, and the menu trigger and the sheet Close are ghost icon buttons with a lighter fill (see Dashboard, Buttons in use). No `outline` variant was needed. The reduced-motion setting is read live (`src/lib/use-prefers-reduced-motion.ts`), so a mounted button follows an OS change. Text contrast is 6:1 or better at rest and 9:1 or better filled, in light, dark and night |
| Draggable widget grid | 21st.dev Draggable Widget Grid (the owner's pick, source pasted into the repo) | The layout maths is split into `src/lib/widget-layout.ts` (typed, tested). Tokens only (`--radius-panel`, `ring-line`, `ring-focus`, the theme shadow colour), no demo palette or monospace. Dragging is an explicit mode (see Dashboard). Keyboard moves with Alt and the arrow keys; touch lifts after a 350ms press. The focus ring is drawn on the unclipped outer element so a link at a tile edge keeps its ring. The reduced-motion setting is read live |
| Sheet, slider, alert dialog | shadcn/ui (Radix) | Rewritten to tokens, 44px targets, exact transition properties |

The shadcn CLI could not resolve 21st.dev's `shadcn/button` registry dependency, so component code was placed by hand from `get_component` output.

## Dashboard

The dashboard (`/app`, `/demo`) is a grid of ten tiles on the Draggable widget grid. The score comes first, the four things behind it next, then the load chart, movement, advice, fuel notes and the coach report. The player's tile order is saved to their account (debounced 600ms after the last move, and flushed when the tab is hidden); a saved order that does not match the current tile set is reconciled so every tile shows exactly once.

**Tile shell** (`dashboard-tiles/tile-shell.tsx`). Every tile is the same card: `--surface` fill, a 1px inset `--line` ring, `--radius-panel` corners (the grid draws the ring and the clip), 16px padding that becomes 20px once the tile is 300px wide. At the top is a small uppercase title (13px, 600, 0.08em tracking, `--ink-2`) with an optional meta slot on the right (a count, a legend). **This uppercase title is the one place the eyebrow-label ban is lifted: dashboard tiles only, by the owner's choice on 2026-10-17, to match the 21st.dev demo he pinned.** Everywhere else headings stay sentence case with no kicker. Below the title, the key figure sits near the top (`BIG_NUMBER`, 28px tabular) and supporting content is pinned to the bottom with `mt-auto`. A tile is a size container, so it adapts to the width it is given with `@[240px]` to `@[440px]` variants, whatever the column count is at that moment. The title is also the tile's accessible name. A list that does not fit shows the first items that fit, whole, and a small `secondary` **See all N** button (`fit-list.tsx`); opening it lets the list scroll inside the tile.

**Grid and tile sizes.** Cells are square: about 230px, up to four columns on desktop (12px gap), and two columns on a phone (400px target cell). A size is a span: `sm` 1x1, `wide` 2x1, `tall` 1x2, `lg` 2x2. The layout mode comes from the window width (`use-tile-mode.ts`): under 372px `compact`, under 768px `phone`, otherwise `desktop`. The size map (`dashboard-order.ts`) was chosen so the default order tiles with no gap at four columns and at two, and so each tile's content fits its cell:

| Tile | desktop | phone | compact |
|---|---|---|---|
| Injury risk score | lg | lg | lg |
| Workload ratio | sm | sm | wide |
| Recovery | sm | sm | wide |
| Cleats | sm | sm | wide |
| Injury history | sm | sm | wide |
| Training load, last 28 days | wide | lg | lg |
| Movement this week | lg | lg | lg |
| What to do now | tall | lg | lg |
| Fuel and recovery | tall | lg | lg |
| Coach report | wide | wide | wide |

On a phone the list tiles (advice, movement) are full-width squares that fit one or two whole items, then **See all**. A little free space under the button is the accepted cost of a square cell, and an item is never cut.

**Arrange and Done.** Rearranging is an explicit mode, not always on, because while tiles can be dragged their links cannot be followed. The page action is a `secondary` button. **Arrange tiles** (move icon) makes the grid editable, shows a one-line hint on an `--accent-soft` strip, and makes every tile `inert`, so a tile is something to move and keyboard focus lands on the tiles alone. The same button then reads **Done** (check icon). Mouse and pen drag at once, touch lifts after a 350ms press so the page can still scroll, and the keyboard moves the focused tile with Alt and the arrow keys. A lifted tile scales to 1.06 with a deeper shadow and a `--line-strong` ring; the tile it lands on gets a 2px `--focus` ring for about 600ms. A polite live region announces each move ("Recovery moved to position 3 of 10"). Done redraws the grid so the tab order matches what the player now sees, and flushes the save. When not arranging, every tile link and button works. Under reduced motion there is no entrance animation and no lift movement.

**Zone gauge** (`zone-gauge.tsx`, score tile). The four risk zones as a slim 12px bar of chip-radius segments, each as wide as the scores it covers, with the zone names above and the score where each zone starts (0, 31, 60, 80) and the top of the scale (100) below. The zone the score is in is full strength and the other three sit at 35% opacity; a 6px ink marker with a surface ring sits at the score's place inside its zone. The bar is deliberately slim (a thick bar read as a toy) and is centred in the free height of the tile. It is hidden from screen readers, because the number and the zone chip say the same in words, and it draws only in a tile 240px wide or more (below that the verdict sits at the bottom instead). The zone bounds come from `shared/calculations.ts`, the same constants `compositeZone` uses, so the gauge cannot drift from the score. Until there is a score, the same slot holds the 28-day session strip (four weeks of seven chip-radius cells, filled for each day with a logged session) with the baseline progress bar or the **Log a session** button; the strip draws from 340px wide.

**Buttons in use.** One `Button` serves every screen (see Components). These are the variants the screens actually use:

| Variant | Where |
|---|---|
| `primary` | the one main action of a screen: Log session, Save, Continue, Create a free account, and **Log a session** in the first-session tile (`lg`) |
| `secondary` | everything beside the main action: **Arrange tiles** and **Done**, **See all N** and **Show fewer**, **Download coach report**, Back, Add (drills), dialog Cancel. On the night marketing pages (a dark ground) it is the dark outlined control: Play and Pause, the mobile menu's Sign in, and the hero's sample-dashboard link, which keeps a glass fill through a class |
| `inverse` | the white pill on the night pages: the header call to action, and the hero and close-band calls to action. It floods to the night surface and its text swaps to ink. It is the opposite of its ground, so it never appears in the app |
| `ghost` | icon buttons and quiet text actions: the trash icon on a record, the header menu trigger and the sheet Close (both with a lighter veil of ink as the fill through `fillClassName`, because the default `--sunken` fill is darker than a dark ground and read as a dark pad), and Cancel when editing an injury |
| `danger` | destructive confirmations only: the dialog Delete action and Delete my account and data |

## Icons and imagery

Phosphor (`@phosphor-icons/react`), regular weight, fill for active nav. Imagery is real: app screenshots captured from the sample dashboard (`public/screens/*.webp`), the OG image composed from them. No generated or stock photography.

## Browser surfaces

Themed `::selection`, caret, 2px focus outline (`--focus`, set once on `:focus-visible` in the base layer; never add `outline-none` or `outline-hidden` to a focusable control, because in Tailwind 4 both set `outline-style: none` and beat that rule), `color-scheme` per theme, theme-color meta, PWA manifest and icons (`public/manifest.webmanifest`).

## Project-specific bans

- No green-pitch palette, Bebas-style caps or shield icons (the old app's rut).
- No AI language: recommendations are rule-based and must never be labelled AI.
- Risk colour never alone: every status has an icon and a word.
- No em or en dashes in visible copy (placeholders use "N/A" or 0).
