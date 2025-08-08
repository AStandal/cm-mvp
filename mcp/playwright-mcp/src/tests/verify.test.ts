import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { listPlaywrightTests } from '../lib/playwright.js';

// This test uses `playwright test --list`, which does not require browser binaries
// It validates that our MCP server's underlying helpers can enumerate tests

describe('Playwright MCP helpers', () => {
  it('lists frontend Playwright tests as JSON and includes smoke spec path', async () => {
    const frontendDir = path.resolve(process.cwd(), '../../frontend');
    const { code, json, stdout, stderr } = await listPlaywrightTests(frontendDir, 120_000);
    expect(code).toBe(0);
    // Either JSON parse succeeds with a tests array, or fallback to raw stdout
    const outputText = json ? JSON.stringify(json) : stdout;
    expect(outputText).toContain('e2e/smoke.spec.ts');
    expect(stderr).toBeDefined();
  });
});