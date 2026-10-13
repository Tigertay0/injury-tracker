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

/** Writes Workers static-asset headers (CSP and friends) into the client build. */
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
        `script-src 'self'${clerkSrc} https://challenges.cloudflare.com`,
        `connect-src 'self'${clerkSrc} https://clerk-telemetry.com https://challenges.cloudflare.com`,
        "img-src 'self' data: https://img.clerk.com",
        "style-src 'self' 'unsafe-inline'", // Clerk injects component styles at runtime
        "font-src 'self' data:",
        'frame-src https://challenges.cloudflare.com',
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
        '  X-Content-Type-Options: nosniff',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
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
