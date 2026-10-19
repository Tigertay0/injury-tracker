# Rounded Redesign: Origin Buttons and a Widget Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace PitchSafe's square, boxy look with a rounded one:
- every button uses the 21st.dev OriginButton (12px corners, a fill that grows from the pointer);
- every control and panel is rounded to match;
- the dashboard becomes a grid of rearrangeable tiles (21st.dev Draggable Widget Grid), with each player's tile order saved to their account.

**Owner decisions (2026-10-17):**
- Round everything to match: 12px controls, 24px tiles and panels.
- Tile order is saved to the player's account.
- Keep Host Grotesk and the PitchSafe blue. Do not adopt the demo's monospace font or grey palette.
- The owner pinned both components and the demo's tile style. That includes the small uppercase tile titles, which overrides the rulebook's default ban on eyebrow labels for these tiles only.

**Design read:** app screens for amateur soccer players, in Operate mode, in a calm, modern, rounded language. Classification: redesign, preserve. Keep every URL, label, flow and field; change shape, buttons and the dashboard composition. Dials: VARIANCE 4, MOTION 5, DENSITY 5.

**Sources:**
- 21st.dev OriginButton and Draggable Widget Grid. The source is pasted by the owner in the conversation; the controller saves it to `.superpowers/sdd/2026-10-17-rounded-redesign/src-origin-button.tsx` and `src-draggable-widget-grid.tsx`, and implementers start from those files.
- Fonts are unchanged (Host Grotesk, already from Fontesk).
- No new inspiration pass, because the owner pinned the components.

**Tech:** React 19, Tailwind 4 (`@theme` tokens in `src/styles.css`), `motion` (already installed), Radix `Slot`, Hono Worker, Neon Postgres with RLS, Vitest.

## Global constraints

- **Shape lock:**
  - `--radius-control: 12px` covers buttons, inputs, selects, the segmented control and small cards.
  - `--radius-panel: 24px` covers dashboard tiles, page panels and dialogs.
  - `--radius-chip: 9999px` covers chips and pills.
  - Radio dots stay round.
  - Nothing else uses ad-hoc radii, and no square corners remain on interactive controls.
- **Tokens only.** Use `--accent`, `--on-accent`, `--ink`, `--ink-2`, `--surface`, `--sunken`, `--line`, `--line-strong`, `--focus`, `--risk-*` and the rest. The 21st components' own `--ic-*` palettes, `bg-card`, `ring-border` and similar names are replaced by PitchSafe tokens. No raw hex in components.
- **Both themes must work.** The app ships light and dark (`.app-scope` plus `data-theme`) and the marketing pages use `.site-night`. Clerk components keep the `--ps-clerk-*` aliases from PR #13.
- **Buttons:**
  - Touch targets stay 44px or more (`md` and `icon` sizes), and `sm` is at least 36px.
  - Visible `:focus-visible` ring (2px `--focus`). The global rule in `styles.css` applies; never put `outline-none` on a focusable element (Tailwind 4 trap).
  - The press scale is 0.97 to 0.985.
  - Under reduced motion, the fill appears without the grow animation and nothing moves.
- **Motion:** the fill uses a 500ms ease-out-expo (`cubic-bezier(0.16,1,0.3,1)`), which the owner pinned. Animate `transform` and `opacity` only. Hover effects are gated to `(hover: hover) and (pointer: fine)`; touch gets the fill on press.
- **Copy:** sentence case, no em dashes, the product's own words.
- **Accessibility floors:**
  - 4.5:1 text contrast in every variant and state, including the inverted text during the fill.
  - Keyboard operation everywhere.
  - Drag always has a keyboard alternative (Alt + arrow keys) and a touch long-press.
- **Commits:** no attribution lines.
- **Subagents:** Sonnet only.
- **Databases:** migrations and DB tests only on the Neon test and dev branches; never `neon-main`.

## Review focus

1. **Links inside tiles:** "What to do now" advice links and the score-part tiles link to screens. They must stay clickable whenever the layout is not being edited.
2. **Stored tile order that doesn't match the current tile set** (a tile added or removed in a later release, duplicates, junk): the dashboard must always show every current tile exactly once.
3. **Narrow phones (320 to 390px):** no horizontal overflow, nothing clipped inside square tiles, and text stays readable. Long advice lists must stay usable.
4. **Buttons rendered as links** (`asChild`), inside dialogs (Radix Action and Cancel) and disabled or busy buttons: all keep the right look, focus and semantics.
5. **Dark mode:** the button fill and the inverted text, the tile rings and the drag shadow all stay legible.

