# Drills, movement load and PitchSafe Plus (custom drills with AI)

Date: 2026-10-13. Status: approved in conversation; this spec awaits the owner's review.

## Goal

Make the training part of the risk score more in-depth by recording *what* a player did in a session, not only how long and how hard. Free players pick drills from a built-in library. Paying players (PitchSafe Plus, $60/year) can also create their own drills and personal workouts, and Claude Haiku 5.5 works out each one's intensity and movement profile so it counts like a built-in drill.

## Decisions (from the owner)

- Drills: a built-in library for everyone, plus custom drills that only Plus players can create.
- Scoring: "movement load on top". Session load stays minutes × how hard it felt (session-RPE, the published method). Drills add a movement profile whose weekly spikes raise the training-load part of the score and drive targeted advice.
- AI: Claude Haiku 5.5 (`claude-haiku-5-5`) estimates the profile of a custom drill from its description. Only Plus players can use it.
- Paid plan: PitchSafe Plus, $60 per year, run by Clerk Billing on the owner's Stripe account.

## Build order

Three parts, each with its own implementation plan, reviews and pull request:

1. Drill library and movement load (free).
2. PitchSafe Plus plan (Clerk Billing).
3. Custom drills profiled by Haiku 5.5 (Plus only).

Parts 2 and 3 need the owner's Stripe account (connected in Clerk), Clerk switched to a production instance, and an Anthropic API key. Part 2 can be built and tested with Clerk's development gateway before then.

---

## Part 1: Drill library and movement load

### Movement profile

Every drill, built-in or custom, has a profile:

| Field | Meaning | Range |
|---|---|---|
| `intensity` | Typical effort of the drill, for display and as a sanity check against the player's RPE | 1 to 10 |
| `sprint` | Share of drill time spent sprinting (max-speed efforts) | 0 to 1 |
| `hsr` | Share at high-speed running below sprint | 0 to 1 |
| `cod` | Share in sharp changes of direction, cutting and turning | 0 to 1 |
| `jump` | Share in jumping and landing | 0 to 1 |
| `contact` | Share in physical contact and duels | 0 to 1 |
| `strength` | Share in strength or prevention work (for example Nordic curls) | 0 to 1 |

The shares describe exposure and do not need to add up to 1 (a small-sided game is both change-of-direction and contact heavy). Built-in values are estimates informed by published football drill research, and are labelled as estimates in the app.

### Built-in library

About 30 drills in `shared/drills.ts` (code, versioned and tested, not a database table). Each has a stable `id`, a name, a category and a profile. Categories: warm-up, technical, rondo and possession, small-sided game, tactical, finishing, crossing, speed and sprint, conditioning, strength and injury prevention, goalkeeper, cool-down. Stable ids mean renaming a drill never breaks logged sessions.

### Logging

- The Log session screen gets an optional "What did you do?" step: search or browse the library, add drills, set minutes for each.
- Drill minutes cannot exceed the session's minutes. Logging drills is optional; a session without drills behaves exactly as today.
- Session load is unchanged: minutes × RPE.

### Data

New table `session_drills`: `id`, `user_id`, `session_id` (references the session, deleted with it), `drill_id` (built-in id) or `custom_drill_id` (part 3, exactly one of the two set), `minutes` (1 to 300). Same rules as the other tables: row-level security on `user_id`, column-level grants for the app role, and a per-player row cap (20,000).

The API accepts drills inside the existing `POST /sessions` body (`drills: [{ drillId, minutes }]`) and returns them with each session in the overview and export. Validation lives in `shared/validation.ts` and rejects unknown drill ids, more drill minutes than session minutes, and more than 12 drills per session.

### Scoring

New module `shared/movement.ts`, written test-first:

- **Exposure per session and type:** drill minutes × the type's share, summed over the session's drills.
- **Movement ratio per type:** exposure over the last 7 days ÷ the average week over the last 28 days. This is the same shape as the workload ratio, so it is easy to explain.
- **Baseline rule:** a type is only judged once the player has logged drills in at least 3 of the last 4 weeks, and the average week over the last 28 days has at least 5 minutes of that type. This avoids false spikes from sparse data.
- **Spike points:** ratio up to 1.3 = no extra points; 1.3 to 1.5 = 50; above 1.5 = 85. These are the same points as the workload-ratio zones.
- **Into the score:** the training-load part of the score (still 45% of the total) becomes the higher of the workload-ratio points and the highest movement-spike points. The 45/30/25 weighting and the injury multiplier are unchanged.
- **Advice:** one rule per type, each with a source. Sprint and high-speed spikes point to hamstrings. Change-of-direction spikes point to knees and ankles. Jump spikes point to the patellar tendon. Contact spikes point to bruising and contusion. Recommendation category: "Training load", which links to Log session as today.

