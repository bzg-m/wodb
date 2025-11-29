import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        // Use path relative to repo root so running via `npm --prefix frontend` still resolves correctly.
        setupFiles: './frontend/vitest.setup.ts',
        include: ['**/__tests__/**/*.test.{ts,tsx,js,jsx}'],
    },
});
