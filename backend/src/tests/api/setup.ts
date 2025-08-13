import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupAPITestDatabase } from '../utils/testDatabaseFactory.js';
import { resetServices } from '@/routes/serviceFactory.js';

// Use real services with test database instead of mocks
let dbHooks: ReturnType<typeof setupAPITestDatabase>;

/**
 * Vitest setup hooks for API testing with real database
 * Use these in test files that need database access
 */
export function setupDatabaseHooks() {
  dbHooks = setupAPITestDatabase('APITests');

  beforeAll(async () => {
    // Set test environment first
    process.env.NODE_ENV = 'test';
    
    // Setup test database
    await dbHooks.beforeAll();
    
    // Reset services to ensure they use the test database
    resetServices();
  });

  afterAll(async () => {
    await dbHooks.afterAll();
  });

  beforeEach(async () => {
    await dbHooks.beforeEach();
  });
}

/**
 * Create test data helpers for API tests
 */
export const testDataHelpers = {
  /**
   * Create a test case using the real CaseService
   */
  createTestCase: async (overrides: Partial<any> = {}) => {
    const { getServices } = await import('@/routes/serviceFactory.js');
    const { caseService } = getServices();
    
    const defaultApplicationData = {
      applicantName: 'Test Applicant',
      applicantEmail: 'test@example.com',
      applicationType: 'standard',
      submissionDate: new Date().toISOString(),
      documents: [],
      formData: {},
      ...overrides
    };

    return await caseService.createCaseWithoutAI(defaultApplicationData, 'test-user');
  },

  /**
   * Create multiple test cases
   */
  createMultipleTestCases: async (count: number = 3) => {
    const cases = [];
    for (let i = 0; i < count; i++) {
      const testCase = await testDataHelpers.createTestCase({
        applicantName: `Test Applicant ${i + 1}`,
        applicantEmail: `test${i + 1}@example.com`,
        applicationType: i % 2 === 0 ? 'standard' : 'priority'
      });
      cases.push(testCase);
    }
    return cases;
  }
};