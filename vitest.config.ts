import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only look for tests in __tests__ directories and *.test.ts / *.spec.ts files
    include: [
      'shared/src/**/__tests__/**/*.{ts,tsx}',
      'shared/src/**/*.{test,spec}.{ts,tsx}',
      'server/src/**/__tests__/**/*.{ts,tsx}',
      'server/src/**/*.{test,spec}.{ts,tsx}',
    ],
    // Use tsconfig.test.json for shared (which includes vitest types)
    // vitest handles vitest imports itself — no separate tsconfig project needed for running
    environment: 'node',
    globals: true,
  },
});
