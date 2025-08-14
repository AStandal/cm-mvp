# Project Structure

## Root Directory Layout
```
├── backend/          # Express.js API server
├── frontend/         # React application  
├── mcp/              # Model Context Protocol servers
├── data/             # Database files
├── scripts/          # Build and utility scripts
├── .github/          # GitHub Actions workflows
├── .githooks/        # Git hooks for verification
├── .kiro/           # Kiro project specifications and steering
├── node_modules/     # Root workspace dependencies
├── package.json      # Workspace configuration
└── README.md         # Project documentation
```

## Backend Structure (`/backend`)
```
backend/
├── src/              # TypeScript source code
│   ├── database/     # Database connection, schema, migrations
│   ├── middleware/   # Express middleware
│   ├── routes/       # API route handlers
│   ├── services/     # Business logic services
│   ├── tests/        # Test files
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   └── index.ts      # Application entry point
├── dist/             # Compiled JavaScript output
├── data/             # SQLite database files
├── test_data/        # Test data files
├── node_modules/     # Backend dependencies
├── package.json      # Backend configuration
├── tsconfig.json     # TypeScript configuration
├── vitest.config.ts  # Test configuration
├── .env              # Environment variables
└── .env.example      # Environment template
```

## Frontend Structure (`/frontend`)
```
frontend/
├── src/              # React TypeScript source
│   ├── components/   # React components
│   │   ├── case/     # Case-specific components
│   │   ├── layout/   # Layout components
│   │   └── ui/       # Reusable UI components
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Page components
│   ├── services/     # API service functions
│   ├── tests/        # Test files
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Main App component
│   └── main.tsx      # Application entry point
├── e2e/              # End-to-end tests (Playwright)
├── dist/             # Vite build output
├── node_modules/     # Frontend dependencies
├── public/           # Static assets
├── index.html        # HTML entry point
├── package.json      # Frontend configuration
├── vite.config.ts    # Vite configuration
├── tailwind.config.cjs # Tailwind CSS config
├── playwright.config.ts # Playwright test config
├── vitest.config.ts  # Test configuration
├── tsconfig.json     # TypeScript configuration
├── .env              # Environment variables
└── .env.example      # Environment template
```

## TypeScript Path Aliases

### Frontend Aliases
- `@/*` → `./src/*`
- `@/types` → `./src/types`
- `@/components` → `./src/components`
- `@/services` → `./src/services`
- `@/utils` → `./src/utils`
- `@/hooks` → `./src/hooks`
- `@/pages` → `./src/pages`

### Backend Aliases
- `@/*` → `./src/*`
- `@/types` → `./src/types`
- `@/services` → `./src/services`
- `@/utils` → `./src/utils`
- `@/middleware` → `./src/middleware`
- `@/routes` → `./src/routes`
- `@/database` → `./src/database`

## Configuration Files
- **TypeScript**: Strict mode enabled with path mapping
- **ESLint**: Configured for both projects with TypeScript rules
- **Environment**: Separate `.env` files for frontend/backend
- **Testing**: Vitest configuration in both projects
- **Build**: Vite for frontend, tsc for backend

## Development Ports
- **Frontend**: http://localhost:3000 (Vite dev server)
- **Backend**: http://localhost:3001 (Express API server)
- **Playwright E2E**: http://localhost:5173 (Vite test server)
- **API Proxy**: Frontend proxies `/api` requests to backend

## Additional Directories
- **MCP Servers**: `mcp/` - Model Context Protocol servers for AI tool integration
- **Database**: `data/` - SQLite database files
- **Scripts**: `scripts/` - Build and utility scripts