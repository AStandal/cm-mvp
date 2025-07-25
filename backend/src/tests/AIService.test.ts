import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService } from '../services/AIService.js';
import { OpenRouterClient } from '../services/OpenRouterClient.js';
import { DataService } from '../services/DataService.js';
import {
  Case,
  ApplicationData,
  ProcessStep,
  CaseStatus,
  ModelResponse
} from '../types/index.js';

// Mock the dependencies
vi.mock('../services/OpenRouterClient.js');
vi.mock('../services/DataService.js');

describe('AIService', () => {
  let aiService: AIService;
  let mockOpenRouterClient: vi.Mocked<OpenRouterClient>;
  let mockDataService: vi.Mocked<DataService>;

  const mockApplicationData: ApplicationData = {
    applicantName: 'John Doe',
    applicantEmail: 'john.doe@example.com',
    applicationType: 'permit',
    submissionDate: new Date('2024-01-15'),
    documents: [
      {
        id: 'doc1',
        filename: 'application.pdf',
        path: '/uploads/application.pdf',
        uploadedAt: new Date('2024-01-15'),
        size: 1024,
        mimeType: 'application/pdf'
      }
    ],
    formData: {
      businessName: 'Test Business',
      address: '123 Main St',
      phone: '555-0123'
    }
  };

  const mockCaseData: Case = {
    id: 'case-123',
    applicationData: mockApplicationData,
    status: CaseStatus.ACTIVE,
    currentStep: ProcessStep.IN_REVIEW,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
    assignedTo: 'user-456',
    notes: [
      {
        id: 'note-1',
        caseId: 'case-123',
        content: 'Initial review completed',
        createdBy: 'user-456',
        createdAt: new Date('2024-01-16')
      }
    ],
    aiSummaries: [
      {
        id: 'summary-1',
        caseId: 'case-123',
        type: 'overall',
        content: 'Application appears complete',
        recommendations: ['Proceed to next step'],
        confidence: 0.8,
        generatedAt: new Date('2024-01-16'),
        version: 1
      }
    ],
    auditTrail: [
      {
        id: 'audit-1',
        caseId: 'case-123',
        action: 'case_created',
        userId: 'system',
        timestamp: new Date('2024-01-15')
      }
    ]
  };

  const mockModelResponse: ModelResponse = {
    content: '{"content": "Test summary", "recommendations": ["Test recommendation"], "confidence": 0.85}',
    model: 'grok-beta',
    tokensUsed: { input: 100, output: 50 },
    responseTime: 1500,
    finishReason: 'stop'
  };

  beforeEach(() => {
    // Create mocked instances
    mockOpenRouterClient = {
      makeRequest: vi.fn(),
      getModels: vi.fn(),
      testConnection: vi.fn(),
      updateConfig: vi.fn(),
      getConfig: vi.fn()
    } as any;

    mockDataService = {
      saveCase: vi.fn(),
      getCase: vi.fn(),
      updateCase: vi.fn(),
      getCasesByStatus: vi.fn(),
      saveSummary: vi.fn(),
      getSummaries: vi.fn(),
      logActivity: vi.fn(),
      logAIInteraction: vi.fn(),
      getAIInteractionHistory: vi.fn(),
      getAuditTrail: vi.fn(),
      addCaseNote: vi.fn(),
      transaction: vi.fn()
    } as any;

    aiService = new AIService(mockOpenRouterClient, mockDataService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateOverallSummary', () => {
    it('should generate overall summary successfully', async () => {
      mockOpenRouterClient.makeRequest.mockResolvedValue(mockModelResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.generateOverallSummary(mockCaseData);

      expect(result).toMatchObject({
        caseId: 'case-123',
        type: 'overall',
        content: 'Test summary',
        recommendations: ['Test recommendation'],
        confidence: 0.85,
        version: 1
      });

      expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.stringContaining('Case ID: case-123'),
        { max_tokens: 1000, temperature: 0.3 }
      );

      expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-123',
          operation: 'generate_summary',
          success: true,
          promptTemplate: 'overall_summary_v1'
        })
      );
    });

    it('should handle AI service errors and log them', async () => {
      const error = new Error('OpenRouter API failed');
      mockOpenRouterClient.makeRequest.mockRejectedValue(error);
      mockDataService.logAIInteraction.mockResolvedValue();

      await expect(aiService.generateOverallSummary(mockCaseData))
        .rejects.toThrow('Failed to generate overall summary: OpenRouter API failed');

      expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-123',
          operation: 'generate_summary',
          success: false,
          error: 'OpenRouter API failed'
        })
      );
    });

    it('should handle malformed JSON response gracefully', async () => {
      const malformedResponse = { ...mockModelResponse, content: 'Invalid JSON response' };
      mockOpenRouterClient.makeRequest.mockResolvedValue(malformedResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.generateOverallSummary(mockCaseData);

      expect(result.content).toBe('Invalid JSON response');
      expect(result.recommendations).toEqual([]);
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('generateStepRecommendation', () => {
    it('should generate step-specific recommendations successfully', async () => {
      const stepResponse = {
        ...mockModelResponse,
        content: '{"recommendations": ["Review documents", "Contact applicant"], "priority": "high", "confidence": 0.9}'
      };
      mockOpenRouterClient.makeRequest.mockResolvedValue(stepResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.generateStepRecommendation(mockCaseData, ProcessStep.IN_REVIEW);

      expect(result).toMatchObject({
        caseId: 'case-123',
        step: ProcessStep.IN_REVIEW,
        recommendations: ['Review documents', 'Contact applicant'],
        priority: 'high',
        confidence: 0.9
      });

      expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.stringContaining('step: in_review'),
        { max_tokens: 800, temperature: 0.4 }
      );

      expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'generate_recommendation',
          stepContext: ProcessStep.IN_REVIEW,
          promptTemplate: 'step_recommendation_v1'
        })
      );
    });

    it('should handle step recommendation errors', async () => {
      const error = new Error('Step recommendation failed');
      mockOpenRouterClient.makeRequest.mockRejectedValue(error);
      mockDataService.logAIInteraction.mockResolvedValue();

      await expect(aiService.generateStepRecommendation(mockCaseData, ProcessStep.IN_REVIEW))
        .rejects.toThrow('Failed to generate step recommendation: Step recommendation failed');
    });
  });

  describe('analyzeApplication', () => {
    it('should analyze application data successfully', async () => {
      const analysisResponse = {
        ...mockModelResponse,
        content: JSON.stringify({
          summary: 'Complete application for permit',
          keyPoints: ['All documents provided', 'Valid contact information'],
          potentialIssues: ['Missing signature'],
          recommendedActions: ['Request signature'],
          priorityLevel: 'medium',
          estimatedProcessingTime: '2-3 business days',
          requiredDocuments: ['Signed application']
        })
      };
      mockOpenRouterClient.makeRequest.mockResolvedValue(analysisResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.analyzeApplication(mockApplicationData);

      expect(result).toMatchObject({
        summary: 'Complete application for permit',
        keyPoints: ['All documents provided', 'Valid contact information'],
        potentialIssues: ['Missing signature'],
        recommendedActions: ['Request signature'],
        priorityLevel: 'medium',
        estimatedProcessingTime: '2-3 business days',
        requiredDocuments: ['Signed application']
      });

      expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.stringContaining('Application Type: permit'),
        { max_tokens: 1200, temperature: 0.2 }
      );

      expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'analyze_application',
          promptTemplate: 'application_analysis_v1'
        })
      );
    });

    it('should handle application analysis errors', async () => {
      const error = new Error('Analysis failed');
      mockOpenRouterClient.makeRequest.mockRejectedValue(error);
      mockDataService.logAIInteraction.mockResolvedValue();

      await expect(aiService.analyzeApplication(mockApplicationData))
        .rejects.toThrow('Failed to analyze application: Analysis failed');
    });
  });

  describe('generateFinalSummary', () => {
    it('should generate final summary successfully', async () => {
      const finalSummaryResponse = {
        ...mockModelResponse,
        content: JSON.stringify({
          overallSummary: 'Case completed successfully',
          keyDecisions: ['Approved application', 'Issued permit'],
          outcomes: ['Permit granted'],
          processHistory: ['Application received', 'Review completed', 'Decision made'],
          recommendedDecision: 'approved',
          supportingRationale: ['All requirements met', 'No issues found']
        })
      };
      mockOpenRouterClient.makeRequest.mockResolvedValue(finalSummaryResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.generateFinalSummary(mockCaseData);

      expect(result).toMatchObject({
        overallSummary: 'Case completed successfully',
        keyDecisions: ['Approved application', 'Issued permit'],
        outcomes: ['Permit granted'],
        processHistory: ['Application received', 'Review completed', 'Decision made'],
        recommendedDecision: 'approved',
        supportingRationale: ['All requirements met', 'No issues found']
      });

      expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.stringContaining('Final Status: active'),
        { max_tokens: 1500, temperature: 0.1 }
      );

      expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'generate_final_summary',
          promptTemplate: 'final_summary_v1'
        })
      );
    });

    it('should handle final summary generation errors', async () => {
      const error = new Error('Final summary failed');
      mockOpenRouterClient.makeRequest.mockRejectedValue(error);
      mockDataService.logAIInteraction.mockResolvedValue();

      await expect(aiService.generateFinalSummary(mockCaseData))
        .rejects.toThrow('Failed to generate final summary: Final summary failed');
    });
  });

  describe('validateCaseCompleteness', () => {
    it('should validate case completeness successfully', async () => {
      const validationResponse = {
        ...mockModelResponse,
        content: JSON.stringify({
          isComplete: true,
          missingSteps: [],
          missingDocuments: [],
          recommendations: ['Case is ready for decision'],
          confidence: 0.95
        })
      };
      mockOpenRouterClient.makeRequest.mockResolvedValue(validationResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.validateCaseCompleteness(mockCaseData);

      expect(result).toMatchObject({
        isComplete: true,
        missingSteps: [],
        missingDocuments: [],
        recommendations: ['Case is ready for decision'],
        confidence: 0.95
      });

      expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.stringContaining('Current Step: in_review'),
        { max_tokens: 800, temperature: 0.2 }
      );

      expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'validate_completeness',
          promptTemplate: 'completeness_validation_v1'
        })
      );
    });

    it('should identify incomplete cases', async () => {
      const incompleteResponse = {
        ...mockModelResponse,
        content: JSON.stringify({
          isComplete: false,
          missingSteps: ['ready_for_decision'],
          missingDocuments: ['final_approval_form'],
          recommendations: ['Obtain final approval form', 'Complete review process'],
          confidence: 0.8
        })
      };
      mockOpenRouterClient.makeRequest.mockResolvedValue(incompleteResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.validateCaseCompleteness(mockCaseData);

      expect(result.isComplete).toBe(false);
      expect(result.missingSteps).toContain('ready_for_decision');
      expect(result.missingDocuments).toContain('final_approval_form');
    });

    it('should handle completeness validation errors', async () => {
      const error = new Error('Validation failed');
      mockOpenRouterClient.makeRequest.mockRejectedValue(error);
      mockDataService.logAIInteraction.mockResolvedValue();

      await expect(aiService.validateCaseCompleteness(mockCaseData))
        .rejects.toThrow('Failed to validate case completeness: Validation failed');
    });
  });

  describe('detectMissingFields', () => {
    it('should detect missing fields successfully', async () => {
      const missingFieldsResponse = {
        ...mockModelResponse,
        content: JSON.stringify({
          missingFields: [
            {
              fieldName: 'taxId',
              fieldType: 'text',
              importance: 'required',
              suggestedAction: 'Request tax identification number from applicant'
            },
            {
              fieldName: 'businessLicense',
              fieldType: 'file',
              importance: 'recommended',
              suggestedAction: 'Upload business license document'
            }
          ],
          completenessScore: 75,
          priorityActions: ['Obtain tax ID', 'Request business license'],
          estimatedCompletionTime: '1-2 hours'
        })
      };
      mockOpenRouterClient.makeRequest.mockResolvedValue(missingFieldsResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.detectMissingFields(mockApplicationData);

      expect(result).toMatchObject({
        missingFields: [
          {
            fieldName: 'taxId',
            fieldType: 'text',
            importance: 'required',
            suggestedAction: 'Request tax identification number from applicant'
          },
          {
            fieldName: 'businessLicense',
            fieldType: 'file',
            importance: 'recommended',
            suggestedAction: 'Upload business license document'
          }
        ],
        completenessScore: 75,
        priorityActions: ['Obtain tax ID', 'Request business license'],
        estimatedCompletionTime: '1-2 hours'
      });

      expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.stringContaining('Application Type: permit'),
        { max_tokens: 1000, temperature: 0.3 }
      );

      expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'detect_missing_fields',
          promptTemplate: 'missing_fields_v1'
        })
      );
    });

    it('should handle complete applications', async () => {
      const completeResponse = {
        ...mockModelResponse,
        content: JSON.stringify({
          missingFields: [],
          completenessScore: 100,
          priorityActions: [],
          estimatedCompletionTime: '0 minutes'
        })
      };
      mockOpenRouterClient.makeRequest.mockResolvedValue(completeResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      const result = await aiService.detectMissingFields(mockApplicationData);

      expect(result.missingFields).toEqual([]);
      expect(result.completenessScore).toBe(100);
      expect(result.priorityActions).toEqual([]);
    });

    it('should handle missing fields detection errors', async () => {
      const error = new Error('Detection failed');
      mockOpenRouterClient.makeRequest.mockRejectedValue(error);
      mockDataService.logAIInteraction.mockResolvedValue();

      await expect(aiService.detectMissingFields(mockApplicationData))
        .rejects.toThrow('Failed to detect missing fields: Detection failed');
    });
  });

  describe('AI interaction logging', () => {
    it('should continue operation even if logging fails', async () => {
      mockOpenRouterClient.makeRequest.mockResolvedValue(mockModelResponse);
      mockDataService.logAIInteraction.mockRejectedValue(new Error('Logging failed'));

      // Should not throw despite logging failure
      const result = await aiService.generateOverallSummary(mockCaseData);

      expect(result).toBeDefined();
      expect(result.caseId).toBe('case-123');
    });

    it('should log all required interaction details', async () => {
      mockOpenRouterClient.makeRequest.mockResolvedValue(mockModelResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      await aiService.generateOverallSummary(mockCaseData);

      expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-123',
          operation: 'generate_summary',
          model: 'grok-beta',
          tokensUsed: 150, // input + output
          success: true,
          promptTemplate: 'overall_summary_v1',
          promptVersion: '1.0'
        })
      );
    });
  });

  describe('prompt building', () => {
    it('should include all relevant case data in prompts', async () => {
      mockOpenRouterClient.makeRequest.mockResolvedValue(mockModelResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      await aiService.generateOverallSummary(mockCaseData);

      const promptCall = mockOpenRouterClient.makeRequest.mock.calls[0];
      const prompt = promptCall[0];

      expect(prompt).toContain('Case ID: case-123');
      expect(prompt).toContain('Status: active');
      expect(prompt).toContain('Current Step: in_review');
      expect(prompt).toContain('Application Type: permit');
      expect(prompt).toContain('Applicant: John Doe');
      expect(prompt).toContain('application.pdf');
    });

    it('should format responses as JSON requests', async () => {
      mockOpenRouterClient.makeRequest.mockResolvedValue(mockModelResponse);
      mockDataService.logAIInteraction.mockResolvedValue();

      await aiService.generateOverallSummary(mockCaseData);

      const promptCall = mockOpenRouterClient.makeRequest.mock.calls[0];
      const prompt = promptCall[0];

      expect(prompt).toContain('Format your response as JSON');
      expect(prompt).toContain('"content":');
      expect(prompt).toContain('"recommendations":');
      expect(prompt).toContain('"confidence":');
    });
  });
});