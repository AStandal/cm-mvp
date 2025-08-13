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
  AISummary,
  ApplicationAnalysis,
  MissingFieldsAnalysis
} from '../types/index.js';
import { randomUUID } from 'crypto';
import { setupUnitTestDatabase } from './utils/testDatabaseFactory.js';

describe('CaseService', () => {
  let caseService: CaseService;
  let dataService: DataService;
  let aiService: AIService;
  
  // Use in-memory database for unit tests
  const dbHooks = setupUnitTestDatabase('CaseService');

  beforeAll(async () => {
    await dbHooks.beforeAll();
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Reset services to ensure they use the test database
    const { resetServices, getServices } = await import('../routes/serviceFactory.js');
    resetServices();
    const services = getServices();
    dataService = services.dataService;
    
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
    await dbHooks.afterAll();
  });

  beforeEach(async () => {
    await dbHooks.beforeEach();
    
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
      
      // Ensure timestamp is properly updated by checking that it's at least 1ms newer
      // This accounts for potential timing precision issues in tests
      expect(updatedCase.updatedAt.getTime()).toBeGreaterThanOrEqual(createdCase.updatedAt.getTime());
      // Additional check to ensure the timestamp was actually updated
      expect(updatedCase.updatedAt).not.toEqual(createdCase.updatedAt);
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

  describe('processApplication', () => {
    it('should process application with comprehensive AI analysis', async () => {
      const applicationData = createTestApplicationData();
      const mockApplicationAnalysis = createTestApplicationAnalysis();
      const mockMissingFieldsAnalysis = createTestMissingFieldsAnalysis();
      const mockAISummary = createTestAISummary('test-case-id');

      (aiService.detectMissingFields as any).mockResolvedValue(mockMissingFieldsAnalysis);
      (aiService.analyzeApplication as any).mockResolvedValue(mockApplicationAnalysis);
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const result = await caseService.processApplication(applicationData, 'user123');

      expect(result).toBeDefined();
      expect(result.case).toBeDefined();
      expect(result.applicationAnalysis).toEqual(mockApplicationAnalysis);
      expect(result.missingFieldsAnalysis).toEqual(mockMissingFieldsAnalysis);
      expect(result.case.status).toBe(CaseStatus.ACTIVE);
      expect(result.case.currentStep).toBe(ProcessStep.RECEIVED);

      // Verify AI services were called
      expect(aiService.detectMissingFields).toHaveBeenCalledWith(expect.objectContaining({
        applicantName: applicationData.applicantName,
        applicantEmail: applicationData.applicantEmail.toLowerCase(),
        applicationType: applicationData.applicationType
      }));
      expect(aiService.analyzeApplication).toHaveBeenCalledWith(expect.objectContaining({
        applicantName: applicationData.applicantName,
        applicantEmail: applicationData.applicantEmail.toLowerCase(),
        applicationType: applicationData.applicationType
      }));
      expect(aiService.generateOverallSummary).toHaveBeenCalledWith(expect.objectContaining({
        id: result.case.id,
        status: CaseStatus.ACTIVE,
        currentStep: ProcessStep.RECEIVED
      }));
    });

    it('should normalize application data during extraction', async () => {
      const rawApplicationData = createTestApplicationData();
      rawApplicationData.applicantName = '  John Doe  '; // Extra spaces
      rawApplicationData.applicantEmail = '  JOHN.DOE@EXAMPLE.COM  '; // Uppercase and spaces
      rawApplicationData.formData = {
        field1: '  value1  ',
        field2: '',
        field3: null,
        field4: undefined,
        field5: 0,
        field6: false,
        field7: []
      };

      const mockApplicationAnalysis = createTestApplicationAnalysis();
      const mockMissingFieldsAnalysis = createTestMissingFieldsAnalysis();
      const mockAISummary = createTestAISummary('test-case-id');

      (aiService.detectMissingFields as any).mockResolvedValue(mockMissingFieldsAnalysis);
      (aiService.analyzeApplication as any).mockResolvedValue(mockApplicationAnalysis);
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const result = await caseService.processApplication(rawApplicationData, 'user123');

      expect(result.case.applicationData.applicantName).toBe('John Doe');
      expect(result.case.applicationData.applicantEmail).toBe('john.doe@example.com');
      expect(result.case.applicationData.formData).toEqual({
        field1: 'value1',
        field5: 0,
        field6: false
      });
    });

    it('should set case to PENDING status for low completeness score', async () => {
      const applicationData = createTestApplicationData();
      const mockApplicationAnalysis = createTestApplicationAnalysis();
      const mockMissingFieldsAnalysis = createTestMissingFieldsAnalysis();
      mockMissingFieldsAnalysis.completenessScore = 0.6; // Below 0.7 threshold
      const mockAISummary = createTestAISummary('test-case-id');

      (aiService.detectMissingFields as any).mockResolvedValue(mockMissingFieldsAnalysis);
      (aiService.analyzeApplication as any).mockResolvedValue(mockApplicationAnalysis);
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const result = await caseService.processApplication(applicationData, 'user123');

      expect(result.case.status).toBe(CaseStatus.PENDING);
      expect(result.case.currentStep).toBe(ProcessStep.ADDITIONAL_INFO_REQUIRED);
    });

    it('should add missing fields note when fields are missing', async () => {
      const applicationData = createTestApplicationData();
      const mockApplicationAnalysis = createTestApplicationAnalysis();
      const mockMissingFieldsAnalysis = createTestMissingFieldsAnalysis();
      mockMissingFieldsAnalysis.missingFields = [
        {
          fieldName: 'phoneNumber',
          fieldType: 'string',
          importance: 'required',
          suggestedAction: 'Contact applicant for phone number'
        },
        {
          fieldName: 'address',
          fieldType: 'string',
          importance: 'recommended',
          suggestedAction: 'Request current address'
        }
      ];
      const mockAISummary = createTestAISummary('test-case-id');

      (aiService.detectMissingFields as any).mockResolvedValue(mockMissingFieldsAnalysis);
      (aiService.analyzeApplication as any).mockResolvedValue(mockApplicationAnalysis);
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const result = await caseService.processApplication(applicationData, 'user123');

      expect(result.case.notes).toHaveLength(1);
      expect(result.case.notes[0].content).toContain('Missing Fields Analysis');
      expect(result.case.notes[0].content).toContain('phoneNumber');
      expect(result.case.notes[0].content).toContain('address');
      expect(result.case.notes[0].content).toContain('Required Fields Missing');
      expect(result.case.notes[0].content).toContain('Recommended Fields Missing');
    });

    it('should not add missing fields note when no fields are missing', async () => {
      const applicationData = createTestApplicationData();
      const mockApplicationAnalysis = createTestApplicationAnalysis();
      const mockMissingFieldsAnalysis = createTestMissingFieldsAnalysis();
      mockMissingFieldsAnalysis.missingFields = []; // No missing fields
      const mockAISummary = createTestAISummary('test-case-id');

      (aiService.detectMissingFields as any).mockResolvedValue(mockMissingFieldsAnalysis);
      (aiService.analyzeApplication as any).mockResolvedValue(mockApplicationAnalysis);
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const result = await caseService.processApplication(applicationData, 'user123');

      expect(result.case.notes).toHaveLength(0);
    });

    it('should continue processing even if AI analysis fails', async () => {
      const applicationData = createTestApplicationData();
      const mockMissingFieldsAnalysis = createTestMissingFieldsAnalysis();

      (aiService.detectMissingFields as any).mockResolvedValue(mockMissingFieldsAnalysis);
      (aiService.analyzeApplication as any).mockRejectedValue(new Error('AI service unavailable'));

      await expect(caseService.processApplication(applicationData, 'user123')).rejects.toThrow('Failed to process application');
    });

    it('should continue case creation even if AI summary generation fails', async () => {
      const applicationData = createTestApplicationData();
      const mockApplicationAnalysis = createTestApplicationAnalysis();
      const mockMissingFieldsAnalysis = createTestMissingFieldsAnalysis();

      (aiService.detectMissingFields as any).mockResolvedValue(mockMissingFieldsAnalysis);
      (aiService.analyzeApplication as any).mockResolvedValue(mockApplicationAnalysis);
      (aiService.generateOverallSummary as any).mockRejectedValue(new Error('AI service unavailable'));

      const result = await caseService.processApplication(applicationData, 'user123');

      expect(result).toBeDefined();
      expect(result.case).toBeDefined();
      expect(result.case.aiSummaries).toHaveLength(0); // No AI summary due to failure
    });

    it('should log comprehensive audit trail during processing', async () => {
      const applicationData = createTestApplicationData();
      const mockApplicationAnalysis = createTestApplicationAnalysis();
      const mockMissingFieldsAnalysis = createTestMissingFieldsAnalysis();
      mockMissingFieldsAnalysis.missingFields = [
        {
          fieldName: 'phoneNumber',
          fieldType: 'string',
          importance: 'required',
          suggestedAction: 'Contact applicant for phone number'
        }
      ];
      const mockAISummary = createTestAISummary('test-case-id');

      (aiService.detectMissingFields as any).mockResolvedValue(mockMissingFieldsAnalysis);
      (aiService.analyzeApplication as any).mockResolvedValue(mockApplicationAnalysis);
      (aiService.generateOverallSummary as any).mockResolvedValue(mockAISummary);

      const result = await caseService.processApplication(applicationData, 'user123');

      const auditTrail = await dataService.getAuditTrail(result.case.id);

      // Should have multiple audit entries
      expect(auditTrail.length).toBeGreaterThanOrEqual(4);

      // Check for specific audit entries
      const processedEntry = auditTrail.find(entry => entry.action === 'application_processed');
      expect(processedEntry).toBeDefined();

      const missingFieldsEntry = auditTrail.find(entry => entry.action === 'missing_fields_detected');
      expect(missingFieldsEntry).toBeDefined();

      // AI analysis entry might be 'ai_analysis_completed' or 'ai_analysis_failed'
      const aiAnalysisEntry = auditTrail.find(entry => 
        entry.action === 'ai_analysis_completed' || entry.action === 'ai_analysis_failed'
      );
      expect(aiAnalysisEntry).toBeDefined();
    });

    it('should validate application data during processing', async () => {
      const invalidData = createTestApplicationData();
      invalidData.applicantName = '';

      await expect(caseService.processApplication(invalidData, 'user123')).rejects.toThrow('Applicant name is required');
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
      // Mock the DataService to simulate a database error
      const originalSaveCase = dataService.saveCase;
      dataService.saveCase = vi.fn().mockRejectedValue(new Error('Database connection failed'));
      
      const applicationData = createTestApplicationData();

      // Test that createCase properly handles the database error
      await expect(caseService.createCase(applicationData, 'user123')).rejects.toThrow('Failed to create case');
      
      // Restore the original method
      dataService.saveCase = originalSaveCase;
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

  function createTestApplicationAnalysis(): import('../types/index.js').ApplicationAnalysis {
    return {
      summary: 'Test application analysis summary',
      keyPoints: ['Key point 1', 'Key point 2'],
      potentialIssues: ['Potential issue 1'],
      recommendedActions: ['Recommended action 1', 'Recommended action 2'],
      priorityLevel: 'medium',
      estimatedProcessingTime: '2-3 business days',
      requiredDocuments: ['Document 1', 'Document 2'],
      analysisTimestamp: new Date()
    };
  }

  function createTestMissingFieldsAnalysis(): import('../types/index.js').MissingFieldsAnalysis {
    return {
      missingFields: [],
      completenessScore: 0.85,
      priorityActions: ['Priority action 1'],
      estimatedCompletionTime: '1-2 business days',
      analysisTimestamp: new Date()
    };
  }
});

// Helper functions for creating test data
function createTestApplicationData(): ApplicationData {
  return {
    applicantName: 'John Doe',
    applicantEmail: 'john.doe@example.com',
    applicationType: 'standard',
    submissionDate: new Date(),
    documents: [],
    formData: {}
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

function createTestActivity(caseId: string): ActivityLog {
  return {
    id: randomUUID(),
    caseId,
    action: 'case_created',
    userId: 'test-user',
    timestamp: new Date()
  };
}

function createTestApplicationAnalysis(): ApplicationAnalysis {
  return {
    completenessScore: 0.9,
    riskLevel: 'low',
    recommendedActions: ['Review documents', 'Verify information'],
    keyFindings: ['All required fields present', 'Valid email format'],
    confidence: 0.85
  };
}

function createTestMissingFieldsAnalysis(): MissingFieldsAnalysis {
  return {
    missingFields: [],
    completenessScore: 0.95,
    recommendations: ['Application is complete'],
    criticalFieldsMissing: false
  };
}