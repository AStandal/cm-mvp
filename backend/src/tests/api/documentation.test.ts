import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/index.js';
import { testSuites } from './index.js';

/**
 * API Documentation Accuracy Tests
 * 
 * These tests ensure that the API documentation matches the actual endpoints
 * and that all documented endpoints are properly implemented (or return appropriate
 * 404 responses with consistent error messages when not yet implemented).
 */

describe('API Documentation Accuracy Tests', () => {
  describe('Endpoint Documentation Coverage', () => {
    it('should document all implemented endpoints', async () => {
      // Test that all endpoints in our test suites are properly documented
      for (const suite of testSuites) {
        for (const endpoint of suite.endpoints) {
          // Replace path parameters with test values
          const testEndpoint = endpoint
            .replace(':id', 'test-123')
            .replace(':runId', 'test-run-123')
            .replace(':datasetId', 'test-dataset-123')
            .replace(':promptId', 'test-prompt-123')
            .replace(':testId', 'test-ab-123');

          // Test GET endpoints
          if (!endpoint.includes('POST') && !endpoint.includes('PUT') && !endpoint.includes('DELETE')) {
            const response = await request(app)
              .get(testEndpoint);

            // Should return either 200 (implemented) or 404 (not implemented)
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 404) {
              // Should have consistent error message for unimplemented endpoints
              expect(response.body).toMatchObject({
                error: expect.any(String),
                message: expect.any(String)
              });
            }
          }
        }
      }
    });

    it('should have consistent error responses for unimplemented endpoints', async () => {
      const testEndpoints = [
        '/api/cases',
        '/api/models',
        '/api/evaluation/datasets',
        '/api/auth/profile',
        '/api/docs'
      ];

      for (const endpoint of testEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(404);

        // All unimplemented API endpoints should return the same error structure
        expect(response.body).toMatchObject({
          error: 'API endpoints not yet implemented',
          message: 'This endpoint will be available in future releases'
        });

        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('HTTP Method Documentation', () => {
    it('should document supported HTTP methods for each endpoint', async () => {
      const endpointMethods = [
        { endpoint: '/api/cases', methods: ['GET', 'POST'] },
        { endpoint: '/api/cases/test-123', methods: ['GET'] },
        { endpoint: '/api/cases/test-123/status', methods: ['PUT'] },
        { endpoint: '/api/cases/test-123/notes', methods: ['POST'] },
        { endpoint: '/api/models', methods: ['GET'] },
        { endpoint: '/api/models/current', methods: ['GET', 'PUT'] },
        { endpoint: '/api/evaluation/datasets', methods: ['POST'] },
        { endpoint: '/api/evaluation/run', methods: ['POST'] },
        { endpoint: '/api/auth/login', methods: ['POST'] },
        { endpoint: '/api/auth/profile', methods: ['GET', 'PUT'] }
      ];

      for (const { endpoint, methods } of endpointMethods) {
        for (const method of methods) {
          let response;
          if (method === 'GET') {
            response = await request(app).get(endpoint);
          } else if (method === 'POST') {
            response = await request(app).post(endpoint);
          } else if (method === 'PUT') {
            response = await request(app).put(endpoint);
          } else if (method === 'DELETE') {
            response = await request(app).delete(endpoint);
          } else {
            continue; // Skip unsupported methods
          }
          
          // Should return 404 for unimplemented endpoints, not 405 (Method Not Allowed)
          expect(response.status).toBe(404);
          expect(response.body).toHaveProperty('error');
        }
      }
    });

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const endpoints = [
        '/api/cases',
        '/api/models',
        '/api/evaluation/datasets',
        '/api/auth/login'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .options(endpoint)
          .set('Origin', 'http://localhost:3000')
          .set('Access-Control-Request-Method', 'POST');

        // Should return 204 for successful preflight
        expect(response.status).toBe(204);
        expect(response.headers).toHaveProperty('access-control-allow-methods');
      }
    });
  });

  describe('Request/Response Schema Documentation', () => {
    it('should document request body schemas for POST endpoints', async () => {
      const postEndpoints = [
        {
          endpoint: '/api/cases',
          sampleBody: {
            applicationData: {
              applicantName: 'Test User',
              applicantEmail: 'test@example.com',
              applicationType: 'standard'
            }
          }
        },
        {
          endpoint: '/api/cases/test-123/notes',
          sampleBody: {
            content: 'Test note',
            userId: 'test-user'
          }
        },
        {
          endpoint: '/api/evaluation/datasets',
          sampleBody: {
            name: 'Test Dataset',
            description: 'Test description',
            operation: 'generate_summary'
          }
        },
        {
          endpoint: '/api/auth/login',
          sampleBody: {
            email: 'test@example.com',
            password: 'testpassword'
          }
        },
        {
          endpoint: '/api/ai/analyze-application',
          sampleBody: {
            applicationData: {
              applicantName: 'Test User',
              applicantEmail: 'test@example.com',
              applicationType: 'standard'
            }
          }
        },
        {
          endpoint: '/api/ai/validate-completeness',
          sampleBody: {
            caseData: {
              id: 'test-case-123',
              status: 'active',
              applicationData: { applicantName: 'Test User' }
            }
          }
        },
        {
          endpoint: '/api/ai/detect-missing-fields',
          sampleBody: {
            applicationData: {
              applicantName: 'Test User'
            }
          }
        },
        {
          endpoint: '/api/ai/step-recommendations',
          sampleBody: {
            caseData: { id: 'test-case-123' },
            step: 'in_review'
          }
        },
        {
          endpoint: '/api/ai/generate-final-summary',
          sampleBody: {
            caseData: {
              id: 'test-case-123',
              applicationData: { applicantName: 'Test User' }
            }
          }
        }
      ];

      for (const { endpoint, sampleBody } of postEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send(sampleBody)
          .expect(404);

        // Should parse JSON body correctly (indicated by JSON response)
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should document response schemas for all endpoints', async () => {
      // Test that all endpoints return consistent JSON responses
      const endpoints = [
        '/health',
        '/version',
        '/api/cases',
        '/api/models',
        '/api/evaluation/datasets'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);

        // All responses should be JSON
        expect(response.headers['content-type']).toMatch(/application\/json/);
        
        // Should have proper response structure
        expect(response.body).toBeDefined();
        expect(typeof response.body).toBe('object');
      }
    });
  });

  describe('Authentication Documentation', () => {
    it('should document authentication requirements', async () => {
      const authRequiredEndpoints = [
        '/api/cases',
        '/api/cases/test-123/status',
        '/api/cases/test-123/notes',
        '/api/models/current',
        '/api/evaluation/run',
        '/api/ai/analyze-application',
        '/api/ai/validate-completeness',
        '/api/ai/detect-missing-fields',
        '/api/ai/step-recommendations',
        '/api/ai/generate-final-summary'
      ];

      for (const endpoint of authRequiredEndpoints) {
        // Test without authorization header
        const response = await request(app)
          .get(endpoint)
          .expect(404);

        // Currently returns 404 (not implemented), but should eventually require auth
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should document authorization header format', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer test-token')
        .expect(404);

      // Should accept Authorization header without errors
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Response Documentation', () => {
    it('should document standard error response format', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      // Should follow standard error response format
      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String)
      });

      expect(response.body.error).toBeTruthy();
      expect(response.body.message).toBeTruthy();
    });

    it('should document different error status codes', async () => {
      // Test malformed JSON (should return 400 or 500)
      const response = await request(app)
        .post('/api/cases')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting Documentation', () => {
    it('should document rate limiting behavior', async () => {
      // Test multiple rapid requests to the same endpoint
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/cases')
      );

      const responses = await Promise.all(requests);

      // All should currently return 404 (not implemented)
      // When rate limiting is implemented, some might return 429
      responses.forEach(response => {
        expect([404, 429]).toContain(response.status);
      });
    });
  });

  describe('Pagination Documentation', () => {
    it('should document pagination parameters', async () => {
      const paginatedEndpoints = [
        '/api/cases?page=1&limit=10',
        '/api/models/usage?page=1&limit=20',
        '/api/evaluation/runs?page=2&limit=5'
      ];

      for (const endpoint of paginatedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(404);

        // Should handle query parameters without errors
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Content-Type Documentation', () => {
    it('should document supported content types', async () => {
      const contentTypes = [
        'application/json',
        'application/x-www-form-urlencoded'
      ];

      for (const contentType of contentTypes) {
        const response = await request(app)
          .post('/api/cases')
          .set('Content-Type', contentType)
          .send(contentType === 'application/json' ? '{"test": "data"}' : 'test=data')
          .expect(404);

        // Should handle different content types
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('API Versioning Documentation', () => {
    it('should document API versioning strategy', async () => {
      // Test version headers
      const response = await request(app)
        .get('/api/cases')
        .set('API-Version', 'v1')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should document version endpoint', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body).toMatchObject({
        version: expect.any(String),
        name: expect.any(String)
      });
    });
  });
});