import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import path from 'node:path';
import { listPlaywrightTests as listTests, runPlaywrightTests as runTests } from './lib/playwright.js';

const server = new McpServer({ name: 'playwright-mcp', version: '0.1.0' });

server.tool(
  'run_playwright_tests',
  {
    cwd: z.string().default(path.resolve(process.cwd(), '../../frontend')),
    testFilter: z.string().optional().describe('Grep pattern or test file path'),
    headless: z.boolean().default(true),
    reporter: z.string().default('json'),
    timeoutMs: z.number().int().positive().default(10 * 60 * 1000)
  },
  async ({ cwd, testFilter, headless, reporter, timeoutMs }) => {
    const { code, stdout, stderr, json } = await runTests(cwd, { testFilter, headless, reporter, timeoutMs });
    const failed = json?.status === 'failed' || (json?.suites?.some((s: any) => s.status === 'failed'));
    return {
      content: [
        { type: 'text', text: JSON.stringify({ exitCode: code, failed, summary: json ?? { raw: stdout } }, null, 2) },
        ...(stderr ? [{ type: 'text' as const, text: `stderr:\n${stderr}` }] : [])
      ]
    };
  }
);

server.tool(
  'list_playwright_tests',
  {
    cwd: z.string().default(path.resolve(process.cwd(), '../../frontend'))
  },
  async ({ cwd }) => {
    const { code, stdout, stderr, json } = await listTests(cwd);
    return {
      content: [
        { type: 'text', text: JSON.stringify({ exitCode: code, tests: json?.tests ?? json ?? stdout, stderr }, null, 2) }
      ]
    };
  }
);

await server.connect(new StdioServerTransport());
console.error('playwright-mcp server started');