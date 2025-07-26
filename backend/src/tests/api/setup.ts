import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from '@/database/init.js';

// Global comprehensive mock for all API tests to prevent conflicts between test suites
vi.mock('../../routes/serviceFactory.js', () => {
  const mockCase = {
    id: 'test-case-123',
    applicationData: {
      applicantName: 'John Doe',
      applicantEmail: 'john@example.com',
      applicationType: 'standard',
      submissionDate: new Date(),
      documents: [],
      formData: {}
    },
    status: 'active',
    currentStep: 'received',
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: [],
    aiSummaries: [],
    auditTrail: []
  };

  const existingCase = {
    id: 'test-case-123',
    applicationData: {
      applicantName: 'Jane Smith',
      applicantEmail: 'jane@example.com',
      applicationType: 'priority',
      submissionDate: new Date(),
      documents: [],
      formData: { priority: 'high' }
    },
    status: 'active',
    currentStep: 'received',
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: [],
    aiSummaries: [],
    auditTrail: []
  };

  // Comprehensive mock that satisfies all test scenarios
  const mockCaseService = {
    // Main async methods - used by cases.api.test.ts
    createCaseWithoutAI: vi.fn().mockResolvedValue(mockCase),
    createCase: vi.fn().mockResolvedValue(mockCase),
    processApplication: vi.fn().mockResolvedValue({
      case: mockCase,
      applicationAnalysis: { priorityLevel: 'medium', recommendedAction: 'review' },
      missingFieldsAnalysis: { missingFields: [], completenessScore: 0.9 }
    }),
    updateCaseStatus: vi.fn().mockResolvedValue(mockCase),
    addCaseNote: vi.fn().mockResolvedValue(mockCase),
    getCaseById: vi.fn().mockImplementation((id: string) => {
      if (id === 'test-case-123' || id === 'existing-case-id') {
        return Promise.resolve(existingCase);
      }
      return Promise.resolve(null);
    }),
    getCasesByStatus: vi.fn().mockResolvedValue([]),
    
    // Additional methods that might be called by other services
    updateCase: vi.fn().mockResolvedValue(existingCase),
    deleteCase: vi.fn().mockResolvedValue(true),
    getAllCases: vi.fn().mockResolvedValue([]),
    searchCases: vi.fn().mockResolvedValue([]),
    processCaseWithAI: vi.fn().mockResolvedValue(mockCase),
    addNote: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(existingCase),
    generateAISummary: vi.fn().mockResolvedValue('AI Summary'),
    regenerateAISummary: vi.fn().mockResolvedValue('Updated AI Summary'),
    getCaseHistory: vi.fn().mockResolvedValue([]),
    getAuditTrail: vi.fn().mockResolvedValue([]),
    validateCaseData: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
    exportCase: vi.fn().mockResolvedValue({}),
    duplicateCase: vi.fn().mockResolvedValue(mockCase),
    archiveCase: vi.fn().mockResolvedValue(true),
    restoreCase: vi.fn().mockResolvedValue(true),
    bulkUpdateCases: vi.fn().mockResolvedValue([]),
    
    // Private/utility methods that might be called
    validateApplicationData: vi.fn(),
    extractApplicationData: vi.fn().mockReturnValue({}),
    validateStatusTransition: vi.fn(),
    determineProcessStep: vi.fn().mockReturnValue('received'),
    shouldRegenerateAISummary: vi.fn().mockReturnValue(false),
    normalizeFormData: vi.fn().mockReturnValue({}),
    generateMissingFieldsNote: vi.fn().mockReturnValue(''),
    isValidEmail: vi.fn().mockReturnValue(true),
    logActivity: vi.fn().mockResolvedValue(undefined)
  };

  const mockDataService = {
    saveCase: vi.fn().mockResolvedValue(undefined),
    getCaseById: vi.fn().mockImplementation((id: string) => {
      if (id === 'test-case-123' || id === 'existing-case-id') {
        return Promise.resolve(existingCase);
      }
      return Promise.resolve(null);
    }),
    updateCase: vi.fn().mockResolvedValue(undefined),
    deleteCase: vi.fn().mockResolvedValue(undefined),
    getAllCases: vi.fn().mockResolvedValue([]),
    getCasesByStatus: vi.fn().mockResolvedValue([]),
    searchCases: vi.fn().mockResolvedValue([]),
    saveActivityLog: vi.fn().mockResolvedValue(undefined),
    getActivityLog: vi.fn().mockResolvedValue([])
  };

  const mockAIService = {
    generateOverallSummary: vi.fn().mockResolvedValue({}),
    generateStepRecommendation: vi.fn().mockResolvedValue({}),
    analyzeApplication: vi.fn().mockResolvedValue({}),
    generateFinalSummary: vi.fn().mockResolvedValue({}),
    validateCaseCompleteness: vi.fn().mockResolvedValue({}),
    detectMissingFields: vi.fn().mockResolvedValue({}),
    generateSummary: vi.fn().mockResolvedValue('Mock summary'),
    validateCompleteness: vi.fn().mockResolvedValue({ complete: true, missing: [] }),
    recommendNextSteps: vi.fn().mockResolvedValue([])
  };

  return {
    createServices: vi.fn().mockReturnValue({
      caseService: mockCaseService,
      dataService: mockDataService,
      aiService: mockAIService
    }),
    getServices: vi.fn().mockReturnValue({
      caseService: mockCaseService,
      dataService: mockDataService,
      aiService: mockAIService
    }),
    setServices: vi.fn(),
    resetServices: vi.fn()
  };
});

