// Cloudflare Worker entry: wires the API to Clerk, Supabase and the rate limiters.
// Static files (the React app) are served by Workers static assets before this runs.
import { createClerkClient, verifyToken } from '@clerk/backend';
import { createApp } from './app';
import { supabaseRepo } from './repo';

export interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  /** Comma-separated origins allowed as the token's `azp` claim. */
  ALLOWED_ORIGINS: string;
  READ_LIMITER: RateLimit;
  WRITE_LIMITER: RateLimit;
}

const REQUIRED: (keyof Env)[] = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'ALLOWED_ORIGINS'];

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
    repoFor: (token, userId) => supabaseRepo({ url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY }, token, userId),
    async allow(bucket, userId) {
      const limiter = bucket === 'read' ? env.READ_LIMITER : env.WRITE_LIMITER;
      const { success } = await limiter.limit({ key: `${bucket}:${userId}` });
      return success;
    },
    async deleteClerkUser(userId) {
      await clerk.users.deleteUser(userId);
    },
  });
}

export default {
  async fetch(request, env, ctx) {
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