---

### Task 1: Shape tokens and rounded controls

**Files:** `src/styles.css` (radius tokens), `src/motion.css` (segmented control), `src/lib/clerk-root.tsx` (`borderRadius`), `design-system.md`, plus any component with a hard-coded square radius found by grep.

- Set `--radius-control: 12px`, `--radius-panel: 24px` and `--radius-chip: 9999px`.
- Segmented control (`.t-tabs`): outer radius 12px. The sliding fill (`.t-tabs-pill`) gets a radius that sits flush inside the 1px border (for example `calc(12px - 1px)`). Segments next to the fill must not show square corners. Keep the hairline dividers between unselected segments, or remove them if they look wrong with rounding, and say which you chose.
- Clerk `appearance.variables.borderRadius: '12px'`.
- Grep for `rounded-none`, `border-radius: 0` and square-only assumptions, and fix them. Also check focus outlines still follow the rounded shape (outlines follow `border-radius` in current browsers).
- `design-system.md`: replace the square shape lock with the new rule. List the three tokens and note that radio dots stay round.
- **Verify** in the browser at `/demo`, `/demo/log`, `/demo/settings`, `/demo/recovery`, `/demo/injuries` and `/demo/drills?plus=1` (dev build), plus `/`, `/science` and `/sign-in`:
  - 390px and 1440px, light and dark;
  - no clipped content where padding now meets a radius;
  - no console errors.
  - Save 3 screenshots.
- Run `npx tsc -b && npx vitest run`, then commit with `style: rounded shape system`.

### Task 2: Origin button for every button

**Files:**
- create `src/components/ui/origin-button.tsx` (the 21st component adapted to PitchSafe tokens);
- rewrite `src/components/ui/button.tsx` so `Button` and `buttonVariants` use it;
- update `src/components/ui/alert-dialog.tsx`;
- update `src/components/marketing/header.tsx` (its CTA link is a hand-rolled button);
- create `tests/origin-button.test.ts` for the pure helpers.

**Interfaces.** `Button` keeps its current props: `variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse'`, `size: 'sm' | 'md' | 'lg' | 'icon'`, `asChild`, and all button attributes. Every existing call site must compile and behave unchanged. `buttonVariants` stays exported for class-only uses.

**Behaviour:**
- **The fill:** a circle grows from the pointer position on hover or press, and from the centre on keyboard focus-visible or press, until it covers the button. The text colour transitions so it stays readable over the fill.
- **Port faithfully:** `getCoverDiameter`, pointer and keyboard origin logic, `ResizeObserver` re-measure, `fonts.ready`, `aria-busy` for `loading`, and the dev-only warning for buttons with no accessible name.
- **Variant mapping:**

  | Variant | Rest | Fill colour | Text during fill |
  |---|---|---|---|
  | primary | `--accent` with `--on-accent` text | a darker accent (`color-mix` of `--accent` with `--ink` around 35%) | `--on-accent` |
  | secondary | `--surface`, 1px `--line-strong` border, `--ink` text | `--ink` | `--surface` |
  | ghost | transparent | `--sunken` | `--ink` |
  | danger | `--risk-very-high` with `--ink-inverse` text | a darker mix | unchanged |
  | inverse | `--surface` on dark grounds | `--ink` | `--surface` |

  Check contrast for each pair, in both themes.
