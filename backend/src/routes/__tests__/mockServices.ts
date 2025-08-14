import { vi } from 'vitest';
import type { Case, ApplicationData } from '../../types/index.js';
import { CaseStatus, ProcessStep } from '../../types/index.js';

export function createMockServices() {
  const mockApplicationData: ApplicationData = {
    applicantName: 'John Doe',
    applicantEmail: 'john@example.com',
    applicationType: 'standard',
    submissionDate: new Date(),
    documents: [],
    formData: {}
  };

  const mockCase: Case = {
    id: 'test-case-id',
    applicationData: mockApplicationData,
    status: CaseStatus.ACTIVE,
    currentStep: ProcessStep.RECEIVED,
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: [],
    aiSummaries: [],
    auditTrail: []
  };

  const existingCase: Case = {
    id: 'existing-case-id',
    applicationData: {
      applicantName: 'Test User',
      applicantEmail: 'test@example.com',
      applicationType: 'standard',
      submissionDate: new Date(),
      documents: [],
      formData: {}
    },
    status: CaseStatus.ACTIVE,
    currentStep: ProcessStep.RECEIVED,
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: [],
    aiSummaries: [],
    auditTrail: []
  };

  const mockDataService = {
    saveCase: vi.fn(),
    getCaseById: vi.fn(),
    updateCase: vi.fn(),
    deleteCase: vi.fn(),
    getAllCases: vi.fn().mockResolvedValue([]),
    getCasesByStatus: vi.fn().mockResolvedValue([]),
    searchCases: vi.fn().mockResolvedValue([]),
    saveActivityLog: vi.fn(),
    getActivityLog: vi.fn().mockResolvedValue([]),
    saveSummary: vi.fn(),
    getAuditTrail: vi.fn().mockResolvedValue([]),
    logActivity: vi.fn(),
    logAIInteraction: vi.fn(),
    getAIInteractionHistory: vi.fn().mockResolvedValue([])
  };

  const mockAIService = {
    generateOverallSummary: vi.fn(),
    generateStepRecommendation: vi.fn(),
    analyzeApplication: vi.fn(),
    generateFinalSummary: vi.fn(),
    validateCaseCompleteness: vi.fn(),
    detectMissingFields: vi.fn()
  };

  const mockCaseService = {
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
      if (id === 'existing-case-id') {
        return Promise.resolve(existingCase);
      } else if (id === 'non-existent-id') {
        return Promise.resolve(null);
      } else if (id.trim() === '') {
        return Promise.reject(new Error('Invalid case ID'));
      }
      return Promise.resolve(null);
    }),
    getCasesByStatus: vi.fn().mockResolvedValue([]),
    getAllCases: vi.fn().mockResolvedValue({
      cases: [existingCase, mockCase],
      total: 2,
      page: 1,
      limit: 10
    }),

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

  return {
    caseService: mockCaseService,
    dataService: mockDataService,
    aiService: mockAIService
  };
}