import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { spawn } from 'node:child_process';
import path from 'node:path';

const server = new McpServer({ name: 'playwright-mcp', version: '0.1.0' });

function runCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{ code: number, stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const onData = (data: Buffer) => { stdout += data.toString(); };
    const onErr = (data: Buffer) => { stderr += data.toString(); };
    child.stdout.on('data', onData);
    child.stderr.on('data', onErr);

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

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
    const args: string[] = ['playwright', 'test', '--reporter', reporter];
    if (testFilter) {
      if (testFilter.endsWith('.ts') || testFilter.endsWith('.js')) {
        args.push(testFilter);
      } else {
        args.push('--grep', testFilter);
      }
    }
    if (headless === false) {
      args.push('--headed');
    }

    const { code, stdout, stderr } = await runCommand('npx', ['--yes', ...args], cwd, timeoutMs);

    let summary: any = {};
    try {
      summary = JSON.parse(stdout);
    } catch {
      summary = { raw: stdout };
    }

    const failed = summary?.status === 'failed' || (summary?.suites?.some((s: any) => s.status === 'failed'));

    return {
      content: [
        { type: 'text', text: JSON.stringify({ exitCode: code, failed, summary }, null, 2) },
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
    const { code, stdout, stderr } = await runCommand('npx', ['--yes', 'playwright', 'test', '--list', '--reporter', 'json'], cwd, 120_000);

    let result: any = {};
    try {
      result = JSON.parse(stdout);
    } catch {
      result = { raw: stdout };
    }

    return {
      content: [
        { type: 'text', text: JSON.stringify({ exitCode: code, tests: result?.tests ?? result, stderr }, null, 2) }
      ]
    };
  }
);

await server.connect(new StdioServerTransport());
console.error('playwright-mcp server started');