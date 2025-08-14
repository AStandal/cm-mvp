# Technology Stack

## Architecture
- **Monorepo**: Workspace-based project with frontend and backend
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + TypeScript + Node.js
- **Database**: SQLite3
- **AI Integration**: OpenRouter API (multiple AI providers)
- **Styling**: Tailwind CSS
- **Testing**: Vitest for both frontend and backend
- **Build System**: TypeScript compiler + Vite

## Key Dependencies

### Frontend
- React 19 with TypeScript
- Vite for build tooling and dev server
- TanStack React Query for data fetching
- React Router DOM for routing
- Tailwind CSS v4 for styling
- Axios for HTTP requests
- Playwright for end-to-end testing

### Backend
- Express.js 5 for API server
- TypeScript with strict configuration
- Better-SQLite3 for database
- OpenAI SDK for AI integration
- Axios for HTTP requests
- Zod for schema validation
- Helmet for security headers
- CORS for cross-origin requests
- UUID for unique identifiers

## Development Commands

### Root Level (runs both projects)
```bash
npm run install:all    # Install all dependencies
npm run dev:backend    # Start backend dev server
npm run dev:frontend   # Start frontend dev server
npm run build:all      # Build both projects
npm run test:all       # Run all tests
npm run lint:all       # Lint both projects
npm run verify         # Full verification suite
npm run typecheck:all  # Type checking for both projects
```

### Individual Projects
```bash
# Backend (port 3002)
cd backend && npm run dev     # Development with auto-reload
cd backend && npm run build   # TypeScript compilation
cd backend && npm test        # Run tests
cd backend && npm run verify  # Full verification suite

# Frontend (port 3000)
cd frontend && npm run dev    # Vite dev server with HMR
cd frontend && npm run build  # Production build
cd frontend && npm test       # Run tests
cd frontend && npm run e2e    # End-to-end tests
cd frontend && npm run verify # Full verification suite
```

## Environment Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- Environment files: `.env` (copy from `.env.example`)

## Testing Framework
- **Unit Tests**: Vitest for both frontend and backend
- **E2E Tests**: Playwright for frontend integration testing
- **API Tests**: Supertest for backend API testing
- **Type Checking**: TypeScript compiler with strict mode

## MCP Integration
- **Playwright MCP Server**: Located in `mcp/playwright-mcp`
- **Purpose**: Allows AI tools to run and verify Playwright tests
- **Commands**: 
  - `npm run mcp:playwright` - Run MCP server locally
  - `npm run mcp:test` - Test MCP functionality

## Database
- **Type**: SQLite3 with Better-SQLite3 driver
- **Location**: `data/case_management.db`
- **Features**: Migrations, seeding, schema management
- **Services**: Dedicated DataService for database operations