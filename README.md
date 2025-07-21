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

The backend server will start on `http://localhost:3001`

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