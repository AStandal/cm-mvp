import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { setupAPITestDatabase, cleanupAPITestDatabase } from '../api/setup.js';
import { ZoningPlan } from '../../types/index.js';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

describe('Zoning API Integration Tests', () => {
    beforeEach(async () => {
        await setupAPITestDatabase();
    });

    afterEach(async () => {
        await cleanupAPITestDatabase();
    });

    describe('POST /api/zoning/extract', () => {
        it('should extract zoning requirements from default PDF', async () => {
            const response = await request(app)
                .post('/api/zoning/extract')
                .send({})
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    zoningPlan: expect.objectContaining({
                        id: expect.any(String),
                        name: expect.any(String),
                        documentPath: expect.any(String),
                        documentHash: expect.any(String),
                        jurisdiction: expect.any(String),
                        effectiveDate: expect.any(String),
                        version: expect.any(String),
                        requirements: expect.any(Array),
                        extractionMetadata: expect.objectContaining({
                            extractedAt: expect.any(String),
                            aiModel: expect.any(String),
                            promptTemplate: expect.any(String),
                            promptVersion: expect.any(String),
                            confidence: expect.any(Number),
                            tokensUsed: expect.any(Number),
                            processingDuration: expect.any(Number),
                            documentPages: expect.any(Number),
                            extractedRequirementsCount: expect.any(Number)
                        }),
                        createdAt: expect.any(String),
                        updatedAt: expect.any(String)
                    }),
                    processingMetadata: expect.objectContaining({
                        documentPath: expect.any(String),
                        documentSize: expect.any(Number),
                        pageCount: expect.any(Number),
                        extractedRequirements: expect.any(Number)
                    })
                },
                message: 'Zoning requirements extracted successfully',
                timestamp: expect.any(String)
            });
        });

        it('should extract from specific file name', async () => {
            const response = await request(app)
                .post('/api/zoning/extract')
                .send({
                    fileName: 'Zoning-plan.pdf'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.processingMetadata.documentPath).toContain('Zoning-plan.pdf');
        });

        it('should handle file not found error', async () => {
            const response = await request(app)
                .post('/api/zoning/extract')
                .send({
                    fileName: 'non-existent.pdf'
                })
                .expect(404);

            expect(response.body).toMatchObject({
                error: {
                    code: 'EXTRACTION_FAILED',
                    message: expect.stringContaining('Failed to extract zoning requirements')
                },
                timestamp: expect.any(String),
                requestId: expect.any(String)
            });
        });

        it('should handle invalid file path', async () => {
            const response = await request(app)
                .post('/api/zoning/extract')
                .send({
                    filePath: '/invalid/path/file.pdf'
                })
                .expect(404);

            expect(response.body.error.code).toBe('EXTRACTION_FAILED');
        });

        it('should validate input data', async () => {
            const response = await request(app)
                .post('/api/zoning/extract')
                .send({
                    fileName: 123 // Invalid type
                })
                .expect(400);

            expect(response.body).toMatchObject({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: expect.any(Array)
                }
            });
        });

        it('should handle no PDF files found', async () => {
            // Mock empty zoning-plan-data folder scenario
            const response = await request(app)
                .post('/api/zoning/extract')
                .send({
                    filePath: '/empty/folder'
                })
                .expect(404);

            expect(response.body.error.code).toBe('EXTRACTION_FAILED');
        });
    });

    describe('POST /api/zoning/batch-process', () => {
        it('should process default zoning-plan-data folder', async () => {
            const response = await request(app)
                .post('/api/zoning/batch-process')
                .send({})
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    batchResult: expect.objectContaining({
                        totalDocuments: expect.any(Number),
                        successfulExtractions: expect.any(Number),
                        failedExtractions: expect.any(Number),
                        results: expect.any(Array),
                        totalProcessingTime: expect.any(Number)
                    }),
                    summary: expect.objectContaining({
                        totalDocuments: expect.any(Number),
                        successfulExtractions: expect.any(Number),
                        failedExtractions: expect.any(Number),
                        successRate: expect.any(Number)
                    })
                },
                message: 'Batch processing completed',
                timestamp: expect.any(String)
            });
        });

        it('should process custom folder path', async () => {
            const response = await request(app)
                .post('/api/zoning/batch-process')
                .send({
                    folderPath: path.join(process.cwd(), 'zoning-plan-data')
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should handle invalid folder path', async () => {
            const response = await request(app)
                .post('/api/zoning/batch-process')
                .send({
                    folderPath: '/non/existent/folder'
                })
                .expect(500);

            expect(response.body).toMatchObject({
                error: {
                    code: 'BATCH_PROCESSING_FAILED',
                    message: expect.stringContaining('Failed to process documents')
                }
            });
        });

        it('should validate input data', async () => {
            const response = await request(app)
                .post('/api/zoning/batch-process')
                .send({
                    folderPath: 123 // Invalid type
                })
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/zoning/plans', () => {
        it('should retrieve all zoning plans', async () => {
            const response = await request(app)
                .get('/api/zoning/plans')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    plans: expect.any(Array),
                    total: expect.any(Number),
                    page: 1,
                    limit: 10
                },
                message: 'Zoning plans retrieved successfully',
                timestamp: expect.any(String)
            });
        });

        it('should handle pagination parameters', async () => {
            const response = await request(app)
                .get('/api/zoning/plans?page=2&limit=5')
                .expect(200);

            expect(response.body.data.page).toBe(2);
            expect(response.body.data.limit).toBe(5);
        });
    });

    describe('GET /api/zoning/plans/:id', () => {
        let savedPlanId: string;

        beforeEach(async () => {
            // Create a test zoning plan in the database
            const { getServices } = await import('../../routes/serviceFactory.js');
            const { dataService } = getServices();

            const testPlan: ZoningPlan = {
                id: randomUUID(),
                name: 'Test API Plan',
                documentPath: '/test/api-plan.pdf',
                documentHash: 'api123hash',
                jurisdiction: 'API Test City',
                effectiveDate: new Date('2024-01-01'),
                version: '1.0',
                requirements: [
                    {
                        id: randomUUID(),
                        planId: '', // Will be set below
                        category: 'API Test Category',
                        requirement: 'API test requirement',
                        description: 'Test requirement for API',
                        criteria: [],
                        references: ['API Section 1'],
                        priority: 'required',
                        applicableZones: ['API1'],
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                extractionMetadata: {
                    extractedAt: new Date(),
                    aiModel: 'gpt-4',
                    promptTemplate: 'zoning_requirements_extraction_v1',
                    promptVersion: '1.0',
                    confidence: 0.9,
                    tokensUsed: 1500,
                    processingDuration: 5000,
                    documentPages: 10,
                    extractedRequirementsCount: 1
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            testPlan.requirements[0].planId = testPlan.id;
            savedPlanId = testPlan.id;

            await dataService.saveZoningPlan(testPlan);
        });

        it('should retrieve a specific zoning plan', async () => {
            const response = await request(app)
                .get(`/api/zoning/plans/${savedPlanId}`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    zoningPlan: expect.objectContaining({
                        id: savedPlanId,
                        name: 'Test API Plan',
                        jurisdiction: 'API Test City',
                        requirements: expect.arrayContaining([
                            expect.objectContaining({
                                category: 'API Test Category',
                                requirement: 'API test requirement'
                            })
                        ])
                    })
                },
                message: 'Zoning plan retrieved successfully'
            });
        });

        it('should return 404 for non-existent plan', async () => {
            const response = await request(app)
                .get('/api/zoning/plans/non-existent-id')
                .expect(404);

            expect(response.body).toMatchObject({
                error: {
                    code: 'ZONING_PLAN_NOT_FOUND',
                    message: 'Zoning plan with ID non-existent-id not found'
                }
            });
        });

        it('should validate plan ID parameter', async () => {
            const response = await request(app)
                .get('/api/zoning/plans/')
                .expect(404); // Should hit the route not found since no ID provided
        });

        it('should handle empty plan ID', async () => {
            const response = await request(app)
                .get('/api/zoning/plans/ ')
                .expect(400);

            expect(response.body.error.code).toBe('INVALID_ZONING_PLAN_ID');
        });
    });

    describe('GET /api/zoning/plans/:id/requirements', () => {
        let savedPlanId: string;

        beforeEach(async () => {
            const { getServices } = await import('../../routes/serviceFactory.js');
            const { dataService } = getServices();

            const testPlan: ZoningPlan = {
                id: randomUUID(),
                name: 'Requirements Test Plan',
                documentPath: '/test/requirements-plan.pdf',
                documentHash: 'req123hash',
                jurisdiction: 'Requirements City',
                effectiveDate: new Date(),
                version: '1.0',
                requirements: [
                    {
                        id: randomUUID(),
                        planId: '',
                        category: 'Height Limits',
                        requirement: 'Maximum 40 feet',
                        description: 'Building height restriction',
                        criteria: [],
                        references: ['Section 4.1'],
                        priority: 'required',
                        applicableZones: ['R1', 'R2'],
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    {
                        id: randomUUID(),
                        planId: '',
                        category: 'Setbacks',
                        requirement: 'Minimum 15 feet front yard',
                        description: 'Front yard setback requirement',
                        criteria: [],
                        references: ['Section 5.1'],
                        priority: 'required',
                        applicableZones: ['R1'],
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ],
                extractionMetadata: {
                    extractedAt: new Date(),
                    aiModel: 'gpt-4',
                    promptTemplate: 'zoning_requirements_extraction_v1',
                    promptVersion: '1.0',
                    confidence: 0.85,
                    tokensUsed: 2000,
                    processingDuration: 6000,
                    documentPages: 15,
                    extractedRequirementsCount: 2
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            testPlan.requirements.forEach(req => {
                req.planId = testPlan.id;
            });
            savedPlanId = testPlan.id;

            await dataService.saveZoningPlan(testPlan);
        });

        it('should retrieve requirements for a specific plan', async () => {
            const response = await request(app)
                .get(`/api/zoning/plans/${savedPlanId}/requirements`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    requirements: expect.arrayContaining([
                        expect.objectContaining({
                            category: 'Height Limits',
                            requirement: 'Maximum 40 feet'
                        }),
                        expect.objectContaining({
                            category: 'Setbacks',
                            requirement: 'Minimum 15 feet front yard'
                        })
                    ]),
                    total: 2,
                    planId: savedPlanId
                },
                message: 'Zoning requirements retrieved successfully'
            });
        });

        it('should return empty array for plan with no requirements', async () => {
            const { getServices } = await import('../../routes/serviceFactory.js');
            const { dataService } = getServices();

            const emptyPlan: ZoningPlan = {
                id: randomUUID(),
                name: 'Empty Plan',
                documentPath: '/test/empty.pdf',
                documentHash: 'empty123',
                jurisdiction: 'Empty City',
                effectiveDate: new Date(),
                version: '1.0',
                requirements: [],
                extractionMetadata: {
                    extractedAt: new Date(),
                    aiModel: 'gpt-4',
                    promptTemplate: 'zoning_requirements_extraction_v1',
                    promptVersion: '1.0',
                    confidence: 0.8,
                    tokensUsed: 500,
                    processingDuration: 2000,
                    documentPages: 5,
                    extractedRequirementsCount: 0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await dataService.saveZoningPlan(emptyPlan);

            const response = await request(app)
                .get(`/api/zoning/plans/${emptyPlan.id}/requirements`)
                .expect(200);

            expect(response.body.data.requirements).toHaveLength(0);
            expect(response.body.data.total).toBe(0);
        });
    });

    describe('POST /api/zoning/requirements/search', () => {
        beforeEach(async () => {
            const { getServices } = await import('../../routes/serviceFactory.js');
            const { dataService } = getServices();

            // Create test plans with different requirements for search testing
            const plans: ZoningPlan[] = [
                {
                    id: randomUUID(),
                    name: 'Residential Search Plan',
                    documentPath: '/test/residential-search.pdf',
                    documentHash: 'ressearch123',
                    jurisdiction: 'Search City',
                    effectiveDate: new Date(),
                    version: '1.0',
                    requirements: [
                        {
                            id: randomUUID(),
                            planId: '',
                            category: 'Building Height',
                            subcategory: 'Residential',
                            requirement: 'Maximum 35 feet',
                            description: 'Height limit for residential buildings',
                            criteria: [],
                            references: ['Section 4.1'],
                            priority: 'required',
                            applicableZones: ['R1', 'R2'],
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    ],
                    extractionMetadata: {
                        extractedAt: new Date(),
                        aiModel: 'gpt-4',
                        promptTemplate: 'zoning_requirements_extraction_v1',
                        promptVersion: '1.0',
                        confidence: 0.9,
                        tokensUsed: 1500,
                        processingDuration: 5000,
                        documentPages: 10,
                        extractedRequirementsCount: 1
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: randomUUID(),
                    name: 'Commercial Search Plan',
                    documentPath: '/test/commercial-search.pdf',
                    documentHash: 'comsearch123',
                    jurisdiction: 'Search City',
                    effectiveDate: new Date(),
                    version: '1.0',
                    requirements: [
                        {
                            id: randomUUID(),
                            planId: '',
                            category: 'Parking',
                            requirement: 'Minimum 1 space per 300 sq ft',
                            description: 'Parking requirement for commercial buildings',
                            criteria: [],
                            references: ['Section 7.1'],
                            priority: 'required',
                            applicableZones: ['C1', 'C2'],
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            id: randomUUID(),
                            planId: '',
                            category: 'Building Height',
                            requirement: 'Maximum 60 feet',
                            description: 'Height limit for commercial buildings',
                            criteria: [],
                            references: ['Section 4.2'],
                            priority: 'recommended',
                            applicableZones: ['C1'],
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    ],
                    extractionMetadata: {
                        extractedAt: new Date(),
                        aiModel: 'gpt-4',
                        promptTemplate: 'zoning_requirements_extraction_v1',
                        promptVersion: '1.0',
                        confidence: 0.85,
                        tokensUsed: 2000,
                        processingDuration: 6000,
                        documentPages: 15,
                        extractedRequirementsCount: 2
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            for (const plan of plans) {
                plan.requirements.forEach(req => {
                    req.planId = plan.id;
                });
                await dataService.saveZoningPlan(plan);
            }
        });

        it('should search by category', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({
                    category: 'Building Height'
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    requirements: expect.arrayContaining([
                        expect.objectContaining({
                            category: 'Building Height'
                        })
                    ]),
                    total: 2,
                    searchCriteria: {
                        category: 'Building Height'
                    }
                },
                message: 'Zoning requirements search completed successfully'
            });

            expect(response.body.data.requirements).toHaveLength(2);
        });

        it('should search by priority', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({
                    priority: 'required'
                })
                .expect(200);

            expect(response.body.data.requirements).toHaveLength(2);
            expect(response.body.data.requirements.every((req: any) => req.priority === 'required')).toBe(true);
        });

        it('should search by jurisdiction', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({
                    jurisdiction: 'Search City'
                })
                .expect(200);

            expect(response.body.data.requirements).toHaveLength(3);
        });

        it('should search by applicable zones', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({
                    applicableZones: ['R1']
                })
                .expect(200);

            expect(response.body.data.requirements).toHaveLength(1);
            expect(response.body.data.requirements[0].applicableZones).toContain('R1');
        });

        it('should search by text content', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({
                    textSearch: 'parking'
                })
                .expect(200);

            expect(response.body.data.requirements).toHaveLength(1);
            expect(response.body.data.requirements[0].category).toBe('Parking');
        });

        it('should combine multiple search criteria', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({
                    category: 'Building Height',
                    priority: 'required'
                })
                .expect(200);

            expect(response.body.data.requirements).toHaveLength(1);
            expect(response.body.data.requirements[0].priority).toBe('required');
            expect(response.body.data.requirements[0].subcategory).toBe('Residential');
        });

        it('should return empty results for no matches', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({
                    category: 'Non-existent Category'
                })
                .expect(200);

            expect(response.body.data.requirements).toHaveLength(0);
            expect(response.body.data.total).toBe(0);
        });

        it('should validate search criteria', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({
                    priority: 'invalid-priority'
                })
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should handle empty search criteria', async () => {
            const response = await request(app)
                .post('/api/zoning/requirements/search')
                .send({})
                .expect(200);

            expect(response.body.data.requirements).toHaveLength(3); // All requirements
        });
    });

    describe('Error handling', () => {
        it('should handle malformed JSON', async () => {
            const response = await request(app)
                .post('/api/zoning/extract')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }')
                .expect(400);

            expect(response.body).toMatchObject({
                error: 'Invalid JSON',
                message: 'Malformed JSON in request body'
            });
        });

        it('should handle missing Content-Type header', async () => {
            const response = await request(app)
                .post('/api/zoning/extract')
                .send('not json')
                .expect(200); // Should still work with default parsing

            expect(response.body.success).toBe(true);
        });

        it('should handle server errors gracefully', async () => {
            // This test would require mocking internal services to force an error
            // For now, we'll test that the error structure is correct when errors occur
            const response = await request(app)
                .get('/api/zoning/plans/invalid-uuid-format')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('requestId');
        });
    });

    describe('Authentication and Authorization', () => {
        // These tests would be implemented if authentication is required
        it('should allow access to zoning endpoints without authentication', async () => {
            const response = await request(app)
                .get('/api/zoning/plans')
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('Rate limiting and concurrent requests', () => {
        it('should handle multiple concurrent requests', async () => {
            const requests = Array(5).fill(null).map(() =>
                request(app)
                    .get('/api/zoning/plans')
                    .expect(200)
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.body.success).toBe(true);
            });
        });
    });
});