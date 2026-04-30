import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    sequence: { concurrent: false },     // schema tests share a DB; serialize
    pool: 'forks',
    testTimeout: 30_000,
  },
});
