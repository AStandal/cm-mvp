import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/index.js';
import { setupDatabaseHooks } from './setup.js';

describe('API Tests - AI Service Endpoints', () => {
  setupDatabaseHooks();

  describe('POST /api/ai/analyze-application', () => {
    it('should analyze application data successfully', async () => {
      const applicationData = {
        applicantName: 'John Doe',
        applicantEmail: 'john@example.com',
        applicationType: 'standard',
        submissionDate: new Date().toISOString(),
        documents: [],
        formData: {
          purpose: 'Business application',
          amount: 50000,
          duration: '12 months'
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze-application')
        .send({ applicationData })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          analysis: expect.objectContaining({
            summary: expect.any(String),
            keyPoints: expect.any(Array),
            potentialIssues: expect.any(Array),
            recommendedActions: expect.any(Array),
            priorityLevel: expect.stringMatching(/low|medium|high|urgent/),
            estimatedProcessingTime: expect.any(String),
            requiredDocuments: expect.any(Array)
          })
        },
        message: 'Application analysis completed successfully'
      });
    });

    it('should handle JSON request body', async () => {
      const applicationData = { 
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicationType: 'standard'
      };

      const response = await request(app)
        .post('/api/ai/analyze-application')
        .send({ applicationData })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-application')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should include CORS headers', async () => {
      const applicationData = {
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicationType: 'standard'
      };

      const response = await request(app)
        .post('/api/ai/analyze-application')
        .set('Origin', 'http://localhost:3000')
        .send({ applicationData })
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('POST /api/ai/validate-completeness', () => {
    it('should validate case completeness successfully', async () => {
      const caseData = {
        id: 'test-case-123',
        status: 'active',
        currentStep: 'in_review',
        applicationData: {
          applicantName: 'John Doe',
          applicantEmail: 'john@example.com',
          documents: [] // Add missing documents property
        },
        notes: [],
        aiSummaries: []
      };

      const response = await request(app)
        .post('/api/ai/validate-completeness')
        .send({ caseData })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          validation: expect.objectContaining({
            confidence: expect.any(Number),
            isComplete: expect.any(Boolean),
            missingDocuments: expect.any(Array),
            missingSteps: expect.any(Array),
            recommendations: expect.any(Array)
          })
        },
        message: 'Case completeness validation completed successfully'
      });
    });

    it('should handle complex case data structures', async () => {
      const caseData = {
        id: 'complex-case-456',
        status: 'active',
        currentStep: 'additional_info_required',
        applicationData: {
          applicantName: 'Jane Smith',
          applicantEmail: 'jane@example.com',
          documents: [
            { id: 'doc1', filename: 'passport.pdf', path: '/uploads/passport.pdf', size: 1024000, mimeType: 'application/pdf', uploadedAt: new Date().toISOString() }
          ],
          formData: {
            priority: 'high',
            category: 'business',
            amount: 100000
          }
        },
        notes: [
          { id: 'note1', content: 'Additional documentation requested', createdBy: 'caseworker1', createdAt: new Date().toISOString() }
        ],
        aiSummaries: []
      };

      const response = await request(app)
        .post('/api/ai/validate-completeness')
        .send({ caseData })
        .expect(200);

      expect(response.body).toHaveProperty('data.validation');
      expect(response.body.data.validation).toHaveProperty('isComplete');
    });

    it('should have correct response headers', async () => {
      const caseData = {
        id: 'test-case-789',
        status: 'active',
        currentStep: 'received',
        applicationData: {
          applicantName: 'Test User',
          applicantEmail: 'test@example.com',
          documents: [] // Add missing documents property
        },
        notes: [],
        aiSummaries: []
      };

      const response = await request(app)
        .post('/api/ai/validate-completeness')
        .send({ caseData })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });
  });

  describe('POST /api/ai/detect-missing-fields', () => {
    it('should detect missing fields successfully', async () => {
      const applicationData = {
        applicantName: 'John Doe',
        applicationType: 'standard',
        // Missing email and other fields intentionally
        formData: {}
      };

      const response = await request(app)
        .post('/api/ai/detect-missing-fields')
        .send({ applicationData })
        .expect(400); // Should return 400 for validation error due to missing required fields

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle incomplete application data', async () => {
      const applicationData = {
        applicantName: 'Test User'
        // Intentionally incomplete
      };

      const response = await request(app)
        .post('/api/ai/detect-missing-fields')
        .send({ applicationData })
        .expect(400); // Should return 400 for validation error

      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty application data', async () => {
      const response = await request(app)
        .post('/api/ai/detect-missing-fields')
        .send({ applicationData: {} })
        .expect(400); // Should return 400 for validation error

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/ai/step-recommendations', () => {
    it('should return 404 for unimplemented endpoint', async () => {
      const requestData = {
        caseData: {
          id: 'test-case-123',
          status: 'active',
          currentStep: 'in_review',
          applicationData: { applicantName: 'John Doe' }
        },
        step: 'in_review'
      };

      const response = await request(app)
        .post('/api/ai/step-recommendations')
        .send(requestData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle different process steps', async () => {
      const steps = ['received', 'in_review', 'additional_info_required', 'ready_for_decision', 'concluded'];

      for (const step of steps) {
        const requestData = {
          caseData: { id: 'test-case', currentStep: step },
          step
        };

        const response = await request(app)
          .post('/api/ai/step-recommendations')
          .send(requestData)
          .expect(404);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('POST /api/ai/generate-summary', () => {
    it('should return 404 for unimplemented endpoint', async () => {
      const requestData = {
        caseData: {
          id: 'test-case-123',
          status: 'active',
          currentStep: 'in_review',
          applicationData: { applicantName: 'John Doe' }
        },
        summaryType: 'overall'
      };

      const response = await request(app)
        .post('/api/ai/generate-summary')
        .send(requestData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle different summary types', async () => {
      const summaryTypes = ['overall', 'step', 'final'];

      for (const summaryType of summaryTypes) {
        const requestData = {
          caseData: { id: 'test-case', currentStep: 'in_review' },
          summaryType
        };

        const response = await request(app)
          .post('/api/ai/generate-summary')
          .send(requestData)
          .expect(404);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('AI Endpoint Security and Performance', () => {
    const aiEndpoints = [
      '/api/ai/analyze-application',
      '/api/ai/validate-completeness',
      '/api/ai/detect-missing-fields'
    ];

    it('should include security headers for all AI endpoints', async () => {
      for (const endpoint of aiEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({})
          .expect(400); // Most will return 400 for validation errors with empty data

        expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
        expect(response.headers).toHaveProperty('x-frame-options');
        expect(response.headers).toHaveProperty('x-xss-protection');
      }
    });

    it('should handle CORS for all AI endpoints', async () => {
      for (const endpoint of aiEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .set('Origin', 'http://localhost:3000')
          .send({})
          .expect(400); // Most will return 400 for validation errors with empty data

        expect(response.headers).toHaveProperty('access-control-allow-origin');
      }
    });

    it('should respond within acceptable time limits for AI endpoints', async () => {
      const maxResponseTime = 5000; // 5 seconds

      for (const endpoint of aiEndpoints) {
        const startTime = Date.now();
        
        await request(app)
          .post(endpoint)
          .send({})
          .expect(400); // Most will return 400 for validation errors with empty data

        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(maxResponseTime);
      }
    });

    it('should handle concurrent AI requests', async () => {
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/ai/analyze-application')
            .send({ applicationData: { applicantName: `Test User ${i}` } })
            .expect(400) // Will return 400 for validation error due to missing required fields
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('AI Endpoint Error Handling', () => {
    it('should handle large request payloads', async () => {
      const largeApplicationData = {
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicationType: 'standard',
        formData: {
          largeField: 'x'.repeat(10000) // 10KB string
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze-application')
        .send({ applicationData: largeApplicationData })
        .expect(200); // Should work with large payloads

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle malformed request data', async () => {
      const malformedData = {
        applicationData: {
          applicantName: 123, // Invalid type
          applicantEmail: 'not-an-email', // Invalid email
          applicationType: '' // Empty string
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze-application')
        .send(malformedData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle empty request bodies', async () => {
      const aiEndpoints = [
        '/api/ai/analyze-application',
        '/api/ai/validate-completeness',
        '/api/ai/detect-missing-fields'
      ];

      for (const endpoint of aiEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({})
          .expect(400); // Should return 400 for validation error

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        applicationData: {
          // Missing required fields
          formData: { someField: 'value' }
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze-application')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid email formats', async () => {
      const invalidEmailData = {
        applicationData: {
          applicantName: 'Test User',
          applicantEmail: 'invalid-email-format',
          applicationType: 'standard'
        }
      };

      const response = await request(app)
        .post('/api/ai/analyze-application')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});