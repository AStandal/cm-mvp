import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { listPlaywrightTests } from '../lib/playwright.js';

// This test uses `playwright test --list`, which does not require browser binaries
// It validates that our MCP server's underlying helpers can enumerate tests

describe('Playwright MCP helpers', () => {
  it('lists frontend Playwright tests', async () => {
    const frontendDir = path.resolve(process.cwd(), '../../frontend');
    const { code, json, stdout, stderr } = await listPlaywrightTests(frontendDir, 120_000);

    expect(code).toBe(0);

    if (json && Array.isArray((json as any).tests)) {
      expect((json as any).tests.length).toBeGreaterThan(0);
    } else {
      // Fallback to plaintext output when JSON reporter is not available for --list
      expect(stdout).toMatch(/smoke|spec|test/i);
    }

    expect(stderr).toBeDefined();
  });
});