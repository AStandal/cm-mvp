import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

describe('Backend Verification Suite', () => {
  describe('Project Structure', () => {
    it('should have all required directories', async () => {
      const requiredDirs = [
        'src/types',
        'src/services', 
        'src/routes',
        'src/middleware',
        'src/utils',
        'src/database'
      ];

      for (const dir of requiredDirs) {
        const dirPath = path.join(process.cwd(), dir);
        const exists = await fs.access(dirPath).then(() => true).catch(() => false);
        expect(exists, `Directory ${dir} should exist`).toBe(true);
      }
    });

    it('should have all required configuration files', async () => {
      const requiredFiles = [
        'package.json',
        'tsconfig.json',
        '.eslintrc.json',
        '.env.example'
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(process.cwd(), file);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists, `File ${file} should exist`).toBe(true);
      }
    });
  });

  describe('TypeScript Compilation', () => {
    it('should compile without errors', async () => {
      try {
        const { stdout, stderr } = await execAsync('npm run build');
        expect(stderr).not.toContain('error TS');
        expect(stdout).toContain(''); // Build should complete
      } catch (error: any) {
        throw new Error(`TypeScript compilation failed: ${error.message}`);
      }
    });
  });

  describe('Linting', () => {
    it('should pass ESLint checks', async () => {
      try {
        const { stdout, stderr } = await execAsync('npm run lint');
        // Should not contain any errors (warnings are acceptable)
        expect(stderr).not.toContain('✖');
        expect(stderr).not.toContain('error');
      } catch (error: any) {
        // If exit code is non-zero due to warnings, check the output
        if (error.stdout && !error.stdout.includes('✖') && !error.stdout.includes('error')) {
          // Only warnings, which is acceptable
          return;
        }
        throw new Error(`ESLint failed: ${error.message}`);
      }
    });
  });

  describe('Dependencies', () => {
    it('should have all required dependencies installed', async () => {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
      );

      const requiredDeps = [
        'express',
        'cors', 
        'helmet',
        'sqlite3',
        'openai',
        'uuid',
        'zod',
        'dotenv'
      ];

      for (const dep of requiredDeps) {
        expect(packageJson.dependencies[dep], `Dependency ${dep} should be present`).toBeDefined();
      }

      const requiredDevDeps = [
        '@types/express',
        '@types/cors',
        '@types/sqlite3',
        '@types/uuid',
        '@types/node',
        'typescript',
        'tsx',
        'vitest'
      ];

      for (const dep of requiredDevDeps) {
        expect(packageJson.devDependencies[dep], `Dev dependency ${dep} should be present`).toBeDefined();
      }
    });
  });

  describe('Type Definitions', () => {
    it('should export all required types', async () => {
      const { ProcessStep, CaseStatus, Case, ApplicationData, AISummary } = await import('../types/index.js');
      
      expect(ProcessStep).toBeDefined();
      expect(CaseStatus).toBeDefined();
      expect(typeof ProcessStep.RECEIVED).toBe('string');
      expect(typeof CaseStatus.ACTIVE).toBe('string');
      
      // Verify enum values
      expect(ProcessStep.RECEIVED).toBe('received');
      expect(CaseStatus.ACTIVE).toBe('active');
    });

    it('should have service interfaces defined', async () => {
      const typesModule = await import('../types/index.js');
      
      // These are TypeScript interfaces, so we can't test them at runtime
      // But we can verify the module loads without errors
      expect(typesModule).toBeDefined();
    });
  });

  describe('Server Module', () => {
    it('should load server module without errors', async () => {
      try {
        const serverModule = await import('../index.js');
        expect(serverModule.default).toBeDefined();
      } catch (error: any) {
        throw new Error(`Server module failed to load: ${error.message}`);
      }
    });
  });
});