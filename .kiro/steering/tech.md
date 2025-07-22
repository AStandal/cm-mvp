# Technology Stack

## Architecture
- **Monorepo**: Workspace-based project with frontend and backend
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + TypeScript + Node.js
- **Database**: SQLite3
- **AI Integration**: Grok API (X.AI)
- **Styling**: Tailwind CSS
- **Testing**: Vitest for both frontend and backend
- **Build System**: TypeScript compiler + Vite

## Key Dependencies

### Frontend
- React 19 with TypeScript
- Vite for build tooling and dev server
- TanStack React Query for data fetching
- React Router DOM for routing
- Tailwind CSS for styling
- Axios for HTTP requests

### Backend
- Express.js 5 for API server
- TypeScript with strict configuration
- SQLite3 for database
- Axios for Grok API integration
- Zod for schema validation
- Helmet for security headers
- CORS for cross-origin requests

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
```

### Individual Projects
```bash
# Backend (port 3001)
cd backend && npm run dev     # Development with auto-reload
cd backend && npm run build   # TypeScript compilation
cd backend && npm test        # Run tests

# Frontend (port 3000)
cd frontend && npm run dev    # Vite dev server with HMR
cd frontend && npm run build  # Production build
cd frontend && npm test       # Run tests
```

## Environment Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- Environment files: `.env` (copy from `.env.example`)