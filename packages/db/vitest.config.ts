import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    sequence: { concurrent: false },     // schema tests share a DB; serialize
    fileParallelism: false,              // all test files share one bts_test DB; run serially
    pool: 'forks',
    testTimeout: 30_000,
  },
});
