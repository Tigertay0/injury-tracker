// Cloudflare Worker entry: runs first on every request to enforce https and the bare
// domain, serves the React app from static assets, and wires the API to Clerk, Neon (via
// Hyperdrive) and the rate limiters.
import { createClerkClient, verifyToken } from '@clerk/backend';
import { createApp } from './app';
import { canonicalRedirect } from './canonical';
import { pingDatabase, postgresRepo } from './repo';

export interface Env {
  ASSETS: Fetcher;
  /** Cloudflare Hyperdrive in front of Neon Postgres (caching disabled). */
  HYPERDRIVE: Hyperdrive;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  /** Comma-separated origins allowed as the token's `azp` claim. */
  ALLOWED_ORIGINS: string;
  /** Public domain; www.<SITE_HOST> redirects to it. Empty means only enforce https. */
  SITE_HOST?: string;
  READ_LIMITER: RateLimit;
  WRITE_LIMITER: RateLimit;
}

const REQUIRED: (keyof Env)[] = ['HYPERDRIVE', 'CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'ALLOWED_ORIGINS'];

function missingConfig(env: Env): string[] {
  return REQUIRED.filter((key) => !env[key]);
}

function buildApp(env: Env) {
  const authorizedParties = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY, publishableKey: env.CLERK_PUBLISHABLE_KEY });

  return createApp({
    async verifyToken(token) {
      try {
        const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY, authorizedParties });
        return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
      } catch (err) {
        console.warn('[auth] token rejected', { reason: err instanceof Error ? err.message : 'unknown' });
        return null;
      }
    },
    repoFor: (_token, userId) => postgresRepo(env.HYPERDRIVE.connectionString, userId),
    async allow(bucket, userId) {
      const limiter = bucket === 'read' ? env.READ_LIMITER : env.WRITE_LIMITER;
      const { success } = await limiter.limit({ key: `${bucket}:${userId}` });
      return success;
    },
    async deleteClerkUser(userId) {
      await clerk.users.deleteUser(userId);
    },
    pingDatabase: () => pingDatabase(env.HYPERDRIVE.connectionString),
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const target = canonicalRedirect(url, env.SITE_HOST ?? '');
    // 308 keeps the method and body, so a stray http API call is redirected intact
    if (target) return Response.redirect(target, 308);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const missing = missingConfig(env);
    // An empty origin list would make Clerk skip the azp check entirely
    if (env.ALLOWED_ORIGINS && !env.ALLOWED_ORIGINS.split(',').some((o) => o.trim())) missing.push('ALLOWED_ORIGINS');
    if (missing.length > 0) {
      console.error('[config] missing Worker variables', { missing });
      return Response.json({ error: 'The server is not configured yet.' }, { status: 503 });
    }
    return buildApp(env).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