- **`asChild`:** use Radix `Slot` and `Slottable` so a `Link` child becomes the element and still gets the fill span and the label wrapper. The fill span is `aria-hidden` and `pointer-events-none`. The label sits above the fill (`relative z-10`).
- **Dialogs:** `AlertDialogAction` and `AlertDialogCancel` render the Radix primitive with `asChild` around `Button`, so dialog buttons get the same effect.
- **Header CTA:** `src/components/marketing/header.tsx` uses `Button asChild variant="inverse"` around its `Link`.
- **Sizes:** keep the current heights (`sm` 36px, `md` 44px, `lg` 52px, `icon` 44px square), radius `--radius-control`, `font-semibold`, and tracking -0.01em to -0.02em.
- **Disabled and busy:** opacity 55% and no fill. `aria-disabled` buttons (the My drills page uses them) must also show no fill and no press scale.
- **Reduced motion:** the fill toggles without the scale animation (instant, or a 120ms opacity change). `whileTap` is disabled.
- **Ownership:** one Motion element per button is acceptable. Do not add a global provider.
- **Tests** (`tests/origin-button.test.ts`): `getCoverDiameter` at the corners, centre and edges, and that it always covers the farthest corner. Export the helper from the module.
- **Verify** in the browser:
  - hover, press, keyboard focus plus Enter and Space on primary, secondary, ghost and danger buttons;
  - an `asChild` link (the "See PitchSafe Plus" link on `/demo/drills?plus=1` with a free-player patch, or any `Button asChild` usage);
  - the delete confirm dialog in Settings (not in the demo; use the injuries delete dialog);
  - the marketing header;
  - light and dark, 390px and 1440px, reduced motion (emulate);
  - no console errors.
  - Record before and after screenshots of the Log session Save button and the Settings buttons.
- Run `tsc`, `vitest` and `vite build`, then commit with `feat: origin buttons`.

### Task 3: Widget grid component and layout logic

**Files:**
- create `src/lib/widget-layout.ts` (pure layout code from the 21st source: `layout`, `tile`, `pack`, `canonical`, `moveTo`, `choose`, `candidatesFor`, `sizeOf`, and the types `WidgetSize`, `WidgetItem`, `Placement`);
- create `src/components/ui/draggable-widget-grid.tsx` (the component, importing from `widget-layout`);
- create `tests/widget-layout.test.ts`.

**Adaptations:**
- **Tokens:** tiles use `bg-surface text-ink`, `ring-1 ring-line` at rest and `ring-2 ring-[color:var(--focus)]` just after a drop. Corner radius is `var(--radius-panel)`; replace the `radius` prop default with the token. The lifted shadow uses the theme `--shadow-color` instead of black.
- **`editable` prop.** When false, there is no drag, links work and keyboard moves are off. When true, behaviour is as in the source, including the anchor-click guard.
- **`onChange(items)`** fires after a drop or a keyboard move, exactly as in the source.
- **Accessibility:** keep `role="list"` and `listitem`, `aria-posinset`, the hint text, and Alt + arrow keys.
- **Motion:** keep `MotionConfig reducedMotion="user"`. Remove the mount entrance animation (the stagger fade-in) when `prefers-reduced-motion` is set; it already respects `MotionConfig`.
- **Scope:** no demo widgets, palettes or fonts from the 21st demo.

**Tests** (`tests/widget-layout.test.ts`), for item sets that mix `sm`, `wide`, `tall` and `lg` at 1, 2, 3 and 4 columns:
- every item placed exactly once;
- no overlaps;
- `col + w <= columns`;
- `tile()` returns a gap-free rectangle when the total area divides evenly and a tiling exists, and `layout()` falls back to `pack()` otherwise;
- `moveTo` and `canonical` keep the same item set;
- `choose` returns null when the dragged centre is inside its home slot.

Run `npx vitest run tests/widget-layout.test.ts` and `tsc`, then commit with `feat: draggable widget grid`.

### Task 4: Save the tile order to the player's account

**Files:**
- `db/migrations/0004_dashboard_order.sql`;
- `shared/types.ts` (`Profile.dashboardOrder: string[]`);
- `shared/validation.ts` (`validateDashboardOrder(raw): string[]`);
- `worker/repo.ts` (read the column, plus an `updateDashboardOrder(order)` method);
- `worker/app.ts` (`PUT /api/me/dashboard` with body `{ order: string[] }`, returning `{ dashboardOrder }`);
- `src/lib/player-data.tsx` (action `saveDashboardOrder(order)`: optimistic update, with a revert and an error toast on failure; the demo provider keeps it local);
- tests in `tests/validation.test.ts`, `tests/api.test.ts` (memory store) and `tests/db/rls.test.ts`.

**Migration:**
- `alter table public.profiles add column dashboard_order text[] not null default '{}'`;
- a check that `cardinality(dashboard_order) <= 30`;
- `grant update (dashboard_order) on public.profiles to pitchsafe_app`;
- `set local lock_timeout = '5s'` first.

