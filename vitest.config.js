import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        // Keep the unit/contract suite as the default while making the
        // Playwright suite explicitly opt-in through `npm run test:visual`.
        exclude: [
            ...configDefaults.exclude,
            '**/visual/**/*.spec.js',
            '**/visual/**/*.spec.{mjs,cjs,ts,tsx}',
            '**/playwright.config.*',
            '**/playwright-report/**',
            '**/test-results/**',
            '**/visual-artifacts/**',
            '**/visual-snapshots/**',
            '**/visual-output/**'
        ]
    }
});
