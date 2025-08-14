# Development Rules and Best Practices

## Code Verification
- **MANDATORY**: Before marking any task as complete, run `npm run verify` to ensure all code changes pass the full verification suite
- The verification suite includes:
  - TypeScript type checking for both frontend and backend
  - ESLint linting for code quality
  - Unit tests with Vitest
  - End-to-end tests with Playwright
  - Build verification for both projects
- If verification fails, fix all issues before considering the task complete
- This ensures code quality and prevents regressions in the codebase