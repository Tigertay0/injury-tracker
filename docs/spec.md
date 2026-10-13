# PitchSafe: one-page spec

**For:** amateur soccer players aged 13-25 (school, university and club teams) and their coaches, who want to stay injury-free without paying for pro sports-science tools.

**The one thing a visitor must do:** open the app and log their first training session.

## Pages

| Page | Purpose |
|---|---|
| `/` Landing | Explains the whole product: the problem, how the risk score works, what you log, what you get, the science, the limits. Ends on "Use our app". |
| `/use` Use our app | The gateway: create an account or sign in (Clerk), the 3 steps to get started, and how to add PitchSafe to your phone's home screen. Button into the app. |
| `/science` | Public methodology: every formula, threshold, weight and citation, plus limitations and what a clinical tool would need. |
| `/privacy`, `/terms` | Plain-language data and usage terms (drafts for the owner to review). |
| `/app` Dashboard | Risk score 0-100 with verdict, ACWR, recovery, equipment, 28-day load chart, top recommendations, nutrition notes, coach PDF. |
| `/app/log` | Log a session (date, type, minutes, effort 1-10) with live load preview and recent sessions. |
| `/app/recovery` | Weekly check-in (sleep, soreness, stress, nutrition) with live score and history. |
| `/app/equipment` | Pick cleats and usual surface; see the risk of the pairing and safer options. |
| `/app/injuries` | Injury history: add, mark as recovered, delete; shows how history changes the score. |
| `/app/settings` | Position, display name, export my data (JSON), delete my account and data. |

## Must work

- Sign up / sign in with Clerk (email + Google). Accounts are optional to browse, required to log.
- All data in Neon Postgres, locked per player by database rules (RLS) tied to the Clerk login.
- API on a Cloudflare Worker: checks the login, validates every input, rate-limits each player.
- Risk math exactly as the PRD (ACWR, recovery, equipment matrix, injury multipliers, composite), covered by tests.
- Coach PDF report generated in the browser (no health data sent anywhere new).
- Installable on phones (home-screen app), works at 375px.
- Export all my data; delete my account and all data.

## Lives at

Cloudflare Workers (site + API) with Hyperdrive, custom domain bought on Cloudflare. Neon (Postgres database). Clerk (login).

## Done when

- A new player can sign up, set position and cleats, log sessions, do a check-in, add an injury, see the dashboard update, download the PDF, export and delete their data, on phone and desktop.
- One player can never read or change another player's data (tested against the real database).
- All tests, typecheck and the design pre-ship checks pass; the live URL is verified.

## Not in v1

- Claude-written narrative explanations (pending owner decision; costs per use).
- Coach accounts that see a whole team (players share the PDF instead).
- Wearable or GPS imports. French translation. Parental consent emails.
