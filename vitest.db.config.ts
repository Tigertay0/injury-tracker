import { defineConfig } from 'vitest/config';

// Database tests hit a real Neon branch, so they run separately from `npm test`
export default defineConfig({
  test: { include: ['tests/db/**/*.test.ts'], testTimeout: 30_000, hookTimeout: 60_000, fileParallelism: false },
});
