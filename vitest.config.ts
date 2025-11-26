import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['src/**/__tests__/**/*.test.{ts,tsx,js,jsx}'],
    exclude: ['src/**/__tests__/**/*.test.{ts,tsx,js,jsx}'],
  },
});
