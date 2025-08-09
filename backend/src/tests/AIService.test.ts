import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService } from '../services/AIService.js';
import { OpenRouterClient } from '../services/OpenRouterClient.js';
import { DataService } from '../services/DataService.js';
import { PromptTemplateService } from '../services/PromptTemplateService.js';
import {
    Case,
    ApplicationData,
    ProcessStep,
    CaseStatus,
    ModelResponse,
    CaseDocument,
    CaseNote,
    AuditEntry,
    AISummary
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

            // In test mode, the service should provide fallback data instead of throwing errors
            const result = await aiService.generateOverallSummary(mockCaseData);

            expect(result).toMatchObject({
                caseId: 'case-123',
                type: 'overall',
                content: expect.stringContaining('development fallback'),
                recommendations: expect.any(Array),
                confidence: expect.any(Number),
                version: 1
            });

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
            const malformedResponse = {
                ...mockModelResponse,
                content: 'Invalid JSON content'
            };
            mockOpenRouterClient.makeRequest.mockResolvedValue(malformedResponse);
            mockDataService.logAIInteraction.mockResolvedValue();

            // In test mode, the service should provide fallback data instead of throwing errors
            const result = await aiService.generateOverallSummary(mockCaseData);

            expect(result).toMatchObject({
                caseId: 'case-123',
                type: 'overall',
                content: expect.stringContaining('development fallback'),
                recommendations: expect.any(Array),
                confidence: expect.any(Number),
                version: 1
            });

            expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: 'generate_summary',
                    success: false,
                    error: expect.stringContaining('Invalid AI response format')
                })
            );
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

            // In test mode, the service should provide fallback data instead of throwing errors
            const result = await aiService.generateStepRecommendation(mockCaseData, ProcessStep.IN_REVIEW);

            expect(result).toMatchObject({
                caseId: 'case-123',
                step: 'in_review',
                recommendations: expect.any(Array),
                priority: expect.stringMatching(/low|medium|high/),
                confidence: expect.any(Number)
            });

            expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: 'generate_recommendation',
                    success: false,
                    error: 'Step recommendation failed'
                })
            );
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

            // In test mode, the service should provide fallback data instead of throwing errors
            const result = await aiService.analyzeApplication(mockApplicationData);

            expect(result).toMatchObject({
                summary: expect.stringContaining('Development fallback analysis'),
                keyPoints: expect.any(Array),
                potentialIssues: expect.any(Array),
                recommendedActions: expect.any(Array),
                priorityLevel: expect.stringMatching(/low|medium|high|urgent/),
                estimatedProcessingTime: expect.any(String),
                requiredDocuments: expect.any(Array)
            });

            expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: 'analyze_application',
                    success: false,
                    error: 'Analysis failed'
                })
            );
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

            // In test mode, the service should provide fallback data instead of throwing errors
            const result = await aiService.generateFinalSummary(mockCaseData);

            expect(result).toMatchObject({
                overallSummary: expect.stringContaining('Development fallback summary'),
                keyDecisions: expect.any(Array),
                outcomes: expect.any(Array),
                processHistory: expect.any(Array),
                recommendedDecision: expect.stringMatching(/approved|denied|requires_additional_info/),
                supportingRationale: expect.any(Array)
            });

            expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: 'generate_final_summary',
                    success: false,
                    error: 'Final summary failed'
                })
            );
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

            // In test mode, the service should provide fallback data instead of throwing errors
            const result = await aiService.validateCaseCompleteness(mockCaseData);

            expect(result).toMatchObject({
                isComplete: expect.any(Boolean),
                missingSteps: expect.any(Array),
                missingDocuments: expect.any(Array),
                recommendations: expect.any(Array),
                confidence: expect.any(Number)
            });

            expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: 'validate_completeness',
                    success: false,
                    error: 'Validation failed'
                })
            );
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

            // In test mode, the service should provide fallback data instead of throwing errors
            const result = await aiService.detectMissingFields(mockApplicationData);

            expect(result).toMatchObject({
                missingFields: expect.any(Array),
                completenessScore: expect.any(Number),
                priorityActions: expect.any(Array),
                estimatedCompletionTime: expect.any(String)
            });

            expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: 'detect_missing_fields',
                    success: false,
                    error: 'Detection failed'
                })
            );
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

    describe('Enhanced AIService with PromptTemplateService', () => {
        let enhancedAiService: AIService;
        let promptTemplateService: PromptTemplateService;

        // Enhanced test data
        const mockEnhancedDocument: CaseDocument = {
            id: 'doc-1',
            filename: 'application.pdf',
            path: '/uploads/application.pdf',
            uploadedAt: new Date('2023-01-01'),
            size: 1024,
            mimeType: 'application/pdf'
        };

        const mockEnhancedApplicationData: ApplicationData = {
            applicantName: 'John Doe',
            applicantEmail: 'john@example.com',
            applicationType: 'visa',
            submissionDate: new Date('2023-01-01'),
            documents: [mockEnhancedDocument],
            formData: {
                purpose: 'tourism',
                duration: '2 weeks',
                country: 'USA'
            }
        };

        const mockEnhancedCaseNote: CaseNote = {
            id: 'note-1',
            caseId: 'case-1',
            content: 'Initial review completed',
            createdBy: 'user-1',
            createdAt: new Date('2023-01-02')
        };

        const mockEnhancedAuditEntry: AuditEntry = {
            id: 'audit-1',
            caseId: 'case-1',
            action: 'case_created',
            details: { status: 'active' },
            userId: 'user-1',
            timestamp: new Date('2023-01-01')
        };

        const mockEnhancedAISummary: AISummary = {
            id: 'summary-1',
            caseId: 'case-1',
            type: 'overall',
            content: 'Previous AI summary',
            recommendations: ['Review documents'],
            confidence: 0.8,
            generatedAt: new Date('2023-01-01'),
            version: 1
        };

        const mockEnhancedCase: Case = {
            id: 'case-1',
            applicationData: mockEnhancedApplicationData,
            status: CaseStatus.ACTIVE,
            currentStep: ProcessStep.IN_REVIEW,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-02'),
            assignedTo: 'user-1',
            notes: [mockEnhancedCaseNote],
            aiSummaries: [mockEnhancedAISummary],
            auditTrail: [mockEnhancedAuditEntry]
        };

        beforeEach(() => {
            // Create real PromptTemplateService for testing
            promptTemplateService = new PromptTemplateService();

            // Create AIService with mocked dependencies and real PromptTemplateService
            enhancedAiService = new AIService(mockOpenRouterClient, mockDataService, promptTemplateService);
        });

        describe('generateOverallSummary with template validation', () => {
            it('should generate summary using template service', async () => {
                const mockResponse = {
                    content: JSON.stringify({
                        content: 'This is a comprehensive case summary',
                        recommendations: ['Review additional documents', 'Schedule interview'],
                        confidence: 0.85
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 100, output: 50 },
                    responseTime: 1500,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockResolvedValue();

                const result = await enhancedAiService.generateOverallSummary(mockEnhancedCase);

                // Verify template service was used correctly
                expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
                    expect.stringContaining('Please analyze the following case data'),
                    expect.objectContaining({
                        max_tokens: 1000,
                        temperature: 0.3
                    })
                );

                // Verify response structure
                expect(result).toEqual({
                    id: expect.any(String),
                    caseId: 'case-1',
                    type: 'overall',
                    content: 'This is a comprehensive case summary',
                    recommendations: ['Review additional documents', 'Schedule interview'],
                    confidence: 0.85,
                    generatedAt: expect.any(Date),
                    version: 1
                });

                // Verify AI interaction was logged
                expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        caseId: 'case-1',
                        operation: 'generate_summary',
                        success: true,
                        promptTemplate: 'overall_summary_v1',
                        promptVersion: '1.0'
                    })
                );
            });

            it('should handle invalid AI response format', async () => {
                const mockResponse = {
                    content: JSON.stringify({
                        content: '', // Invalid: empty content
                        recommendations: [], // Invalid: empty recommendations
                        confidence: 1.5 // Invalid: confidence > 1
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 100, output: 50 },
                    responseTime: 1500,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockResolvedValue();

                // In test mode, the service should provide fallback data instead of throwing errors
                const result = await enhancedAiService.generateOverallSummary(mockEnhancedCase);

                expect(result).toMatchObject({
                    caseId: 'case-1',
                    type: 'overall',
                    content: expect.stringContaining('development fallback'),
                    recommendations: expect.any(Array),
                    confidence: expect.any(Number),
                    version: 1
                });

                // Verify error was logged
                expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: expect.stringContaining('Invalid AI response format')
                    })
                );
            });
        });

        describe('generateStepRecommendation with template validation', () => {
            it('should generate step-specific recommendations using template service', async () => {
                const mockResponse = {
                    content: JSON.stringify({
                        recommendations: ['Complete document review', 'Request additional information'],
                        priority: 'high',
                        confidence: 0.9
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 80, output: 40 },
                    responseTime: 1200,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockResolvedValue();

                const result = await enhancedAiService.generateStepRecommendation(mockEnhancedCase, ProcessStep.IN_REVIEW);

                // Verify template service was used correctly
                expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
                    expect.stringContaining('Please provide specific recommendations'),
                    expect.objectContaining({
                        max_tokens: 800,
                        temperature: 0.4
                    })
                );

                // Verify response structure
                expect(result).toEqual({
                    id: expect.any(String),
                    caseId: 'case-1',
                    step: ProcessStep.IN_REVIEW,
                    recommendations: ['Complete document review', 'Request additional information'],
                    priority: 'high',
                    confidence: 0.9,
                    generatedAt: expect.any(Date)
                });

                // Verify AI interaction was logged with step context
                expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        operation: 'generate_recommendation',
                        stepContext: ProcessStep.IN_REVIEW,
                        promptTemplate: 'step_recommendation_v1'
                    })
                );
            });

            it('should validate step recommendation response format', async () => {
                const mockResponse = {
                    content: JSON.stringify({
                        recommendations: [], // Invalid: empty recommendations
                        priority: 'invalid', // Invalid: not in enum
                        confidence: -0.1 // Invalid: negative confidence
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 80, output: 40 },
                    responseTime: 1200,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockResolvedValue();

                // In test mode, the service should provide fallback data instead of throwing errors
                const result = await enhancedAiService.generateStepRecommendation(mockEnhancedCase, ProcessStep.IN_REVIEW);

                expect(result).toMatchObject({
                    caseId: 'case-1',
                    step: 'in_review',
                    recommendations: expect.any(Array),
                    priority: expect.stringMatching(/low|medium|high/),
                    confidence: expect.any(Number)
                });

                // Verify error was logged
                expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: expect.stringContaining('Invalid AI response format')
                    })
                );
            });
        });

        describe('analyzeApplication with template validation', () => {
            it('should analyze application using template service', async () => {
                const mockResponse = {
                    content: JSON.stringify({
                        summary: 'Tourism visa application for 2-week stay',
                        keyPoints: ['Valid passport', 'Tourism purpose', 'Short duration'],
                        potentialIssues: ['Missing travel insurance'],
                        recommendedActions: ['Request travel insurance proof'],
                        priorityLevel: 'medium',
                        estimatedProcessingTime: '3-5 business days',
                        requiredDocuments: ['Travel insurance certificate']
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 120, output: 80 },
                    responseTime: 1800,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockResolvedValue();

                const result = await enhancedAiService.analyzeApplication(mockEnhancedApplicationData);

                // Verify template service was used correctly
                expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
                    expect.stringContaining('Please analyze the following application data'),
                    expect.objectContaining({
                        max_tokens: 1200,
                        temperature: 0.2
                    })
                );

                // Verify response structure
                expect(result).toEqual({
                    summary: 'Tourism visa application for 2-week stay',
                    keyPoints: ['Valid passport', 'Tourism purpose', 'Short duration'],
                    potentialIssues: ['Missing travel insurance'],
                    recommendedActions: ['Request travel insurance proof'],
                    priorityLevel: 'medium',
                    estimatedProcessingTime: '3-5 business days',
                    requiredDocuments: ['Travel insurance certificate'],
                    analysisTimestamp: expect.any(Date)
                });

                // Verify AI interaction was logged
                expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        operation: 'analyze_application',
                        promptTemplate: 'application_analysis_v1'
                    })
                );
            });

            it('should validate application analysis response format', async () => {
                const mockResponse = {
                    content: JSON.stringify({
                        summary: '', // Invalid: empty summary
                        keyPoints: ['Valid point'],
                        potentialIssues: [],
                        recommendedActions: [],
                        priorityLevel: 'invalid', // Invalid: not in enum
                        estimatedProcessingTime: '', // Invalid: empty string
                        requiredDocuments: []
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 120, output: 80 },
                    responseTime: 1800,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockResolvedValue();

                // In test mode, the service should provide fallback data instead of throwing errors
                const result = await enhancedAiService.analyzeApplication(mockEnhancedApplicationData);

                expect(result).toMatchObject({
                    summary: expect.stringContaining('Development fallback analysis'),
                    keyPoints: expect.any(Array),
                    potentialIssues: expect.any(Array),
                    recommendedActions: expect.any(Array),
                    priorityLevel: expect.stringMatching(/low|medium|high|urgent/),
                    estimatedProcessingTime: expect.any(String),
                    requiredDocuments: expect.any(Array)
                });

                // Verify error was logged
                expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: expect.stringContaining('Invalid AI response format')
                    })
                );
            });
        });

        describe('Template Data Building', () => {
            it('should build correct template data for overall summary', async () => {
                const mockResponse = {
                    content: JSON.stringify({
                        content: 'Test summary',
                        recommendations: ['Test recommendation'],
                        confidence: 0.8
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 100, output: 50 },
                    responseTime: 1500,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockResolvedValue();

                await enhancedAiService.generateOverallSummary(mockEnhancedCase);

                // Verify the prompt contains expected data
                const calledPrompt = mockOpenRouterClient.makeRequest.mock.calls[0][0];
                expect(calledPrompt).toContain('Case ID: case-1');
                expect(calledPrompt).toContain('Status: active');
                expect(calledPrompt).toContain('Current Step: in_review');
                expect(calledPrompt).toContain('Application Type: visa');
                expect(calledPrompt).toContain('Applicant: John Doe');
                expect(calledPrompt).toContain('Documents: application.pdf');
                expect(calledPrompt).toContain('Initial review completed');
            });

            it('should handle empty arrays and null values in template data', async () => {
                const emptyCaseData: Case = {
                    ...mockEnhancedCase,
                    notes: [],
                    aiSummaries: [],
                    auditTrail: [],
                    applicationData: {
                        ...mockEnhancedApplicationData,
                        documents: []
                    }
                };

                const mockResponse = {
                    content: JSON.stringify({
                        content: 'Test summary',
                        recommendations: ['Test recommendation'],
                        confidence: 0.8
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 100, output: 50 },
                    responseTime: 1500,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockResolvedValue();

                await enhancedAiService.generateOverallSummary(emptyCaseData);

                // Should not throw and should handle empty data gracefully
                expect(mockOpenRouterClient.makeRequest).toHaveBeenCalled();
            });
        });

        describe('Enhanced Error Handling and Logging', () => {
            it('should continue operation even if logging fails', async () => {
                const mockResponse = {
                    content: JSON.stringify({
                        content: 'Test summary',
                        recommendations: ['Test recommendation'],
                        confidence: 0.8
                    }),
                    model: 'grok-beta',
                    tokensUsed: { input: 100, output: 50 },
                    responseTime: 1500,
                    finishReason: 'stop'
                };

                mockOpenRouterClient.makeRequest.mockResolvedValue(mockResponse);
                mockDataService.logAIInteraction.mockRejectedValue(new Error('Logging failed'));

                // Should not throw despite logging failure
                const result = await enhancedAiService.generateOverallSummary(mockEnhancedCase);

                expect(result).toBeDefined();
                expect(result.content).toBe('Test summary');
            });

            it('should log detailed error information on failures', async () => {
                const apiError = new Error('Detailed API error message');
                mockOpenRouterClient.makeRequest.mockRejectedValue(apiError);
                mockDataService.logAIInteraction.mockResolvedValue();

                // In test mode, the service should provide fallback data instead of throwing errors
                const result = await enhancedAiService.generateOverallSummary(mockEnhancedCase);

                expect(result).toMatchObject({
                    caseId: 'case-1',
                    type: 'overall',
                    content: expect.stringContaining('development fallback'),
                    recommendations: expect.any(Array),
                    confidence: expect.any(Number),
                    version: 1
                });

                // Verify detailed error was logged
                expect(mockDataService.logAIInteraction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: 'Detailed API error message',
                        model: 'unknown',
                        tokensUsed: 0
                    })
                );
            });
        });
    });
});