# PitchSafe

Free injury-risk tracking for amateur soccer players. Players log sessions, a weekly recovery check-in, their cleats and injury history; PitchSafe turns that into a 0 to 100 risk score with cited, rule-based advice and a one-page coach report.

- **Site and app:** Cloudflare Worker (React app as static assets + API under `/api`)
- **Login:** Clerk
- **Database:** Neon Postgres via Cloudflare Hyperdrive, every row locked to its owner by RLS on the Clerk user id
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
                │                    └─► Neon Postgres through Hyperdrive, in a transaction as
                │                         the restricted pitchsafe_app role with app.user_id set
                │                         (RLS: user_id = current_setting('app.user_id'))
                └─► static React app (dist/client)
```

Server secrets: the Clerk secret key, and the Neon connection string held inside the Hyperdrive config.

The risk maths lives in `shared/` and is used by the app, the API, the coach PDF and the landing demo. It is covered by tests in `tests/`.

## Local development

```bash
npm install
npm run dev        # site + Worker at http://localhost:5173
npm test           # unit and API tests
npm run test:db    # schema + RLS tests against a Neon test branch (DATABASE_URL_TEST)
npm run typecheck
```

Local configuration (both files are git-ignored):

- `.env`: `VITE_CLERK_PUBLISHABLE_KEY`, optional `VITE_CONTACT_EMAIL`, and `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` (a Neon dev branch); see `.env.example`
- `.dev.vars`: `CLERK_SECRET_KEY` and `DATABASE_URL` (Neon owner URL, for migrations); see `.dev.vars.example`

Public Worker variables (`CLERK_PUBLISHABLE_KEY`, `ALLOWED_ORIGINS`) and the Hyperdrive id live in `wrangler.jsonc`.

## Deploying

```bash
npm run db:migrate # apply db/migrations to Neon (DATABASE_URL = owner URL)
npm run deploy     # build and publish the Worker
```

The Clerk secret is set once with `npx wrangler secret put CLERK_SECRET_KEY`. The Hyperdrive config is created once with `npx wrangler hyperdrive create pitchsafe --connection-string=<neon url> --caching-disabled`.

## Ownership and running costs

| Service | Used for | Plan |
|---|---|---|
| Cloudflare | Hosting, API, domain | Workers free tier covers 100,000 requests a day; domain renews yearly |
| Neon | Database | Free tier to start (0.5 GB, scales to zero); paid plans from about $19/month if you outgrow it |
| Clerk | Login | Free up to 10,000 monthly active users |

## Changing things

- **Copy on the landing page:** `src/pages/landing/landing.tsx` (FAQ in `faq.tsx`).
- **Science page:** `src/pages/science.tsx`. Keep it in sync with `shared/` if a formula changes.
- **Risk rules and thresholds:** `shared/calculations.ts`, `shared/equipment.ts`, `shared/recommendations.ts`, then run `npm test`.
- **Colours, type, spacing:** tokens in `src/styles.css`, documented in `design-system.md`.
