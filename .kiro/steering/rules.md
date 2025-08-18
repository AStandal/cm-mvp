# Development Rules and Best Practices

## Code Verification
- Before marking any task as complete, run `npm run verify` to ensure all code changes pass the full verification suite
- The verification suite includes:
  - TypeScript type checking for both frontend and backend
  - ESLint linting for code quality
  - Unit tests with Vitest
  - End-to-end tests with Playwright
  - Build verification for both projects
- If verification fails, fix all issues before considering the task complete.
- This ensures code quality and prevents regressions in the codebase

- When asked to review the current implementation of a task, use git status and git diff to view the current changes.

- If the implementation of a new task introduces regression in the verification/testsuite the those regressions must be fixed. 
- When implementing a new API, remember to update existing API tests to reflect the newly implemented API.
- If you create a new test during task development, then that test must pass test execution before you can finish the task.
- When creating tests (either unit, API, or E2E tests) make sure you follow the same patterns and test scope strategy as existing tests for your test category (unit, API, or E2E).
- When creating new design specs, always make sure the new design aligns with the other existing spec designs and current implementation.