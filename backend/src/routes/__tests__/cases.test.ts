import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import casesRouter from '../cases.js';
import { setServices, resetServices } from '../serviceFactory.js';
import { createMockServices } from './mockServices.js';

// Create a test app
const createTestApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/cases', casesRouter);
    return app;
};

describe('Cases Router', () => {
    let app: express.Application;
    let mockServices: ReturnType<typeof createMockServices>;

    const existingCase = {
        id: 'existing-case-id',
        applicationData: {
            applicantName: 'Test User',
            applicantEmail: 'test@example.com',
            applicationType: 'standard',
            submissionDate: new Date().toISOString(),
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

    beforeEach(() => {
        vi.clearAllMocks();
        resetServices();
        mockServices = createMockServices();
        setServices(mockServices);
        app = createTestApp();
    });

    describe('GET /api/cases', () => {
        it('should retrieve all cases with default pagination', async () => {
            const response = await request(app)
                .get('/api/cases')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    cases: expect.any(Array),
                    total: expect.any(Number),
                    page: 1,
                    limit: 10
                }
            });

            expect(mockServices.caseService.getAllCases).toHaveBeenCalledWith({
                status: undefined,
                page: 1,
                limit: 10
            });
        });

        it('should handle query parameters for filtering and pagination', async () => {
            // Update the mock to return the expected pagination values
            mockServices.caseService.getAllCases.mockResolvedValue({
                cases: [existingCase],
                total: 1,
                page: 2,
                limit: 5
            });

            const response = await request(app)
                .get('/api/cases?status=active&page=2&limit=5')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    cases: expect.any(Array),
                    total: expect.any(Number),
                    page: 2,
                    limit: 5
                }
            });

            expect(mockServices.caseService.getAllCases).toHaveBeenCalledWith({
                status: 'active',
                page: 2,
                limit: 5
            });
        });

        it('should handle service errors gracefully', async () => {
            mockServices.caseService.getAllCases.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/cases')
                .expect(500);

            expect(response.body).toMatchObject({
                error: {
                    code: 'CASES_RETRIEVAL_FAILED',
                    message: 'Database error'
                }
            });
        });
    });

    describe('POST /api/cases', () => {
        it('should create a new case with valid application data', async () => {
            const newCase = {
                applicationData: {
                    applicantName: 'John Doe',
                    applicantEmail: 'john@example.com',
                    applicationType: 'standard',
                    submissionDate: new Date().toISOString(),
                    documents: [],
                    formData: {}
                }
            };

            const response = await request(app)
                .post('/api/cases')
                .send(newCase)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    case: {
                        id: 'test-case-id',
                        applicationData: {
                            applicantName: 'John Doe',
                            applicantEmail: 'john@example.com',
                            applicationType: 'standard'
                        },
                        status: 'active',
                        currentStep: 'received'
                    }
                },
                message: 'Case created successfully'
            });

            expect(mockServices.caseService.createCaseWithoutAI).toHaveBeenCalledWith(
                expect.objectContaining({
                    applicantName: 'John Doe',
                    applicantEmail: 'john@example.com',
                    applicationType: 'standard'
                }),
                'system'
            );
        });

        it('should validate input data', async () => {
            const invalidData = {
                applicationData: {
                    applicantName: '', // Invalid: empty string
                    applicantEmail: 'invalid-email', // Invalid: not an email
                    applicationType: '' // Invalid: empty string
                }
            };

            const response = await request(app)
                .post('/api/cases')
                .send(invalidData)
                .expect(400);

            expect(response.body).toMatchObject({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: expect.any(Array)
                }
            });
        });

        it('should handle missing application data', async () => {
            const response = await request(app)
                .post('/api/cases')
                .send({})
                .expect(400);

            expect(response.body).toMatchObject({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data'
                }
            });
        });
    });

    describe('GET /api/cases/:id', () => {
        it('should retrieve an existing case by ID', async () => {
            const response = await request(app)
                .get('/api/cases/existing-case-id')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    case: {
                        id: 'existing-case-id',
                        applicationData: {
                            applicantName: 'Test User',
                            applicantEmail: 'test@example.com',
                            applicationType: 'standard'
                        },
                        status: 'active',
                        currentStep: 'received'
                    }
                }
            });

            expect(mockServices.caseService.getCaseById).toHaveBeenCalledWith('existing-case-id');
        });

        it('should return 404 for non-existent case', async () => {
            const response = await request(app)
                .get('/api/cases/non-existent-id')
                .expect(404);

            expect(response.body).toMatchObject({
                error: {
                    code: 'CASE_NOT_FOUND',
                    message: 'Case with ID non-existent-id not found'
                }
            });

            expect(mockServices.caseService.getCaseById).toHaveBeenCalledWith('non-existent-id');
        });

        it('should validate case ID parameter', async () => {
            const response = await request(app)
                .get('/api/cases/non-existent-case')
                .expect(404);

            expect(response.body).toMatchObject({
                error: {
                    code: 'CASE_NOT_FOUND',
                    message: 'Case with ID non-existent-case not found'
                }
            });
        });

        it('should handle empty case ID', async () => {
            const response = await request(app)
                .get('/api/cases/%20')
                .expect(400);

            expect(response.body).toMatchObject({
                error: {
                    code: 'INVALID_CASE_ID',
                    message: 'Case ID is required and must be a valid string'
                }
            });
        });
    });

    describe('GET /api/cases/:id/ai-summary', () => {
        it('should retrieve AI summary for existing case', async () => {
            const mockAISummary = {
                id: 'summary-id',
                caseId: 'existing-case-id',
                type: 'overall',
                content: 'Test AI summary content',
                recommendations: ['Test recommendation'],
                confidence: 0.85,
                createdAt: new Date().toISOString(),
                step: null
            };

            mockServices.aiService.generateOverallSummary.mockResolvedValue(mockAISummary);

            const response = await request(app)
                .get('/api/cases/existing-case-id/ai-summary')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    aiSummary: mockAISummary
                }
            });

            expect(mockServices.caseService.getCaseById).toHaveBeenCalledWith('existing-case-id');
            expect(mockServices.aiService.generateOverallSummary).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'existing-case-id',
                    applicationData: expect.objectContaining({
                        applicantName: 'Test User',
                        applicantEmail: 'test@example.com',
                        applicationType: 'standard'
                    })
                })
            );
        });

        it('should return 404 for non-existent case', async () => {
            const response = await request(app)
                .get('/api/cases/non-existent-id/ai-summary')
                .expect(404);

            expect(response.body).toMatchObject({
                error: {
                    code: 'CASE_NOT_FOUND',
                    message: 'Case with ID non-existent-id not found'
                }
            });
        });

        it('should handle AI service errors', async () => {
            mockServices.aiService.generateOverallSummary.mockRejectedValue(new Error('AI service error'));

            const response = await request(app)
                .get('/api/cases/existing-case-id/ai-summary')
                .expect(500);

            expect(response.body).toMatchObject({
                error: {
                    code: 'AI_SUMMARY_GENERATION_FAILED',
                    message: 'AI service error'
                }
            });
        });
    });

    describe('POST /api/cases/:id/ai-refresh', () => {
        it('should refresh AI insights for existing case', async () => {
            const mockAISummary = {
                id: 'summary-id',
                caseId: 'existing-case-id',
                type: 'overall',
                content: 'Refreshed AI summary content',
                recommendations: ['Updated recommendation'],
                confidence: 0.90,
                createdAt: new Date().toISOString(),
                step: null
            };

            mockServices.aiService.generateOverallSummary.mockResolvedValue(mockAISummary);

            const response = await request(app)
                .post('/api/cases/existing-case-id/ai-refresh')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    aiSummary: mockAISummary
                },
                message: 'AI insights refreshed successfully'
            });

            expect(mockServices.caseService.getCaseById).toHaveBeenCalledWith('existing-case-id');
            expect(mockServices.aiService.generateOverallSummary).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'existing-case-id',
                    applicationData: expect.objectContaining({
                        applicantName: 'Test User',
                        applicantEmail: 'test@example.com',
                        applicationType: 'standard'
                    })
                })
            );
        });

        it('should return 404 for non-existent case', async () => {
            const response = await request(app)
                .post('/api/cases/non-existent-id/ai-refresh')
                .expect(404);

            expect(response.body).toMatchObject({
                error: {
                    code: 'CASE_NOT_FOUND',
                    message: 'Case with ID non-existent-id not found'
                }
            });
        });

        it('should handle AI service errors', async () => {
            mockServices.aiService.generateOverallSummary.mockRejectedValue(new Error('AI refresh failed'));

            const response = await request(app)
                .post('/api/cases/existing-case-id/ai-refresh')
                .expect(500);

            expect(response.body).toMatchObject({
                error: {
                    code: 'AI_REFRESH_FAILED',
                    message: 'AI refresh failed'
                }
            });
        });
    });
});