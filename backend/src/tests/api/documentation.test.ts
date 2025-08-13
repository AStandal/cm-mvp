import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/index.js';
import { setupDatabaseHooks, testDataHelpers } from './setup.js';

/**
 * API Behavior and Schema Tests
 * 
 * These tests validate the actual behavior of implemented API endpoints,
 * ensuring proper request/response schemas, error handling, and integration behavior.
 * Only tests endpoints that are actually implemented.
 */

describe('API Behavior and Schema Tests', () => {
  setupDatabaseHooks();
  describe('Implemented Endpoints', () => {
    it('should have working case management endpoints', async () => {
      // Create test data first
      const testCase = await testDataHelpers.createTestCase({
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicationType: 'standard'
      });

      const implementedEndpoints = [
        { method: 'GET', path: '/api/cases', expectedStatus: 200 },
        { method: 'POST', path: '/api/cases', expectedStatus: 201, body: {
          applicationData: {
            applicantName: 'New User',
            applicantEmail: 'new@example.com',
            applicationType: 'standard'
          }
        }},
        { method: 'GET', path: `/api/cases/${testCase.id}`, expectedStatus: 200 },
        { method: 'GET', path: `/api/cases/${testCase.id}/ai-summary`, expectedStatus: 200 },
        { method: 'POST', path: `/api/cases/${testCase.id}/ai-refresh`, expectedStatus: 200, body: {} },
        { method: 'GET', path: `/api/cases/${testCase.id}/notes`, expectedStatus: 200 },
        { method: 'POST', path: `/api/cases/${testCase.id}/notes`, expectedStatus: 201, body: {
          content: 'Test note',
          userId: 'test-user'
        }}
      ];

      for (const { method, path, expectedStatus, body } of implementedEndpoints) {
        let response;
        if (method === 'GET') {
          response = await request(app).get(path);
        } else if (method === 'POST') {
          response = await request(app).post(path).send(body || {});
        }

        expect(response.status).toBe(expectedStatus);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        
        if (expectedStatus < 400) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
        }
      }
    });

    it('should have working AI service endpoints', async () => {
      // Test the analyze-application endpoint which is working
      const response = await request(app)
        .post('/api/ai/analyze-application')
        .send({
          applicationData: {
            applicantName: 'Test User',
            applicantEmail: 'test@example.com',
            applicationType: 'standard'
          }
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('analysis');
    });
  });

  describe('Unimplemented Endpoints', () => {
    it('should return 404 for truly unimplemented endpoints', async () => {
      const unimplementedEndpoints = [
        '/api/models',
        '/api/models/current',
        '/api/evaluation/datasets',
        '/api/evaluation/run',
        '/api/auth/login',
        '/api/auth/profile',
        '/api/docs'
      ];

      for (const endpoint of unimplementedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(404);

        // Should return consistent error format for unimplemented endpoints
        expect(response.body).toMatchObject({
          error: 'API endpoints not yet implemented',
          message: 'This endpoint will be available in future releases'
        });

        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });
  });

  describe('HTTP Method Support', () => {
    it('should support correct HTTP methods for implemented endpoints', async () => {
      // Create test case for endpoints that need it
      const testCase = await testDataHelpers.createTestCase();

      const endpointMethods = [
        { endpoint: '/api/cases', methods: ['GET', 'POST'] },
        { endpoint: `/api/cases/${testCase.id}`, methods: ['GET'] },
        { endpoint: `/api/cases/${testCase.id}/notes`, methods: ['GET', 'POST'] },
        { endpoint: `/api/cases/${testCase.id}/ai-summary`, methods: ['GET'] },
        { endpoint: `/api/cases/${testCase.id}/ai-refresh`, methods: ['POST'] },
        { endpoint: '/api/ai/analyze-application', methods: ['POST'] },
        { endpoint: '/api/ai/validate-completeness', methods: ['POST'] },
        { endpoint: '/api/ai/detect-missing-fields', methods: ['POST'] }
      ];

      for (const { endpoint, methods } of endpointMethods) {
        for (const method of methods) {
          let response;
          const sampleBody = {
            applicationData: {
              applicantName: 'Test User',
              applicantEmail: 'test@example.com',
              applicationType: 'standard'
            }
          };

          if (method === 'GET') {
            response = await request(app).get(endpoint);
          } else if (method === 'POST') {
            response = await request(app).post(endpoint).send(
              endpoint.includes('/notes') ? { content: 'Test note', userId: 'test-user' } :
              endpoint.includes('/ai-refresh') ? {} :
              endpoint.includes('/cases') ? { applicationData: sampleBody.applicationData } :
              sampleBody
            );
          }
          
          // Should return success or client error, not method not allowed
          expect([200, 201, 400]).toContain(response.status);
          expect(response.status).not.toBe(405);
          
          // All responses should be JSON
          expect(response.headers['content-type']).toMatch(/application\/json/);
        }
      }
    });

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const endpoints = [
        '/api/cases',
        '/api/ai/analyze-application'
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

  describe('Request/Response Schema Validation', () => {
    it('should validate request schemas for implemented POST endpoints', async () => {
      // Create test case for endpoints that need it
      const testCase = await testDataHelpers.createTestCase();

      const postEndpoints = [
        {
          endpoint: '/api/cases',
          validBody: {
            applicationData: {
              applicantName: 'Test User',
              applicantEmail: 'test@example.com',
              applicationType: 'standard'
            }
          },
          expectedStatus: 201
        },
        {
          endpoint: `/api/cases/${testCase.id}/notes`,
          validBody: {
            content: 'Test note',
            userId: 'test-user'
          },
          expectedStatus: 201
        },
        {
          endpoint: '/api/ai/analyze-application',
          validBody: {
            applicationData: {
              applicantName: 'Test User',
              applicantEmail: 'test@example.com',
              applicationType: 'standard'
            }
          },
          expectedStatus: 200
        },


      ];

      for (const { endpoint, validBody, expectedStatus } of postEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send(validBody);

        expect(response.status).toBe(expectedStatus);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return consistent success response format', async () => {
      // Test that successful responses follow { success: true, data: {...} } format
      const testCase = await testDataHelpers.createTestCase();

      const successEndpoints = [
        { method: 'GET', path: '/api/cases' },
        { method: 'GET', path: `/api/cases/${testCase.id}` },
        { method: 'GET', path: '/health' },
        { method: 'GET', path: '/version' }
      ];

      for (const { method, path } of successEndpoints) {
        const response = await request(app).get(path);

        expect(response.status).toBeLessThan(400);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toBeDefined();
        expect(typeof response.body).toBe('object');

        // Most API endpoints should follow the success format
        if (path.startsWith('/api/')) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
        }
      }
    });

    it('should return consistent error response format', async () => {
      // Test validation errors
      const response = await request(app)
        .post('/api/cases')
        .send({ applicationData: { applicantName: '' } }); // Invalid data

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('API Integration Behavior', () => {
    it('should handle malformed JSON requests properly', async () => {
      const response = await request(app)
        .post('/api/cases')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect([400, 500]).toContain(response.status);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate request schemas correctly', async () => {
      // Test missing required fields
      const response = await request(app)
        .post('/api/cases')
        .send({
          applicationData: {
            // Missing required applicantName
            applicantEmail: 'test@example.com',
            applicationType: 'standard'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should handle missing required fields', async () => {
      // Test completely missing applicationData
      const response = await request(app)
        .post('/api/cases')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should include proper HTTP headers', async () => {
      const response = await request(app)
        .get('/api/cases')
        .set('Origin', 'http://localhost:3000');

      // Should include CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Health and System Endpoints', () => {
    it('should provide health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should provide version information', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('name');
    });

    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Content-Type Support', () => {
    it('should handle JSON content type properly', async () => {
      const testCase = await testDataHelpers.createTestCase();

      const response = await request(app)
        .post(`/api/cases/${testCase.id}/notes`)
        .set('Content-Type', 'application/json')
        .send({
          content: 'Test note',
          userId: 'test-user'
        });

      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return JSON responses for all endpoints', async () => {
      const endpoints = [
        '/health',
        '/version',
        '/api/cases'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);

        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toBeDefined();
        expect(typeof response.body).toBe('object');
      }
    });
  });
});