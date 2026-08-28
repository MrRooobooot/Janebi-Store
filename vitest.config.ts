import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});
