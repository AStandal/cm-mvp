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

    beforeEach(() => {
        vi.clearAllMocks();
        resetServices();
        mockServices = createMockServices();
        setServices(mockServices);
        app = createTestApp();
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
                .get('/api/cases/')
                .expect(404); // Express will return 404 for missing parameter
        });

        it('should handle empty case ID', async () => {
            const response = await request(app)
                .get('/api/cases/ ')
                .expect(404); // Space character doesn't match route pattern
        });
    });
});