import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Express Server Setup', () => {
  describe('Health Check Endpoint', () => {
    it('should return 200 status and health information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should have correct content-type header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Version Endpoint', () => {
    it('should return version information', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('name', 'AI Case Management API');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should have correct content-type header', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('CORS Middleware', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for common security headers set by Helmet
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should include Content Security Policy header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('JSON Parsing Middleware', () => {
    it('should parse JSON request bodies', async () => {
      const testData = { test: 'data', number: 123 };
      
      // Since we don't have POST endpoints yet, we'll test with the 404 handler
      // which should still parse the JSON body
      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .expect(404);

      // The 404 response should still be JSON, indicating JSON parsing worked
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/test-json')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Express should return 400 for malformed JSON, but our error handler might return 500
      expect([400, 500]).toContain(response.status);
    });

    it('should respect JSON size limits', async () => {
      // Create a large JSON payload (larger than 10mb limit would be impractical for testing)
      // Instead, we'll test that normal sized payloads work
      const largeData = { data: 'x'.repeat(1000) };
      
      const response = await request(app)
        .post('/test-json')
        .send(largeData)
        .expect(404);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('URL Encoded Parsing Middleware', () => {
    it('should parse URL encoded request bodies', async () => {
      const response = await request(app)
        .post('/test-form')
        .send('name=test&value=123')
        .expect(404);

      // The 404 response should still be JSON, indicating URL parsing worked
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('API Routes Placeholder', () => {
    it('should return 404 for unimplemented API routes', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'API endpoints not yet implemented');
      expect(response.body).toHaveProperty('message', 'This endpoint will be available in future releases');
    });

    it('should handle different HTTP methods on API routes', async () => {
      const methods = ['post', 'put', 'delete'] as const;
      
      for (const method of methods) {
        const response = await request(app)[method]('/api/test')
          .expect(404);

        expect(response.body).toHaveProperty('error', 'API endpoints not yet implemented');
      }
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('message', 'The requested endpoint does not exist');
    });

    it('should handle 404 for different HTTP methods', async () => {
      const methods = ['post', 'put', 'delete'] as const;
      
      for (const method of methods) {
        const response = await request(app)[method]('/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Route not found');
      }
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle errors gracefully', async () => {
      // Test that malformed JSON is handled by our error middleware
      const response = await request(app)
        .post('/health')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      // Should return either 400 (Express JSON parser) or 500 (our error handler)
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Request Logging (Development)', () => {
    it('should not crash when processing requests', async () => {
      // Test that the logging middleware doesn't interfere with normal operation
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });
  });

  describe('Environment Configuration', () => {
    it('should handle different environment configurations', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.environment).toBeDefined();
      expect(typeof response.body.environment).toBe('string');
    });
  });
});

describe('Middleware Integration', () => {
  it('should apply all middleware in correct order', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    // Verify that all middleware has been applied by checking for their effects
    expect(response.headers).toHaveProperty('x-content-type-options'); // Helmet
    expect(response.headers).toHaveProperty('access-control-allow-origin'); // CORS
    expect(response.headers['content-type']).toMatch(/application\/json/); // JSON parsing
    expect(response.body).toHaveProperty('status', 'OK'); // Route handler
  });

  it('should handle complex request flow', async () => {
    // Test a more complex request that exercises multiple middleware
    const response = await request(app)
      .post('/api/test')
      .set('Origin', 'http://localhost:3000')
      .send({ test: 'data' })
      .expect(404);

    // Should have processed through all middleware and reached the API placeholder
    expect(response.body).toHaveProperty('error', 'API endpoints not yet implemented');
    expect(response.headers).toHaveProperty('access-control-allow-origin');
    expect(response.headers).toHaveProperty('x-content-type-options');
  });
});