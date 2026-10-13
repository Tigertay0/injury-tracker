# PitchSafe

Free injury-risk tracking for amateur soccer players. Players log sessions, a weekly recovery check-in, their cleats and injury history; PitchSafe turns that into a 0 to 100 risk score with cited, rule-based advice and a one-page coach report.

- **Site and app:** Cloudflare Worker (React app as static assets + API under `/api`)
- **Login:** Clerk
- **Database:** Supabase Postgres, every row locked to its owner by RLS on the Clerk user id
- **Spec:** [docs/spec.md](docs/spec.md) · **Design system:** [design-system.md](design-system.md) · **Original requirements:** [PRD.md](PRD.md)

## Pages

| Path | What it is |
|---|---|
| `/` | Landing page with a working load-ratio demo |
| `/use` | "Use our app": create an account or sign in, and add PitchSafe to a phone's home screen |
| `/demo` | The real app screens on sample data (nothing is saved) |
| `/science` | Every formula, threshold, weight and source |
| `/app` | Dashboard, log session, recovery, equipment, injuries, settings (sign-in required) |
| `/privacy`, `/terms` | Plain-language policies |

## How it fits together

```
browser ──► Cloudflare Worker ──► /api/* (worker/app.ts)
                │                    │  1. verify Clerk session token (@clerk/backend)
                │                    │  2. validate input (shared/validation.ts)
                │                    │  3. per-player rate limit (Workers Rate Limiting)
                │                    └─► Supabase PostgREST with the player's own token
                │                         (RLS: auth.jwt()->>'sub' = user_id)
                └─► static React app (dist/client)
```

No Supabase service key exists. The Clerk secret key is the only server secret.

The risk maths lives in `shared/` and is used by the app, the API, the coach PDF and the landing demo. It is covered by tests in `tests/`.

## Local development

```bash
npm install
npm run dev        # site + Worker at http://localhost:5173
npm test           # unit and API tests
npm run typecheck
```

Local configuration (both files are git-ignored):

- `.env.local`: `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` and optionally `VITE_CONTACT_EMAIL=you@example.com`
- `.dev.vars`: `CLERK_SECRET_KEY=sk_test_...`

Public Worker variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `ALLOWED_ORIGINS`) live in `wrangler.jsonc`.

## Deploying

```bash
npm run db:push    # apply supabase/migrations to the linked Supabase project
npm run deploy     # build and publish the Worker
```

The Clerk secret is set once with `npx wrangler secret put CLERK_SECRET_KEY`.

## Ownership and running costs

| Service | Used for | Plan |
|---|---|---|
| Cloudflare | Hosting, API, domain | Workers free tier covers 100,000 requests a day; domain renews yearly |
| Supabase | Database | Pro, $25/month per organization plus compute per project |
| Clerk | Login | Free up to 10,000 monthly active users |

## Changing things

- **Copy on the landing page:** `src/pages/landing/landing.tsx` (FAQ in `faq.tsx`).
- **Science page:** `src/pages/science.tsx`. Keep it in sync with `shared/` if a formula changes.
- **Risk rules and thresholds:** `shared/calculations.ts`, `shared/equipment.ts`, `shared/recommendations.ts`, then run `npm test`.
- **Colours, type, spacing:** tokens in `src/styles.css`, documented in `design-system.md`.
