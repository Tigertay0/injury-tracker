import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { fileURLToPath, URL } from 'node:url';

/** Clerk's Frontend API host is encoded in the publishable key: pk_(test|live)_base64("host$"). */
function clerkFrontendHost(publishableKey: string | undefined): string | null {
  const encoded = publishableKey?.replace(/^pk_(test|live)_/, '');
  if (!encoded) return null;
  const host = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '');
  return /^[a-z0-9.-]+$/i.test(host) ? host : null;
}

/** Writes Workers static-asset headers (CSP and friends) into the client build.
 * Clerk hosts follow https://clerk.com/docs/guides/secure/best-practices/csp-headers, which also lists the
 * Stripe hosts that Clerk Billing's checkout (Stripe Elements) loads */
function securityHeaders(publishableKey: string | undefined): Plugin {
  return {
    name: 'pitchsafe-security-headers',
    apply: 'build',
    generateBundle() {
      if (this.environment.name !== 'client') return;
      const clerk = clerkFrontendHost(publishableKey);
      const clerkSrc = clerk ? ` https://${clerk}` : '';
      const csp = [
        "default-src 'self'",
        `script-src 'self'${clerkSrc} https://challenges.cloudflare.com https://*.protect.clerk.com https://js.stripe.com https://*.js.stripe.com`,
        `connect-src 'self'${clerkSrc} https://*.protect.clerk.com:* https://clerk-telemetry.com https://*.clerk-telemetry.com https://challenges.cloudflare.com https://api.stripe.com`,
        "img-src 'self' data: blob: https://img.clerk.com",
        "style-src 'self' 'unsafe-inline'", // Clerk injects component styles at runtime
        "font-src 'self' data:",
        "frame-src 'self' https://challenges.cloudflare.com https://*.protect.clerk.com https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; ');
      const source = [
        '/*',
        `  Content-Security-Policy: ${csp}`,
        '  Strict-Transport-Security: max-age=86400',
        '  X-Content-Type-Options: nosniff',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
        '  Cross-Origin-Opener-Policy: same-origin-allow-popups',
        '/assets/*',
        '  Cache-Control: public, max-age=31536000, immutable',
        '/fonts/*',
        '  Cache-Control: public, max-age=31536000, immutable',
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: '_headers', source });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss(), cloudflare(), securityHeaders(env.VITE_CLERK_PUBLISHABLE_KEY)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: { port: 5173 },
  };
});
