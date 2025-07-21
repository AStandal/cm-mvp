import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node', // Use Node.js environment for verification tests
        include: ['src/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});