**Validation:** an array of 0 to 30 strings, each matching `^[a-z][a-z0-9_]{1,29}$`, no duplicates. The server does not need the tile catalogue; the app reconciles unknown ids.

**Behaviour:** the overview returns `profile.dashboardOrder`, and export includes it. Writes go through the write rate limiter like other mutations.

**DB tests** (test branch):
- player A sets an order and reads it back;
- B cannot change A's order;
- the 30-item cap is enforced (`23514`).

Apply 0004 to the test and dev branches only. Run `tsc`, `vitest`, RLS and api-flow, then commit with `feat: save dashboard tile order`.

### Task 5: Dashboard as tiles

**Files:** `src/app/dashboard.tsx`, split into tile components in a new `src/app/dashboard-tiles.tsx` (with `src/app/dashboard-tiles/*.tsx` if it grows past about 400 lines); `src/app/movement-panel.tsx` is reused inside a tile or adapted.

**Tiles** (id: size, content):

| Id | Size | Content |
|---|---|---|
| `score` | lg | The injury risk score (big number out of 100), its zone chip, the one-line verdict, the baseline progress until it's ready, and the first-session prompt when there are no sessions. |
| `workload` | sm | The workload ratio. Same link as today's tile. |
| `recovery` | sm | The recovery score. Same link. |
| `equipment` | sm | The equipment risk. Same link. |
| `injury` | sm | The injury history factor. Same link. |
| `load` | wide | The 28-day load chart (`LoadChart`). |
| `movement` | wide | The movement this week panel (hidden tile or an empty state when not ready; decide and say which). |
| `actions` | tall (or lg if needed) | "What to do now": top advice items as links. Show the first N that fit and a "See all" disclosure inside the tile. Never cut an item mid-line. |
| `fuel` | wide | Fuel notes and the disclaimer. |
| `report` | sm | Coach report PDF, with its button. |

**Tile shell** (from the demo's style): small uppercase label in `text-label` with 0.08em tracking and `--ink-2`, an optional meta item on the right, then a big number in `tnum`, around 28 to 30px, `--ink`, then the content pinned to the bottom (`mt-auto`). Padding 16 to 22px. Use container queries (`@container`) so tiles adapt to their width.

**Order:**
- The default order is the list above.
- The player's saved order is reconciled: drop unknown ids, drop duplicates, append missing ids in default order.
- The demo uses the default order and keeps changes local.

**Arranging:**
- Add an "Arrange tiles" button in the page header (secondary) that toggles `editable`. While editing it reads "Done", and a hint line appears: "Drag tiles to rearrange. On touch, press and hold first. Keyboard: Alt and arrow keys."
- `onChange` calls `saveDashboardOrder`.
- Not editing: links work normally.

**Grid:** `maxColumns` 4, `cellSize` around 230, `gap` 12. Below 768px, 2 columns with the `lg` and `wide` tiles spanning both. Check that 320px doesn't clip; if a square cell can't hold a tile's content at 320px, that tile becomes `wide` on narrow screens (decide via the grid's column count).

**Keep:**
- every existing accessible name, heading level and link target;
- the PDF report and its error handling;
- the `Sprinting rising` style status text;
- tabular numerals.

**Verify** at `/demo`:
- 320, 390, 768 and 1440px, light and dark;
- arrange with mouse drag, keyboard (Alt + arrows) and touch long-press (emulate a mobile viewport plus touch);
- links work when not arranging;
- no overflow;
- no console errors.

Save screenshots at 390 and 1440 (light and dark). Run `tsc`, `vitest` and `build`, then commit with `feat: dashboard tiles`.

### Task 6: Whole-site visual pass

The controller dispatches a verification pass: every app screen and marketing page at 390 and 1440, light and dark. It looks for:
- leftover square controls;
- radius clashes (a rounded control inside a square container, or nested radii that don't step down: inner = outer - padding);
- clipped focus rings;
- Clerk sign-in and user-profile screens;
- toasts and dialogs.

Fix what it finds in one batch, then commit with `style: rounded polish`.

### Task 7: Ship (controller)

1. Reviews on Sonnet: react-reviewer (Tasks 2, 3 and 5), database-reviewer (Task 4), and a11y-architect (buttons and drag).
2. A final whole-branch review.
3. Then ask the owner before the 0004 production migration and the merge.
