/**
 * API Test Suite Index
 * 
 * This file serves as the entry point for all API tests.
 * It ensures proper test isolation and database setup.
 */

// Import all API test suites
import './health.api.test.js';
import './cases.api.test.js';
import './models.api.test.js';
import './evaluation.api.test.js';
import './auth.api.test.js';
import './docs.api.test.js';
import './documentation.test.js';

// Export test utilities for use in other test files
export { setupDatabaseHooks, testDataHelpers, getTestDatabase } from './setup.js';

/**
 * API Test Configuration
 * 
 * This configuration ensures that API tests run with proper isolation
 * and database setup/teardown.
 */
export const apiTestConfig = {
  // Test environment settings
  environment: 'test',
  
  // Database settings
  database: {
    path: 'test_data/test.db',
    resetBetweenTests: true,
    isolateTests: true
  },
  
  // Test timeouts
  timeouts: {
    standard: 5000,    // 5 seconds for standard operations
    ai: 30000,         // 30 seconds for AI operations
    database: 10000    // 10 seconds for database operations
  },
  
  // Test data settings
  testData: {
    cleanup: true,
    seedData: false
  }
};

/**
 * Test Suite Information
 * 
 * This provides metadata about the API test suites for reporting
 * and documentation purposes.
 */
export const testSuites = [
  {
    name: 'Health Endpoints',
    file: 'health.api.test.ts',
    description: 'Tests for system health and version endpoints',
    endpoints: ['/health', '/version'],
    requirements: ['7.3', '7.7']
  },
  {
    name: 'Case Management Endpoints',
    file: 'cases.api.test.ts',
    description: 'Tests for case management API endpoints',
    endpoints: [
      '/api/cases',
      '/api/cases/:id',
      '/api/cases/:id/status',
      '/api/cases/:id/notes',
      '/api/cases/:id/ai-summary',
      '/api/cases/:id/ai-refresh',
      '/api/cases/:id/audit'
    ],
    requirements: ['1.1', '1.2', '1.6', '2.3', '2.4', '4.3']
  },
  {
    name: 'Model Management Endpoints',
    file: 'models.api.test.ts',
    description: 'Tests for AI model management endpoints',
    endpoints: [
      '/api/models',
      '/api/models/current',
      '/api/models/health',
      '/api/models/costs',
      '/api/models/usage'
    ],
    requirements: ['5.1', '5.2', '5.5', '5.6', '5.9']
  },
  {
    name: 'Evaluation Endpoints',
    file: 'evaluation.api.test.ts',
    description: 'Tests for AI evaluation and benchmarking endpoints',
    endpoints: [
      '/api/evaluation/datasets',
      '/api/evaluation/run',
      '/api/evaluation/compare',
      '/api/evaluation/feedback',
      '/api/evaluation/benchmark'
    ],
    requirements: ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9', '6.10']
  },
  {
    name: 'Authentication Endpoints',
    file: 'auth.api.test.ts',
    description: 'Tests for user authentication and authorization endpoints',
    endpoints: [
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/auth/profile'
    ],
    requirements: ['7.1']
  },
  {
    name: 'Documentation Endpoints',
    file: 'docs.api.test.ts',
    description: 'Tests for API documentation and system status endpoints',
    endpoints: [
      '/api/docs',
      '/api/status'
    ],
    requirements: ['7.9', '7.10']
  }
];

/**
 * Get test suite summary
 */
export function getTestSuiteSummary() {
  const totalEndpoints = testSuites.reduce((sum, suite) => sum + suite.endpoints.length, 0);
  const totalRequirements = new Set(testSuites.flatMap(suite => suite.requirements)).size;
  
  return {
    totalSuites: testSuites.length,
    totalEndpoints,
    totalRequirements,
    suites: testSuites
  };
}