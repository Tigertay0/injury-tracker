import { defineConfig } from 'vite';

// ─── Secret Leak Detection Plugin ───────────────────────────────────────────
// Scans every generated chunk for the Anthropic key pattern at build time.
// Firebase VITE_* keys are intentionally bundled — only the Anthropic key
// (which has NO VITE_ prefix and must NEVER reach the browser) is blocked.
const SECRET_PATTERNS = [
  { pattern: /sk-ant-[A-Za-z0-9\-_]{10,}/, label: 'Anthropic API key' },
];

function secretLeakDetectorPlugin() {
  return {
    name: 'pitchsafe-secret-leak-detector',
    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const { pattern, label } of SECRET_PATTERNS) {
          if (pattern.test(chunk.code)) {
            this.error(
              `[PitchSafe] BUILD ABORTED: ${label} was detected in bundle "${fileName}".\n` +
              `A secret is being leaked into client JavaScript. Remove it immediately.`
            );
          }
        }
      }
    },
  };
}

// ─── Vite Config ─────────────────────────────────────────────────────────────
export default defineConfig(({ mode }) => ({
  root: '.',
  plugins: [
    secretLeakDetectorPlugin(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Strip all console.* calls in production so no env values
    // can leak through debug logging in the deployed bundle.
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // removes console.log, console.warn, etc.
        drop_debugger: true,  // removes debugger statements
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}));
