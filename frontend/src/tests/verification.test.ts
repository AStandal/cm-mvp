import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('Frontend Verification Suite', () => {
  describe('Project Structure', () => {
    it('should have all required directories', async () => {
      const requiredDirs = [
        'src/components',
        'src/services',
        'src/types',
        'src/utils',
        'src/test'
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
        'tsconfig.node.json',
        'vite.config.ts',
        'eslint.config.js',
        '.env.example',
'tailwind.config.cjs',
        'index.html'
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(process.cwd(), file);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists, `File ${file} should exist`).toBe(true);
      }
    });

    it('should have required entry point files', async () => {
      const requiredFiles = [
        'src/main.tsx',
        'src/App.tsx',
        'src/index.css'
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(process.cwd(), file);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists, `File ${file} should exist`).toBe(true);
      }
    });
  });

  // Note: TypeScript compilation and linting are tested separately in the verify command
  // to avoid redundant execution

  describe('Dependencies', () => {
    it('should have all required dependencies installed', async () => {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
      );

      const requiredDeps = [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'axios'
      ];

      for (const dep of requiredDeps) {
        expect(packageJson.dependencies[dep], `Dependency ${dep} should be present`).toBeDefined();
      }

      const requiredDevDeps = [
        '@types/react',
        '@types/react-dom',
        '@vitejs/plugin-react',
        'typescript',
        'vite',
        'vitest',
        'tailwindcss',
        '@testing-library/react',
        '@testing-library/jest-dom'
      ];

      for (const dep of requiredDevDeps) {
        expect(packageJson.devDependencies[dep], `Dev dependency ${dep} should be present`).toBeDefined();
      }
    });
  });

  describe('Type Definitions', () => {
    it('should export all required types', async () => {
      const typesModule = await import('../types/index.js');

      // Verify core enums
      expect(typesModule.ProcessStep).toBeDefined();
      expect(typesModule.CaseStatus).toBeDefined();
      expect(typeof typesModule.ProcessStep.RECEIVED).toBe('string');
      expect(typeof typesModule.CaseStatus.ACTIVE).toBe('string');

      // Verify enum values
      expect(typesModule.ProcessStep.RECEIVED).toBe('received');
      expect(typesModule.CaseStatus.ACTIVE).toBe('active');
    });

    it('should have consistent type definitions with backend', async () => {
      const { ProcessStep, CaseStatus } = await import('../types/index.js');

      // Verify all process steps are defined
      const expectedSteps = ['RECEIVED', 'IN_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'READY_FOR_DECISION', 'CONCLUDED'];
      for (const step of expectedSteps) {
        expect(ProcessStep[step as keyof typeof ProcessStep]).toBeDefined();
      }

      // Verify all case statuses are defined  
      const expectedStatuses = ['ACTIVE', 'PENDING', 'APPROVED', 'DENIED', 'WITHDRAWN', 'ARCHIVED'];
      for (const status of expectedStatuses) {
        expect(CaseStatus[status as keyof typeof CaseStatus]).toBeDefined();
      }
    });
  });

  describe('Vite Configuration', () => {
    it('should have proper path aliases configured', async () => {
      const viteConfig = await fs.readFile(path.join(process.cwd(), 'vite.config.ts'), 'utf-8');

      // Check for path aliases
      expect(viteConfig).toContain('@/types');
      expect(viteConfig).toContain('@/components');
      expect(viteConfig).toContain('@/services');
      expect(viteConfig).toContain('@/utils');
    });

    it('should have proxy configuration for API', async () => {
      const viteConfig = await fs.readFile(path.join(process.cwd(), 'vite.config.ts'), 'utf-8');

      // Check for API proxy configuration
      expect(viteConfig).toContain('/api');
      expect(viteConfig).toContain('port: 3000');
      expect(viteConfig).toContain('localhost:3001');
    });

    it('should have test configuration', async () => {
      const viteConfig = await fs.readFile(path.join(process.cwd(), 'vite.config.ts'), 'utf-8');

      // Check for test configuration
      expect(viteConfig).toContain('test:');
      expect(viteConfig).toContain('globals: true');
      expect(viteConfig).toContain('environment: \'jsdom\'');
    });
  });

  describe('React Application', () => {
    it('should have App component properly defined', async () => {
      const appFile = await fs.readFile(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');

      // Check for essential React component structure
      expect(appFile).toContain('function App()');
      expect(appFile).toContain('return');
      expect(appFile).toContain('export default App');
    });

    it('should have main entry point properly configured', async () => {
      const mainFile = await fs.readFile(path.join(process.cwd(), 'src/main.tsx'), 'utf-8');

      // Check for essential React entry point structure
      expect(mainFile).toContain('import React');
      expect(mainFile).toContain('import ReactDOM');
      expect(mainFile).toContain('ReactDOM.createRoot');
      expect(mainFile).toContain('<App />');
    });
  });

  describe('CSS Configuration', () => {
    it('should have Tailwind CSS properly configured', async () => {
      const cssFile = await fs.readFile(path.join(process.cwd(), 'src/index.css'), 'utf-8');
      const tailwindConfig = await fs.readFile(path.join(process.cwd(), 'tailwind.config.cjs'), 'utf-8');

      // Check for Tailwind directives in CSS (v4 syntax)
      expect(cssFile).toContain('@import "tailwindcss"');

      // Check for proper Tailwind configuration
      expect(tailwindConfig).toContain('content:');
      expect(tailwindConfig).toContain('./src/**/*.{js,ts,jsx,tsx}');
    });
  });
});