import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom', // Use jsdom environment for React component tests
        include: ['src/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        // Enable TypeScript type checking in tests
        typecheck: {
            enabled: true,
            tsconfig: './tsconfig.test.json',
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});