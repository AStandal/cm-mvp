import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/index.js';

describe('API Tests - Health Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 status with health information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String)
      });

      // Validate timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should have correct response headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should include CORS headers for allowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('GET /version', () => {
    it('should return version information', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.body).toMatchObject({
        version: '1.0.0',
        name: 'AI Case Management API',
        environment: expect.any(String),
        timestamp: expect.any(String)
      });

      // Validate timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should have correct response headers', async () => {
      const response = await request(app)
        .get('/version')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/version')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});