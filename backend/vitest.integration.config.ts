import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    globalSetup: ['./src/tests/integration/globalSetup.ts'],
    include: ['src/tests/integration/**/*.test.ts'],
    fileParallelism: false,
  },
});
