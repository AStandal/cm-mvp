import { spawn } from 'node:child_process';

export type CommandResult = { code: number; stdout: string; stderr: string };

export function runCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<CommandResult> {
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

export async function listPlaywrightTests(frontendCwd: string, timeoutMs = 120_000) {
  const result = await runCommand('npx', ['--yes', 'playwright', 'test', '--list', '--reporter', 'json'], frontendCwd, timeoutMs);
  try {
    return { ...result, json: JSON.parse(result.stdout) };
  } catch {
    return { ...result, json: null };
  }
}

export async function runPlaywrightTests(frontendCwd: string, options: { reporter?: string; testFilter?: string; headless?: boolean; timeoutMs?: number } = {}) {
  const args: string[] = ['playwright', 'test', '--reporter', options.reporter ?? 'json'];
  if (options.testFilter) {
    if (options.testFilter.endsWith('.ts') || options.testFilter.endsWith('.js')) {
      args.push(options.testFilter);
    } else {
      args.push('--grep', options.testFilter);
    }
  }
  if (options.headless === false) {
    args.push('--headed');
  }
  const result = await runCommand('npx', ['--yes', ...args], frontendCwd, options.timeoutMs ?? 10 * 60 * 1000);
  try {
    return { ...result, json: JSON.parse(result.stdout) };
  } catch {
    return { ...result, json: null };
  }
}