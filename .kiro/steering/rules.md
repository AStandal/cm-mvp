# Development Rules and Best Practices

## Code Quality Standards

### TypeS -ipt
- Use strict TypeScript configuration
- Enable all strict type checking options
- Define explicit types for all public APIs
- Use proper type imports (`import type`)
- Avoid `any` type - use proper typing or `unknown`

### Testing Requirements
- Write unit tests for all services and utilities
- Maintain test coverage for critical business logic
- Use descriptive test names that explain the behavior
- Mock external dependencies in unit tests
- Write integration tests for API endpoints
- Include E2E tests for critical user flows

### Code Organization
- Follow the established directory structure
- Use barrel exports (`index.ts`) for clean imports
- Keep components and functions focused and single-purpose
- Use consistent naming conventions (camelCase for variables, PascalCase for components)
- Group related functionality in appropriate directories

## Development Workflow

### Git Practices
- Use descriptive commit messages
- Run verification scripts before committing
- Use feature branches for new development
- Keep commits focused and atomic

### Error Handling
- Use proper error boundaries in React components
- Implement comprehensive error handling in API routes
- Log errors appropriately for debugging
- Return meaningful error messages to clients
- Use Zod for input validation and error reporting

### Performance Considerations
- Use React Query for efficient data fetching
- Implement proper loading states
- Optimize database queries
- Use appropriate HTTP status codes
- Implement proper caching strategies

## Security Guidelines

### API Security
- Use Helmet for security headers
- Implement proper CORS configuration
- Validate all inputs with Zod schemas
- Sanitize database queries
- Use environment variables for sensitive configuration

### Frontend Security
- Sanitize user inputs
- Use proper authentication patterns
- Implement CSP headers where appropriate
- Avoid storing sensitive data in localStorage

## AI Integration Standards

### OpenRouter API Usage
- Use proper error handling for AI API calls
- Implement retry logic for transient failures
- Use appropriate timeouts
- Log AI interactions for debugging
- Handle rate limiting gracefully

### Prompt Engineering
- Use structured prompts with clear instructions
- Implement prompt templates for consistency
- Validate AI responses before processing
- Handle edge cases in AI responses

## Database Standards

### SQLite Best Practices
- Use prepared statements for all queries
- Implement proper transaction handling
- Use migrations for schema changes
- Implement proper indexing for performance
- Use foreign key constraints where appropriate

### Data Validation
- Validate data at the API boundary
- Use Zod schemas for consistent validation
- Implement proper error messages for validation failures
- Handle database constraint violations gracefully