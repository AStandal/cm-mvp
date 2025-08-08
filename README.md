# AI Case Management System

An AI-powered case management system with automated processing and intelligent recommendations.

## Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher

## Getting Started

### 1. Install Dependencies

```bash
# Install all dependencies for both frontend and backend
npm run install:all
```

### 2. Environment Setup

Copy the example environment files and configure them:

```bash
# Backend environment (already created)
# Edit backend/.env with your configuration

# Frontend environment (already created)  
# Edit frontend/.env with your configuration
```

### 3. Running the Application

#### Backend (API Server)
```bash
# Development mode with auto-reload
npm run dev:backend

# Or run directly in backend directory
cd backend
npm run dev
```

The backend server will start on `http://localhost:3002`

#### Frontend (React App)
```bash
# Development mode with hot reload
npm run dev:frontend

# Or run directly in frontend directory
cd frontend
npm run dev
```

The frontend application will start on `http://localhost:3000`

### 4. Building for Production

```bash
# Build both frontend and backend
npm run build:all

# Or build individually
cd backend && npm run build
cd frontend && npm run build
```

### 5. Running Tests

```bash
# Run all tests
npm run test:all

# Run verification tests
npm run verify

# Run tests individually
cd backend && npm test
cd frontend && npm test
```

## Development Commands

- `npm run verify` - Run comprehensive project verification
- `npm run lint:all` - Run linting for both projects
- `npm run build:all` - Build both projects
- `npm run test:all` - Run all tests

## Project Structure

```
├── backend/          # Express.js API server
├── frontend/         # React application
├── .github/          # GitHub Actions workflows
├── .githooks/        # Git hooks for verification
└── .kiro/           # Project specifications
```

## Playwright MCP Server (Basic)

A minimal Model Context Protocol server is provided to allow LLM tools to run and verify Playwright UI tests.

- Location: `mcp/playwright-mcp`
- Run locally: `npm run mcp:playwright`
- Tools exposed:
  - `run_playwright_tests`:
    - Inputs: `cwd` (default `frontend`), `testFilter` (grep or file path), `headless` (default true), `reporter` (default `json`)
    - Behavior: Runs `npx playwright test` with JSON reporter and returns a structured summary
  - `list_playwright_tests`:
    - Inputs: `cwd` (default `frontend`)
    - Behavior: Runs `npx playwright test --list` and returns discovered tests

### Frontend E2E Setup

- Config: `frontend/playwright.config.ts` (uses Vite dev server on port 5173)
- Smoke test: `frontend/e2e/smoke.spec.ts`
- Run locally: `cd frontend && npm run e2e`

### AI Interaction Guidance

- Prefer `list_playwright_tests` first to discover available tests and select targets
- Use `run_playwright_tests` with a `testFilter` to run focused tests and parse the JSON `summary` for pass/fail details
- For headful debugging, pass `headless: false` (if environment supports a display)
- If the app server is not running, Playwright will auto-start Vite via the `webServer` setting

Note: Browser binaries are not auto-installed. If needed, run `npx playwright install` inside `frontend`.