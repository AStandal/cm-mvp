/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Run tests sequentially to avoid database locking issues
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Set test timeout (longer for API tests that may include database operations)
    testTimeout: 30000,
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: 'test_data/test.db',
    },
    // Setup files
    setupFiles: [],
    // Global test configuration
    globals: true,
    // Test isolation for API tests
    isolate: true,
    // Enable TypeScript type checking in tests
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.test.json',
    },
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test_data/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
    // Reporter configuration for better API test output
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});