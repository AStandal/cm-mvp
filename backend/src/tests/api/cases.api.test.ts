import { describe, it, expect } from 'vitest';
import request from 'supertest';
// Import setup first to ensure mocks are applied before importing the app
import { setupDatabaseHooks } from './setup.js';
import app from '@/index.js';

describe('API Tests - Case Management Endpoints', () => {
  setupDatabaseHooks();

  // ============================================================================
  // CORE ENDPOINTS (Task 5.3)
  // ============================================================================

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
            id: expect.any(String),
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

      expect(response.body.data.case.createdAt).toBeDefined();
      expect(response.body.data.case.updatedAt).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidCase = {
        applicationData: {
          applicantName: '',
          applicantEmail: 'invalid-email',
          applicationType: ''
        }
      };

      const response = await request(app)
        .post('/api/cases')
        .send(invalidCase)
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

    it('should have correct response headers', async () => {
      const response = await request(app)
        .post('/api/cases')
        .send({})
        .expect(400); // Now expects validation error instead of 404

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });

    it('should handle CORS for POST requests', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Origin', 'http://localhost:3000')
        .send({})
        .expect(400); // Now expects validation error instead of 404

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle JSON parsing', async () => {
      const testData = { test: 'data' };
      
      const response = await request(app)
        .post('/api/cases')
        .send(testData)
        .expect(400); // Now expects validation error instead of 404

      // Should still return JSON response indicating JSON was parsed
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Should return either 400 (JSON parser) or 500 (error handler)
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/cases/:id', () => {
    it('should retrieve an existing case by ID', async () => {
      // First create a case
      const newCase = {
        applicationData: {
          applicantName: 'Jane Smith',
          applicantEmail: 'jane@example.com',
          applicationType: 'priority',
          submissionDate: new Date().toISOString(),
          documents: [],
          formData: { priority: 'high' }
        }
      };

      const createResponse = await request(app)
        .post('/api/cases')
        .send(newCase)
        .expect(201);

      const caseId = createResponse.body.data.case.id;

      // Then retrieve it
      const response = await request(app)
        .get(`/api/cases/${caseId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          case: {
            id: caseId,
            applicationData: {
              applicantName: 'Jane Smith',
              applicantEmail: 'jane@example.com',
              applicationType: 'priority'
            },
            status: 'active',
            currentStep: 'received'
          }
        }
      });
    });

    it('should return 404 for non-existent case', async () => {
      const nonExistentId = 'non-existent-case-123';

      const response = await request(app)
        .get(`/api/cases/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'CASE_NOT_FOUND',
          message: `Case with ID ${nonExistentId} not found`
        }
      });
    });

    it('should validate case ID parameter', async () => {
      const response = await request(app)
        .get('/api/cases/')
        .expect(404); // Should hit the general 404 handler

      expect(response.body).toHaveProperty('error');
    });

    it('should handle URL parameters correctly', async () => {
      const testCaseId = 'case-with-special-chars-123';

      const response = await request(app)
        .get(`/api/cases/${testCaseId}`)
        .expect(404); // This should still be 404 for non-existent case

      expect(response.body).toMatchObject({
        error: {
          code: 'CASE_NOT_FOUND',
          message: `Case with ID ${testCaseId} not found`
        }
      });
    });

    it('should have correct response headers', async () => {
      const response = await request(app)
        .get('/api/cases/test-123')
        .expect(404); // This should still be 404 for non-existent case

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });
  });

  // ============================================================================
  // ADVANCED ENDPOINTS (Task 5.6)
  // ============================================================================

  describe('PUT /api/cases/:id/status', () => {
    it('should return 404 for unimplemented endpoint', async () => {
      const testCaseId = 'test-case-123';
      const statusUpdate = {
        status: 'in_review',
        userId: 'test-user'
      };

      const response = await request(app)
        .put(`/api/cases/${testCaseId}/status`)
        .send(statusUpdate)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'API endpoints not yet implemented',
        message: 'This endpoint will be available in future releases'
      });
    });

    it('should handle JSON request body', async () => {
      const statusUpdate = { status: 'approved' };

      const response = await request(app)
        .put('/api/cases/test-123/status')
        .send(statusUpdate)
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('POST /api/cases/:id/notes', () => {
    it('should add a note to an existing case', async () => {
      // First create a case
      const newCase = {
        applicationData: {
          applicantName: 'Test User',
          applicantEmail: 'test@example.com',
          applicationType: 'standard',
          submissionDate: new Date().toISOString(),
          documents: [],
          formData: {}
        }
      };

      const createResponse = await request(app)
        .post('/api/cases')
        .send(newCase)
        .expect(201);

      const caseId = createResponse.body.data.case.id;

      // Add a note to the case
      const newNote = {
        content: 'This is a test note'
      };

      const response = await request(app)
        .post(`/api/cases/${caseId}/notes`)
        .send(newNote)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          case: {
            id: caseId,
            applicationData: {
              applicantName: 'Test User',
              applicantEmail: 'test@example.com',
              applicationType: 'standard'
            },
            status: 'active',
            currentStep: 'received'
          }
        },
        message: 'Note added successfully'
      });
    });

    it('should validate note content', async () => {
      // First create a case
      const newCase = {
        applicationData: {
          applicantName: 'Test User',
          applicantEmail: 'test@example.com',
          applicationType: 'standard',
          submissionDate: new Date().toISOString(),
          documents: [],
          formData: {}
        }
      };

      const createResponse = await request(app)
        .post('/api/cases')
        .send(newCase)
        .expect(201);

      const caseId = createResponse.body.data.case.id;

      // Try to add an empty note
      const emptyNote = {
        content: ''
      };

      const response = await request(app)
        .post(`/api/cases/${caseId}/notes`)
        .send(emptyNote)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'INVALID_NOTE_CONTENT',
          message: 'Note content is required and must be a non-empty string'
        }
      });
    });

    it('should return 404 for non-existent case', async () => {
      const newNote = {
        content: 'This is a test note'
      };

      const response = await request(app)
        .post('/api/cases/non-existent-id/notes')
        .send(newNote)
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'CASE_NOT_FOUND',
          message: 'Case with ID non-existent-id not found'
        }
      });
    });
  });

  describe('GET /api/cases/:id/notes', () => {
    it('should retrieve notes for an existing case', async () => {
      // First create a case
      const newCase = {
        applicationData: {
          applicantName: 'Test User',
          applicantEmail: 'test@example.com',
          applicationType: 'standard',
          submissionDate: new Date().toISOString(),
          documents: [],
          formData: {}
        }
      };

      const createResponse = await request(app)
        .post('/api/cases')
        .send(newCase)
        .expect(201);

      const caseId = createResponse.body.data.case.id;

      // Add a note to the case
      const newNote = {
        content: 'This is a test note'
      };

      await request(app)
        .post(`/api/cases/${caseId}/notes`)
        .send(newNote)
        .expect(201);

      // Retrieve notes for the case
      const response = await request(app)
        .get(`/api/cases/${caseId}/notes`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          notes: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              caseId: caseId,
              content: 'This is a test note',
              createdBy: expect.any(String),
              createdAt: expect.any(String)
            })
          ])
        }
      });
    });

    it('should return empty array for case with no notes', async () => {
      // First create a case
      const newCase = {
        applicationData: {
          applicantName: 'Test User',
          applicantEmail: 'test@example.com',
          applicationType: 'standard',
          submissionDate: new Date().toISOString(),
          documents: [],
          formData: {}
        }
      };

      const createResponse = await request(app)
        .post('/api/cases')
        .send(newCase)
        .expect(201);

      const caseId = createResponse.body.data.case.id;

      // Retrieve notes for the case (should be empty)
      const response = await request(app)
        .get(`/api/cases/${caseId}/notes`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          notes: []
        }
      });
    });

    it('should return 404 for non-existent case', async () => {
      const response = await request(app)
        .get('/api/cases/non-existent-id/notes')
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'CASE_NOT_FOUND',
          message: 'Case with ID non-existent-id not found'
        }
      });
    });
  });

  describe('GET /api/cases/:id/ai-summary', () => {
    it('should return 404 for unimplemented endpoint', async () => {
      const testCaseId = 'test-case-123';

      const response = await request(app)
        .get(`/api/cases/${testCaseId}/ai-summary`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'API endpoints not yet implemented',
        message: 'This endpoint will be available in future releases'
      });
    });
  });

  describe('POST /api/cases/:id/ai-refresh', () => {
    it('should return 404 for unimplemented endpoint', async () => {
      const testCaseId = 'test-case-123';

      const response = await request(app)
        .post(`/api/cases/${testCaseId}/ai-refresh`)
        .send({})
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'API endpoints not yet implemented',
        message: 'This endpoint will be available in future releases'
      });
    });
  });

  describe('GET /api/cases/:id/audit', () => {
    it('should return 404 for unimplemented endpoint', async () => {
      const testCaseId = 'test-case-123';

      const response = await request(app)
        .get(`/api/cases/${testCaseId}/audit`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'API endpoints not yet implemented',
        message: 'This endpoint will be available in future releases'
      });
    });
  });

  describe('GET /api/cases', () => {
    it('should return 404 for unimplemented endpoint', async () => {
      const response = await request(app)
        .get('/api/cases')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'API endpoints not yet implemented',
        message: 'This endpoint will be available in future releases'
      });
    });

    it('should handle query parameters for pagination and filtering', async () => {
      const response = await request(app)
        .get('/api/cases?status=active&page=1&limit=10&sort=created_at&order=desc')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle search and filtering parameters', async () => {
      const response = await request(app)
        .get('/api/cases?search=john&applicationType=standard&dateFrom=2024-01-01&dateTo=2024-12-31')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/cases/:id/documents', () => {
    it('should return 404 for unimplemented endpoint', async () => {
      const testCaseId = 'test-case-123';

      const response = await request(app)
        .post(`/api/cases/${testCaseId}/documents`)
        .send({})
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'API endpoints not yet implemented',
        message: 'This endpoint will be available in future releases'
      });
    });

    it('should handle file upload parameters', async () => {
      const testCaseId = 'test-case-123';

      const response = await request(app)
        .post(`/api/cases/${testCaseId}/documents`)
        .field('documentType', 'application')
        .field('description', 'Test document')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should have correct response headers for file upload', async () => {
      const testCaseId = 'test-case-123';

      const response = await request(app)
        .post(`/api/cases/${testCaseId}/documents`)
        .send({})
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });
  });

  describe('Error Handling', () => {
    it('should handle large request bodies within limits', async () => {
      const largeData = {
        applicationData: {
          formData: {
            description: 'x'.repeat(1000) // 1KB of data
          }
        }
      };

      const response = await request(app)
        .post('/api/cases')
        .send(largeData)
        .expect(400); // Now expects validation error instead of 404

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .get(`/api/cases/test-${i}`)
          .expect(404) // This should still be 404 for non-existent cases
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body).toMatchObject({
          error: {
            code: 'CASE_NOT_FOUND'
          }
        });
      });
    });
  });

  describe('Response Time Requirements', () => {
    it('should respond to GET requests within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/cases/test-123')
        .expect(404); // This should still be 404 for non-existent case
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should respond to POST requests within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/cases')
        .send({ test: 'data' })
        .expect(400); // Now expects validation error instead of 404
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});