The science page gets a "Movement load" section that explains the method and its limits: estimated profiles and self-reported minutes.

### Dashboard

A "Movement this week" panel shows bars per type, this week against your usual, with a text table for screen readers. It appears only once at least one type has a baseline. The dataviz rules apply (validated palette, legend, hover).

### Testing

- Unit tests for `movement.ts`: exposure, ratio, baseline rule, spike points, and that spikes do not change the score when no drills are logged.
- Validation tests for drills on sessions.
- API tests for sessions with drills (in-memory repo).
- RLS tests and the Neon journey test, extended to cover `session_drills`.
- Library checks: every profile is within range, there are no duplicate ids, and every category is used.

---

## Part 2: PitchSafe Plus ($60/year, Clerk Billing)

- **Plan:** enable Billing for users in Clerk. Create the plan "PitchSafe Plus", billed yearly at $60, with the feature `custom_drills` (and room for later paid features).
- **Upgrade surfaces:** a Plus card in Settings with Clerk's `PricingTable` (from `@clerk/react`). The "Create a custom drill" button shows an upgrade prompt for free players. Checkout copy says players under 18 should ask a parent or guardian to pay.
- **Server enforcement:** every paid endpoint checks the verified Clerk session for the `custom_drills` feature before doing anything. How the feature reaches the Worker is verified during implementation, with a short probe of a real session token. It is either the token's billing claim or a Clerk Backend API lookup, cached briefly.
- **Cancelling:** through Clerk's subscription details, linked from Settings. Refunds are issued in Stripe by the owner.
- **Limits of Clerk Billing (accepted):** USD only, no tax or VAT handling, refunds only in Stripe, and 3D Secure-challenged cards fail. The owner checks tax obligations.
- **Terms and privacy:** add subscription, renewal, cancellation and refund wording.
- **Owner actions:** create a Stripe account, connect it in Clerk, and run `clerk deploy` for production (DNS records on pitchsafe.us). Until then, everything is tested with Clerk's development gateway.

## Part 3: Custom drills profiled by Haiku 5.5

- **Create flow (Plus only):**
  - The player enters a name (up to 60 characters) and a description (up to 500), for example "4v4 in a 20×25 grid, two-touch, 4 × 4 min".
  - `POST /api/drills/custom/estimate` returns an AI-estimated profile.
  - The player sees it, marked "Estimated by AI", can adjust any value, and saves with `POST /api/drills/custom`.
  - Saved custom drills appear in the drill picker beside built-in ones and work the same in scoring.
- **AI call:**
  - The Worker calls the Anthropic Messages API with model `claude-haiku-5-5`.
  - The system prompt holds the profile definitions and the built-in library as calibration examples.
  - A required tool or JSON schema forces the output: `intensity`, `category`, the six shares, and a one-sentence `reason`.
  - The Worker validates and clamps every value with the same validator as built-in profiles. If the output is invalid, the player gets a clear error and can enter the values by hand.
- **Safety:**
  - Only the drill name and description are sent: no player name, health data or ids.
  - The description is treated as data inside the prompt. The model has no tools or actions beyond returning the profile.
  - Output is never rendered as HTML.
  - The `ANTHROPIC_API_KEY` is a Worker secret, entered by the owner in a hidden prompt.
- **Cost limits:**
  - 20 estimates per player per day (a Workers rate-limit binding plus a daily count in the database).
  - Up to 100 saved custom drills per player.
  - Request timeout, and no retries on errors except one on rate limiting.
  - At Haiku pricing an estimate costs well under a cent.
- **Data:**
  - New table `custom_drills`: `id`, `user_id`, `name`, `description`, the profile fields, `ai_estimated` (boolean), `created_at`. Same RLS, grants and row cap as the other tables.
  - Custom drills are included in data export and deleted with the account.
- **Privacy:** the policy states that Plus players' drill descriptions are sent to Anthropic to estimate the profile.
- **Reviews:** llm-feature-reviewer, security-reviewer and database-reviewer before merge.

## Out of scope

Team or coach accounts, shared team drill lists, AI chat or coaching summaries, video, and any change to the 45/30/25 weighting.
