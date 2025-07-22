# Project Structure

## Root Directory Layout
```
├── backend/          # Express.js API server
├── frontend/         # React application  
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
├── dist/             # Compiled JavaScript output
├── node_modules/     # Backend dependencies
├── package.json      # Backend configuration
├── tsconfig.json     # TypeScript configuration
├── .env              # Environment variables
└── .env.example      # Environment template
```

## Frontend Structure (`/frontend`)
```
frontend/
├── src/              # React TypeScript source
├── dist/             # Vite build output
├── node_modules/     # Frontend dependencies
├── public/           # Static assets
├── index.html        # HTML entry point
├── package.json      # Frontend configuration
├── vite.config.ts    # Vite configuration
├── tailwind.config.js # Tailwind CSS config
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

### Backend Aliases
- `@/*` → `./src/*`
- `@/types` → `./src/types`
- `@/services` → `./src/services`
- `@/utils` → `./src/utils`
- `@/middleware` → `./src/middleware`
- `@/routes` → `./src/routes`

## Configuration Files
- **TypeScript**: Strict mode enabled with path mapping
- **ESLint**: Configured for both projects with TypeScript rules
- **Environment**: Separate `.env` files for frontend/backend
- **Testing**: Vitest configuration in both projects
- **Build**: Vite for frontend, tsc for backend

## Development Ports
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **API Proxy**: Frontend proxies `/api` requests to backend