// Test database configuration
const TEST_DB_PATH = path.join(process.cwd(), 'test_data', 'test.db');
const TEST_DB_DIR = path.dirname(TEST_DB_PATH);

let testDb: Database.Database | null = null;

/**
 * Setup test database for API testing
 * Creates a fresh database for each test suite
 */
export async function setupTestDatabase(): Promise<Database.Database> {
  // Ensure test data directory exists
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  }

  // Remove existing test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Create new test database
  testDb = new Database(TEST_DB_PATH);
  
  // For now, just create a simple test database without full initialization
  // This will be enhanced when the database layer is fully implemented
  try {
    // Initialize database schema if available
    await initializeDatabase();
  } catch {
    console.log('🧪 Database initialization skipped for API tests (expected during development)');
    // Create minimal test tables for API testing if needed
    // This is optional and tests will work without it
  }
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = TEST_DB_PATH;
  
  return testDb;
}

/**
 * Cleanup test database
 * Removes test database file and closes connection
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
  
  // Remove test database file
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

/**
 * Clear all data from test database tables
 * Useful for cleaning between individual tests
 */
export async function clearTestData(): Promise<void> {
  if (!testDb) {
    return; // No database to clear, skip silently
  }

  // Clear tables in correct order to respect foreign key constraints
  const tables = [
    'user_feedback',
    'evaluation_results', 
    'evaluation_examples',
    'evaluation_datasets',
    'evaluation_runs',
    'ab_tests',
    'ai_interactions',
    'case_notes',
    'ai_summaries',
    'audit_trail',
    'cases'
  ];

  for (const table of tables) {
    try {
      testDb.prepare(`DELETE FROM ${table}`).run();
    } catch {
      // Table might not exist yet, ignore error silently
      // This is expected during development when database schema is not fully implemented
    }
  }
}

/**
 * Get test database instance
 */
export function getTestDatabase(): Database.Database {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

/**
 * Vitest setup hooks for database testing
 * Use these in test files that need database access
 */
export function setupDatabaseHooks() {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
  });
}

/**
 * Create test data helpers
 */
export const testDataHelpers = {
  /**
   * Create a test case with minimal required data
   */
  createTestCase: (overrides: Partial<any> = {}) => {
    const defaultCase = {
      id: `test-case-${Date.now()}`,
      application_data: JSON.stringify({
        applicantName: 'Test Applicant',
        applicantEmail: 'test@example.com',
        applicationType: 'standard',
        submissionDate: new Date().toISOString(),
        documents: [],
        formData: {}
      }),
      status: 'active',
      current_step: 'received',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_to: null,
      ...overrides
    };

    if (testDb) {
      const stmt = testDb.prepare(`
        INSERT INTO cases (id, application_data, status, current_step, created_at, updated_at, assigned_to)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        defaultCase.id,
        defaultCase.application_data,
        defaultCase.status,
        defaultCase.current_step,
        defaultCase.created_at,
        defaultCase.updated_at,
        defaultCase.assigned_to
      );
    }

    return defaultCase;
  },

  /**
   * Create a test AI summary
   */
  createTestAISummary: (caseId: string, overrides: Partial<any> = {}) => {
    const defaultSummary = {
      id: `test-summary-${Date.now()}`,
      case_id: caseId,
      type: 'overall',
      step: null,
      content: 'Test AI summary content',
      recommendations: JSON.stringify(['Test recommendation 1', 'Test recommendation 2']),
      confidence: 0.85,
      generated_at: new Date().toISOString(),
      version: 1,
      ...overrides
    };

    if (testDb) {
      const stmt = testDb.prepare(`
        INSERT INTO ai_summaries (id, case_id, type, step, content, recommendations, confidence, generated_at, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        defaultSummary.id,
        defaultSummary.case_id,
        defaultSummary.type,
        defaultSummary.step,
        defaultSummary.content,
        defaultSummary.recommendations,
        defaultSummary.confidence,
        defaultSummary.generated_at,
        defaultSummary.version
      );
    }

    return defaultSummary;
  },

  /**
   * Create a test case note
   */
  createTestCaseNote: (caseId: string, overrides: Partial<any> = {}) => {
    const defaultNote = {
      id: `test-note-${Date.now()}`,
      case_id: caseId,
      content: 'Test case note content',
      created_by: 'test-user',
      created_at: new Date().toISOString(),
      ...overrides
    };

    if (testDb) {
      const stmt = testDb.prepare(`
        INSERT INTO case_notes (id, case_id, content, created_by, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        defaultNote.id,
        defaultNote.case_id,
        defaultNote.content,
        defaultNote.created_by,
        defaultNote.created_at
      );
    }

    return defaultNote;
  }
};