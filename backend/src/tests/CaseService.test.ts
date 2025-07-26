import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { CaseService } from '../services/CaseService.js';
import { DataService } from '../services/DataService.js';
import { AIService } from '../services/AIService.js';
import { DatabaseManager } from '../database/index.js';
import {
  Case,
  ApplicationData,
  CaseStatus,
  ProcessStep,
  AISummary
} from '../types/index.js';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

describe('CaseService', () => {
  let caseService: CaseService;
  let dataService: DataService;
  let aiService: AIService;
  let dbManager: DatabaseManager;
  let testDbPath: string;

  beforeAll(async () => {
    // Create a unique test database for this test suite
    const testId = `caseservice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    testDbPath = path.join(process.cwd(), 'test_data', `${testId}.db`);

    // Ensure test directory exists
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Set test environment
    process.env.NODE_ENV = 'test';

    // Initialize database for testing with custom path
    const { DatabaseConnection } = await import('../database/connection.js');
    DatabaseConnection.resetInstance();
    DatabaseConnection.getInstance(testDbPath);
    
    dbManager = new DatabaseManager();
    await dbManager.initialize({ dropExisting: true, seedData: false });

    dataService = new DataService();
    
    // Mock AIService for testing
    aiService = {
      generateOverallSummary: vi.fn(),
      generateStepRecommendation: vi.fn(),
      analyzeApplication: vi.fn(),
      generateFinalSummary: vi.fn(),
      validateCaseCompleteness: vi.fn(),
      detectMissingFields: vi.fn()
    } as any;

    caseService = new CaseService(dataService, aiService);
  });

  afterAll(async () => {
    // Clean up test database
    dbManager.close();
    const { DatabaseConnection } = await import('../database/connection.js');
    DatabaseConnection.resetInstance();
    
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (error) {
        console.warn(`Failed to delete test database: ${error}`);
      }
    }
  });

  beforeEach(async () => {
    // Reset database before each test
    await dbManager.initialize({ dropExisting: true, seedData: false });
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('createCase', () => {
    it('should create a new case successfully', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const result = await caseService.createCase(applicationData, 'user123');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.applicationData).toEqual(applicationData);
      expect(result.status).toBe(CaseStatus.ACTIVE);
      expect(result.currentStep).toBe(ProcessStep.RECEIVED);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(aiService.generateOverallSummary).toHaveBeenCalledWith(expect.objectContaining({
        id: result.id,
        applicationData,
        status: CaseStatus.ACTIVE,
        currentStep: ProcessStep.RECEIVED
      }));
    });

    it('should create case even if AI analysis fails', async () => {
      const applicationData = createTestApplicationData();
      
      (aiService.generateOverallSummary as any).mockRejectedValue(new Error('AI service unavailable'));

      const result = await caseService.createCase(applicationData, 'user123');

      expect(result).toBeDefined();
      expect(result.status).toBe(CaseStatus.ACTIVE);
      expect(result.currentStep).toBe(ProcessStep.RECEIVED);
      expect(aiService.generateOverallSummary).toHaveBeenCalled();
    });

    it('should validate required application data fields', async () => {
      const invalidData = createTestApplicationData();
      invalidData.applicantName = '';

      await expect(caseService.createCase(invalidData, 'user123')).rejects.toThrow('Applicant name is required');
    });

    it('should validate email format', async () => {
      const invalidData = createTestApplicationData();
      invalidData.applicantEmail = 'invalid-email';

      await expect(caseService.createCase(invalidData, 'user123')).rejects.toThrow('Invalid email format');
    });

    it('should validate submission date is not in future', async () => {
      const invalidData = createTestApplicationData();
      invalidData.submissionDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      await expect(caseService.createCase(invalidData, 'user123')).rejects.toThrow('Submission date cannot be in the future');
    });

    it('should log case creation activity', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const result = await caseService.createCase(applicationData, 'user123');

      // Verify audit trail was created
      const auditTrail = await dataService.getAuditTrail(result.id);
      
      // Should have at least the case_created entry
      expect(auditTrail.length).toBeGreaterThanOrEqual(1);
      
      const caseCreatedEntry = auditTrail.find(entry => entry.action === 'case_created');
      expect(caseCreatedEntry).toBeDefined();
      expect(caseCreatedEntry!.user_id).toBe('user123');
    });
  });

  describe('updateCaseStatus', () => {
    it('should update case status successfully', async () => {
      // Create a test case first
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Update status
      const updatedCase = await caseService.updateCaseStatus(createdCase.id, CaseStatus.PENDING, 'user456');

      expect(updatedCase.status).toBe(CaseStatus.PENDING);
      expect(updatedCase.currentStep).toBe(ProcessStep.ADDITIONAL_INFO_REQUIRED);
      expect(updatedCase.updatedAt.getTime()).toBeGreaterThan(createdCase.updatedAt.getTime());
    });

    it('should validate status transitions', async () => {
      // Create a test case and set it to ARCHIVED
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');
      
      // First transition to APPROVED
      await caseService.updateCaseStatus(createdCase.id, CaseStatus.APPROVED, 'user123');
      
      // Then to ARCHIVED
      await caseService.updateCaseStatus(createdCase.id, CaseStatus.ARCHIVED, 'user123');

      // Try invalid transition from ARCHIVED
      await expect(
        caseService.updateCaseStatus(createdCase.id, CaseStatus.ACTIVE, 'user123')
      ).rejects.toThrow('Invalid status transition from archived to active');
    });

    it('should regenerate AI summary for significant status changes', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Clear previous calls
      vi.clearAllMocks();
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      // Update to APPROVED (significant change)
      await caseService.updateCaseStatus(createdCase.id, CaseStatus.APPROVED, 'user456');

      expect(aiService.generateOverallSummary).toHaveBeenCalledTimes(1);
    });

    it('should not regenerate AI summary for non-significant status changes', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Clear previous calls
      vi.clearAllMocks();

      // Update to PENDING (non-significant change)
      await caseService.updateCaseStatus(createdCase.id, CaseStatus.PENDING, 'user456');

      expect(aiService.generateOverallSummary).not.toHaveBeenCalled();
    });

    it('should log status update activity', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      await caseService.updateCaseStatus(createdCase.id, CaseStatus.PENDING, 'user456');

      const auditTrail = await dataService.getAuditTrail(createdCase.id);
      const statusUpdateEntry = auditTrail.find(entry => entry.action === 'status_updated');
      
      expect(statusUpdateEntry).toBeDefined();
      expect(statusUpdateEntry!.user_id).toBe('user456');
      expect(JSON.parse(statusUpdateEntry!.details!)).toMatchObject({
        previousStatus: CaseStatus.ACTIVE,
        newStatus: CaseStatus.PENDING,
        previousStep: ProcessStep.RECEIVED,
        newStep: ProcessStep.ADDITIONAL_INFO_REQUIRED
      });
    });

    it('should throw error for non-existent case', async () => {
      await expect(
        caseService.updateCaseStatus('non-existent-id', CaseStatus.APPROVED, 'user123')
      ).rejects.toThrow('Case with ID non-existent-id not found');
    });
  });

  describe('addCaseNote', () => {
    it('should add case note and regenerate AI summary', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Clear previous calls
      vi.clearAllMocks();
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const noteContent = 'This is a test note';
      const updatedCase = await caseService.addCaseNote(createdCase.id, noteContent, 'user456');

      expect(updatedCase.notes).toHaveLength(1);
      expect(updatedCase.notes[0].content).toBe(noteContent);
      expect(updatedCase.notes[0].createdBy).toBe('user456');
      expect(aiService.generateOverallSummary).toHaveBeenCalledWith(expect.objectContaining({
        id: createdCase.id,
        notes: expect.arrayContaining([
          expect.objectContaining({
            content: noteContent,
            createdBy: 'user456'
          })
        ])
      }));
    });

    it('should add note even if AI summary regeneration fails', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Clear previous calls and make AI service fail
      vi.clearAllMocks();
      (aiService.generateOverallSummary as any).mockRejectedValue(new Error('AI service unavailable'));

      const noteContent = 'This is a test note';
      const updatedCase = await caseService.addCaseNote(createdCase.id, noteContent, 'user456');

      expect(updatedCase.notes).toHaveLength(1);
      expect(updatedCase.notes[0].content).toBe(noteContent);
      expect(aiService.generateOverallSummary).toHaveBeenCalled();
    });

    it('should validate note content is not empty', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      await expect(
        caseService.addCaseNote(createdCase.id, '   ', 'user456')
      ).rejects.toThrow('Note content cannot be empty');
    });

    it('should log note addition activity', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      const noteContent = 'This is a test note';
      await caseService.addCaseNote(createdCase.id, noteContent, 'user456');

      const auditTrail = await dataService.getAuditTrail(createdCase.id);
      const noteAddedEntry = auditTrail.find(entry => entry.action === 'note_added');
      
      expect(noteAddedEntry).toBeDefined();
      expect(noteAddedEntry!.user_id).toBe('user456');
      expect(JSON.parse(noteAddedEntry!.details!)).toMatchObject({
        noteLength: noteContent.length,
        addedBy: 'user456'
      });
    });

    it('should log AI summary update activity', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Clear previous calls and ensure mock returns proper summary for note addition
      vi.clearAllMocks();
      const noteAISummary = createTestAISummary(createdCase.id);
      noteAISummary.version = 2; // Increment version for new summary
      (aiService.generateOverallSummary as any).mockResolvedValue(noteAISummary);

      const noteContent = 'This is a test note';
      await caseService.addCaseNote(createdCase.id, noteContent, 'user456');

      const auditTrail = await dataService.getAuditTrail(createdCase.id);
      const aiUpdateEntry = auditTrail.find(entry => entry.action === 'ai_summary_updated');
      
      expect(aiUpdateEntry).toBeDefined();
      expect(aiUpdateEntry!.user_id).toBe('user456');
      expect(JSON.parse(aiUpdateEntry!.details!)).toMatchObject({
        trigger: 'note_added',
        summaryVersion: noteAISummary.version
      });
    });

    it('should throw error for non-existent case', async () => {
      await expect(
        caseService.addCaseNote('non-existent-id', 'Test note', 'user123')
      ).rejects.toThrow('Case with ID non-existent-id not found');
    });
  });

  describe('getCaseById', () => {
    it('should retrieve case by ID', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');
      const retrievedCase = await caseService.getCaseById(createdCase.id);

      expect(retrievedCase).toBeDefined();
      expect(retrievedCase!.id).toBe(createdCase.id);
      expect(retrievedCase!.applicationData).toEqual(applicationData);
    });

    it('should return null for non-existent case', async () => {
      const result = await caseService.getCaseById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getCasesByStatus', () => {
    it('should retrieve cases by status', async () => {
      const applicationData1 = createTestApplicationData();
      const applicationData2 = createTestApplicationData();
      applicationData2.applicantName = 'Jane Doe';
      applicationData2.applicantEmail = 'jane@example.com';
      
      const mockAISummary = createTestAISummary('test-case-id');
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const case1 = await caseService.createCase(applicationData1, 'user123');
      const case2 = await caseService.createCase(applicationData2, 'user123');

      // Update one case to PENDING
      await caseService.updateCaseStatus(case2.id, CaseStatus.PENDING, 'user123');

      const activeCases = await caseService.getCasesByStatus(CaseStatus.ACTIVE);
      const pendingCases = await caseService.getCasesByStatus(CaseStatus.PENDING);

      expect(activeCases).toHaveLength(1);
      expect(activeCases[0].id).toBe(case1.id);
      expect(pendingCases).toHaveLength(1);
      expect(pendingCases[0].id).toBe(case2.id);
    });

    it('should return empty array for status with no cases', async () => {
      const cases = await caseService.getCasesByStatus(CaseStatus.ARCHIVED);
      expect(cases).toHaveLength(0);
    });
  });

  describe('Status Transition Validation', () => {
    it('should allow valid status transitions', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Test valid transitions from ACTIVE
      await expect(caseService.updateCaseStatus(createdCase.id, CaseStatus.PENDING, 'user123')).resolves.toBeDefined();
      await expect(caseService.updateCaseStatus(createdCase.id, CaseStatus.ACTIVE, 'user123')).resolves.toBeDefined();
      await expect(caseService.updateCaseStatus(createdCase.id, CaseStatus.APPROVED, 'user123')).resolves.toBeDefined();
      await expect(caseService.updateCaseStatus(createdCase.id, CaseStatus.ARCHIVED, 'user123')).resolves.toBeDefined();
    });

    it('should reject invalid status transitions', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Set to ARCHIVED
      await caseService.updateCaseStatus(createdCase.id, CaseStatus.APPROVED, 'user123');
      await caseService.updateCaseStatus(createdCase.id, CaseStatus.ARCHIVED, 'user123');

      // Try invalid transition from ARCHIVED
      await expect(
        caseService.updateCaseStatus(createdCase.id, CaseStatus.ACTIVE, 'user123')
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('Process Step Logic', () => {
    it('should set correct process steps for different statuses', async () => {
      const applicationData = createTestApplicationData();
      const mockAISummary = createTestAISummary('test-case-id');
      
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const createdCase = await caseService.createCase(applicationData, 'user123');

      // Test PENDING -> ADDITIONAL_INFO_REQUIRED
      let updatedCase = await caseService.updateCaseStatus(createdCase.id, CaseStatus.PENDING, 'user123');
      expect(updatedCase.currentStep).toBe(ProcessStep.ADDITIONAL_INFO_REQUIRED);

      // Test APPROVED -> CONCLUDED
      updatedCase = await caseService.updateCaseStatus(createdCase.id, CaseStatus.APPROVED, 'user123');
      expect(updatedCase.currentStep).toBe(ProcessStep.CONCLUDED);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      // Test validation error messages - this test runs before database is closed
      const invalidData = createTestApplicationData();
      invalidData.applicantName = '';

      await expect(caseService.createCase(invalidData, 'user123')).rejects.toThrow('Applicant name is required');
    });

    it('should handle database errors gracefully', async () => {
      // Close database connection to simulate error
      dbManager.close();

      const applicationData = createTestApplicationData();

      await expect(caseService.createCase(applicationData, 'user123')).rejects.toThrow('Failed to create case');
    });
  });

  // Helper functions
  function createTestApplicationData(): ApplicationData {
    return {
      applicantName: 'John Doe',
      applicantEmail: 'john.doe@example.com',
      applicationType: 'Standard Application',
      submissionDate: new Date('2024-01-15'),
      documents: [],
      formData: {
        additionalInfo: 'Test application data'
      }
    };
  }

  function createTestAISummary(caseId: string): AISummary {
    return {
      id: randomUUID(),
      caseId,
      type: 'overall',
      content: 'Test AI summary content',
      recommendations: ['Test recommendation 1', 'Test recommendation 2'],
      confidence: 0.85,
      generatedAt: new Date(),
      version: 1
    };
  }
});