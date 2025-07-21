# Project Verification System

This document describes the comprehensive verification system for the AI Case Management System project.

## Overview

The verification system ensures code quality, project structure integrity, and functionality after each development task. It includes automated tests, linting, type checking, and build verification.

## Architecture

The verification system follows a **single source of truth** approach:

- **Root Level**: Simple orchestration via `npm run verify`
- **Component Level**: Each component (backend/frontend) owns its verification logic
- **No Duplication**: Verification steps are defined once per component

### Verification Flow
```
npm run verify
├── npm run verify:backend
│   └── cd backend && npm run verify
│       ├── npm run build
│       ├── npm run lint  
│       ├── npm run test
│       └── npm run test:verify
└── npm run verify:frontend
    └── cd frontend && npm run verify
        ├── npm run build
        ├── npm run lint
        ├── npm run test
        └── npm run test:verify
```

## Verification Components

### 1. Automated Test Suites

#### Backend Verification (`backend/src/tests/verification.test.ts`)
- **Project Structure** (2 tests):
  - Verifies all required directories exist (`src/types`, `src/services`, `src/routes`, etc.)
  - Checks for essential configuration files (`package.json`, `tsconfig.json`, etc.)
- **TypeScript Compilation** (1 test):
  - Ensures code compiles without TypeScript errors via `npm run build`
- **Linting** (1 test):
  - Validates ESLint passes without errors (warnings are acceptable)
- **Dependencies** (1 test):
  - Confirms all required packages are installed:
    - Core: `express`, `cors`, `helmet`, `sqlite3`, `openai`, etc.
    - Dev: `typescript`, `tsx`, `vitest`, type definitions, etc.
- **Type Definitions** (2 tests):
  - Verifies core enums (`ProcessStep`, `CaseStatus`) are properly exported
  - Checks that service interfaces are defined and loadable
- **Server Module** (1 test):
  - Tests that the Express server module can be imported without errors

#### Frontend Verification (`frontend/src/tests/verification.test.ts`)
- **Project Structure** (3 tests):
  - Verifies all required directories exist (`src/components`, `src/services`, `src/types`, etc.)
  - Checks for essential configuration files (`package.json`, `tsconfig.json`, etc.)
  - Validates entry point files (`main.tsx`, `App.tsx`, `index.css`)
- **TypeScript Compilation** (1 test):
  - Ensures code compiles without critical TypeScript errors
  - Ignores expected module-related warnings in test files
- **Linting** (1 test):
  - Validates ESLint passes without errors (warnings are acceptable)
- **Dependencies** (1 test):
  - Confirms all required packages are installed:
    - Core: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, etc.
    - Dev: `typescript`, `vite`, `vitest`, `tailwindcss`, etc.
- **Type Definitions** (2 tests):
  - Verifies core enums (`ProcessStep`, `CaseStatus`) are properly exported
  - Ensures all expected enum values are defined and consistent
- **Vite Configuration** (3 tests):
  - Checks for proper path aliases configuration
  - Validates API proxy setup
  - Verifies test environment configuration
- **React Application** (2 tests):
  - Examines App component structure and exports
  - Validates main entry point configuration
- **CSS Configuration** (1 test):
  - Verifies Tailwind CSS directives and configuration

### 2. Verification Scripts

#### Test Configuration
- **Frontend Tests**: Uses a dedicated `vitest.config.ts` with Node.js environment for file system operations
- **TypeScript Config**: Separate `tsconfig.test.json` for verification tests with Node.js types

#### Root Verification Scripts (`package.json`)
Simple orchestration that delegates to component verification:
```json
{
  "scripts": {
    "verify": "npm run verify:backend && npm run verify:frontend",
    "verify:backend": "cd backend && npm run verify",
    "verify:frontend": "cd frontend && npm run verify"
  }
}
```

#### Component Verification Scripts (backend/frontend `package.json`)
Each component defines its own verification steps:
```json
{
  "scripts": {
    "verify": "npm run build && npm run lint && npm run test && npm run test:verify",
    "test:verify": "vitest --run src/tests/verification.test.ts"
  }
}
```

**Available Commands:**
- `npm run verify` - Full project verification
- `npm run verify:backend` - Backend-only verification  
- `npm run verify:frontend` - Frontend-only verification
- `npm run test:verify` - Run verification tests only (per component)

### 3. Automated Workflows

#### GitHub Actions (`.github/workflows/verify.yml`)
- Runs on every push and pull request
- Tests multiple Node.js versions (18.x, 20.x)
- Provides detailed failure reports
- Uploads artifacts for debugging

#### Pre-commit Hooks (`.githooks/pre-commit`)
- Runs verification before each commit
- Prevents broken code from being committed
- Can be installed with: `git config core.hooksPath .githooks`

## Usage

### Running Verification Manually

```bash
# Full project verification
npm run verify

# Individual component verification
npm run verify:backend
npm run verify:frontend

# Install all dependencies first
npm run install:all
```

### Running Specific Verification Tests

```bash
# Backend verification tests only
cd backend && npm run test:verify

# Frontend verification tests only  
cd frontend && npm run test:verify
```

### Setting Up Pre-commit Hooks

```bash
# Enable git hooks
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

## What Gets Verified

### ✅ Project Structure
- Required directories exist
- Configuration files are present
- Entry points are available

### ✅ Code Quality
- TypeScript compilation without errors
- ESLint passes with acceptable warnings
- No critical linting errors

### ✅ Dependencies
- All required packages installed
- Version compatibility
- No missing dependencies

### ✅ Type Safety
- TypeScript interfaces defined
- Enum values consistent
- Frontend/backend type consistency

### ✅ Build Process
- Backend compiles to JavaScript
- Frontend builds for production
- Source maps generated

### ✅ Testing
- Unit tests pass
- Integration tests pass
- Verification tests pass

## Integration with Development Workflow

### After Each Task
1. Run `npm run verify` to ensure everything works
2. Fix any issues before proceeding to next task
3. Commit changes (pre-commit hook runs automatically)

### Before Deployment
1. Full verification must pass
2. All tests must be green
3. Build artifacts must be generated successfully

### Continuous Integration
- GitHub Actions runs verification on every push
- Pull requests require passing verification
- Multiple Node.js versions tested

## Troubleshooting

### Common Issues

#### TypeScript Compilation Errors
```bash
# Check specific errors
cd backend && npm run build
cd frontend && npm run build
```

#### Linting Failures
```bash
# Auto-fix linting issues
cd backend && npm run lint
cd frontend && npm run lint
```

#### Missing Dependencies
```bash
# Reinstall all dependencies
npm run install:all
```

#### Test Failures
```bash
# Run tests with verbose output
cd backend && npm run test:watch
cd frontend && npm run test:watch
```

### Getting Help

1. Check the verification output for specific error messages
2. Review the relevant configuration files (tsconfig.json, .eslintrc.json)
3. Ensure all dependencies are installed with `npm run install:all`
4. Check that Node.js version is 18+ with `node --version`

## Extending the Verification System

### Adding New Verification Tests

1. Add tests to `backend/src/tests/verification.test.ts` or `frontend/src/tests/verification.test.ts`
2. Update the verification script if needed
3. Test the new verification locally
4. Update this documentation

### Adding New Quality Checks

1. Update ESLint configurations (`.eslintrc.json`)
2. Add new npm scripts to package.json
3. Update the verification script to include new checks
4. Test thoroughly before committing


This verification system ensures consistent code quality and project integrity throughout the development lifecycle.