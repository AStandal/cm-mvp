# API Testing Framework

This directory contains the comprehensive API testing framework for the AI Case Management System backend.

## Overview

The API testing framework provides:

- **Dedicated API test suite** with supertest for all endpoints
- **Test database setup and teardown** for isolated API testing
- **Integration with npm run verify workflow** with proper test isolation
- **API documentation tests** to ensure endpoint documentation accuracy

## Test Structure

```
src/tests/api/
├── setup.ts                 # Test database setup and utilities
├── index.ts                 # Test suite configuration and metadata
├── health.api.test.ts       # Health and version endpoint tests
├── cases.api.test.ts        # Case management endpoint tests
├── models.api.test.ts       # Model management endpoint tests
├── evaluation.api.test.ts   # Evaluation and benchmarking endpoint tests
├── auth.api.test.ts         # Authentication endpoint tests
├── docs.api.test.ts         # Documentation endpoint tests
├── documentation.test.ts    # API documentation accuracy tests
└── README.md               # This file
```

## Running Tests

### Run all API tests
```bash
npm run test:api
```

### Run API tests in watch mode
```bash
npm run test:api:watch
```

### Run unit tests only (excluding API tests)
```bash
npm run test:unit
```

### Run full verification suite (includes API tests)
```bash
npm run verify
```

## Test Database

The API testing framework uses a separate test database to ensure isolation:

- **Database Path**: `test_data/test.db`
- **Automatic Setup**: Database is created and initialized before each test suite
- **Automatic Cleanup**: Database is removed after each test suite
- **Data Isolation**: Test data is cleared between individual tests

### Test Database Utilities

The `setup.ts` file provides utilities for:

- `setupTestDatabase()` - Initialize test database
- `cleanupTestDatabase()` - Remove test database
- `clearTestData()` - Clear all data between tests
- `getTestDatabase()` - Get database instance
- `setupDatabaseHooks()` - Vitest hooks for database testing
- `testDataHelpers` - Helper functions for creating test data

## Test Categories

### 1. Health Endpoints (`health.api.test.ts`)
Tests for system health and version endpoints:
- `/health` - System health check
- `/version` - API version information

**Requirements Covered**: 7.3, 7.7

### 2. Case Management Endpoints (`cases.api.test.ts`)
Tests for case management API endpoints (covers both core and advanced functionality):

**Core Endpoints (Task 5.3):**
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get case details

**Advanced Endpoints (Task 5.6):**
- `PUT /api/cases/:id/status` - Update case status
- `POST /api/cases/:id/notes` - Add case note
- `GET /api/cases/:id/ai-summary` - Get AI summary
- `POST /api/cases/:id/ai-refresh` - Regenerate AI insights
- `GET /api/cases/:id/audit` - Get audit trail
- `GET /api/cases` - List cases with pagination and filtering
- `POST /api/cases/:id/documents` - Upload case documents

**Requirements Covered**: 1.1, 1.2 (core), 1.6, 2.3, 2.4, 4.3, 4.6 (advanced)

### 3. AI Service Endpoints (`ai.api.test.ts`)
Tests for AI service API endpoints:
- `POST /api/ai/analyze-application` - Analyze application data with AI
- `POST /api/ai/validate-completeness` - Validate case completeness
- `POST /api/ai/detect-missing-fields` - Detect missing application fields
- `POST /api/ai/step-recommendations` - Get step-specific AI recommendations
- `POST /api/ai/generate-final-summary` - Generate final case summary

**Requirements Covered**: 1.3, 1.4, 1.5, 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 4.2, 5.4

### 4. Model Management Endpoints (`models.api.test.ts`)
Tests for AI model management endpoints:
- `GET /api/models` - Get available models
- `GET /api/models/current` - Get current model configuration
- `PUT /api/models/current` - Set current model
- `GET /api/models/health` - Get model health status
- `GET /api/models/costs` - Get model cost information
- `POST /api/models/test` - Test model connection
- `GET /api/models/usage` - Get usage analytics

**Requirements Covered**: 5.1, 5.2, 5.5, 5.6, 5.9

### 5. Evaluation Endpoints (`evaluation.api.test.ts`)
Tests for AI evaluation and benchmarking endpoints:
- `POST /api/evaluation/datasets` - Create evaluation dataset
- `POST /api/evaluation/datasets/:id/examples` - Add evaluation example
- `POST /api/evaluation/run` - Run model evaluation
- `GET /api/evaluation/runs/:id` - Get evaluation results
- `POST /api/evaluation/compare` - Compare multiple models
- `POST /api/evaluation/feedback` - Record user feedback
- `GET /api/evaluation/prompts/:id/performance` - Get prompt performance
- `POST /api/evaluation/ab-test` - Start A/B test
- `GET /api/evaluation/ab-test/:id` - Get A/B test results
- `GET /api/evaluation/benchmark` - Generate benchmark report

**Requirements Covered**: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10

### 6. Authentication Endpoints (`auth.api.test.ts`)
Tests for user authentication and authorization endpoints:
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh authentication token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

**Requirements Covered**: 7.1

### 7. Documentation Endpoints (`docs.api.test.ts`)
Tests for API documentation and system status endpoints:
- `GET /api/docs` - API documentation
- `GET /api/status` - System status and metrics

**Requirements Covered**: 7.9, 7.10

### 8. Documentation Accuracy Tests (`documentation.test.ts`)
Comprehensive tests to ensure API documentation accuracy:
- Endpoint documentation coverage
- HTTP method documentation
- Request/response schema validation
- Authentication requirements
- Error response formats
- Rate limiting behavior
- Pagination parameters
- Content-type support
- API versioning

## Test Features

### Security Testing
All API tests include:
- CORS header validation
- Security header verification (Helmet.js)
- Content-type validation
- Input sanitization testing
- Authentication header handling

### Performance Testing
- Response time validation (< 5 seconds for standard operations)
- Concurrent request handling
- Large payload handling
- Timeout behavior testing

### Error Handling Testing
- Malformed JSON handling
- Invalid request parameters
- Missing required fields
- HTTP status code validation
- Consistent error response format

### Documentation Validation
- Endpoint availability verification
- Request/response schema validation
- HTTP method support verification
- Authentication requirement documentation
- Error response documentation

## Configuration

### Test Timeouts
- Standard operations: 5 seconds
- AI operations: 30 seconds
- Database operations: 10 seconds

### Test Environment
- `NODE_ENV=test`
- `DATABASE_PATH=test_data/test.db`
- Test isolation enabled
- Verbose reporting

## Integration with Verify Workflow

The API tests are integrated into the `npm run verify` workflow:

1. **Build** - TypeScript compilation
2. **Lint** - ESLint validation
3. **Unit Tests** - Run unit tests (excluding API tests)
4. **API Tests** - Run comprehensive API test suite
5. **Security** - npm audit security check

## Future Enhancements

When API endpoints are implemented, the tests will automatically validate:
- Actual endpoint functionality
- Request/response data validation
- Authentication and authorization
- Rate limiting enforcement
- Database integration
- AI service integration
- Error handling implementation

## Troubleshooting

### Database Issues
If you encounter database-related test failures:
```bash
# Clean up test database manually
rm -f test_data/test.db

# Run tests again
npm run test:api
```

### Port Conflicts
If tests fail due to port conflicts:
- Ensure no other services are running on port 3001
- Check that the Express server is not running in development mode

### Test Isolation Issues
If tests interfere with each other:
- Verify that `setupDatabaseHooks()` is called in test files that need database access
- Check that test data is properly cleaned between tests
- Ensure tests don't modify global state

## Contributing

When adding new API endpoints:

1. Create corresponding test files in this directory
2. Follow the existing test structure and naming conventions
3. Include comprehensive test coverage for all HTTP methods
4. Add security, performance, and error handling tests
5. Update the test suite metadata in `index.ts`
6. Document the new tests in this README