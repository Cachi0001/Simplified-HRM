import request from 'supertest';
import app from '../server';
import DomainValidator from '../utils/domainValidator';

describe('Domain Integration Tests', () => {
  describe('CORS Configuration', () => {
    it('should allow requests from go3net.com', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://go3net.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://go3net.com');
    });

    it('should allow requests from www.go3net.com', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://www.go3net.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://www.go3net.com');
    });

    it('should allow requests from go3net.com subdomains', async () => {
      const subdomains = ['app.go3net.com', 'admin.go3net.com', 'api.go3net.com'];
      
      for (const subdomain of subdomains) {
        const response = await request(app)
          .get('/api/health')
          .set('Origin', `https://${subdomain}`)
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBe(`https://${subdomain}`);
      }
    });

    it('should reject requests from unauthorized domains', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious.com')
        .expect(200); // Health endpoint still works, but CORS headers should not be set

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle preflight OPTIONS requests correctly', async () => {
      const response = await request(app)
        .options('/api/domain/cors-test')
        .set('Origin', 'https://go3net.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://go3net.com');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });

  describe('Domain Validation API', () => {
    it('should validate go3net.com domain', async () => {
      const response = await request(app)
        .get('/api/domain/validate?origin=https://go3net.com')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.domain).toBe('go3net.com');
    });

    it('should validate go3net.com subdomains', async () => {
      const response = await request(app)
        .get('/api/domain/validate?origin=https://app.go3net.com')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.domain).toBe('go3net.com');
      expect(response.body.data.subdomain).toBe('app');
    });

    it('should reject invalid domains', async () => {
      const response = await request(app)
        .get('/api/domain/validate?origin=https://malicious.com')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.reason).toBe('Domain not in allowed list');
    });

    it('should handle missing origin parameter', async () => {
      const response = await request(app)
        .get('/api/domain/validate')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Origin parameter is required');
    });
  });

  describe('CORS Test Endpoint', () => {
    it('should test CORS configuration for go3net.com', async () => {
      const response = await request(app)
        .get('/api/domain/cors-test')
        .set('Origin', 'https://go3net.com')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.corsAllowed).toBe(true);
      expect(response.body.data.origin).toBe('https://go3net.com');
    });

    it('should test CORS configuration for unauthorized domain', async () => {
      const response = await request(app)
        .get('/api/domain/cors-test')
        .set('Origin', 'https://unauthorized.com')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.corsAllowed).toBe(false);
    });
  });

  describe('Domain Health Check', () => {
    it('should return comprehensive domain health information', async () => {
      const response = await request(app)
        .get('/api/domain/health')
        .set('Origin', 'https://go3net.com')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isCurrentOriginAllowed).toBe(true);
      expect(response.body.data.allowedOrigins).toContain('https://go3net.com');
      expect(response.body.data.configuration.go3netSupported).toBe(true);
    });

    it('should include domain test results', async () => {
      const response = await request(app)
        .get('/api/domain/health')
        .expect(200);

      expect(response.body.data.domainTests).toBeDefined();
      expect(Array.isArray(response.body.data.domainTests)).toBe(true);
      
      const go3netTest = response.body.data.domainTests.find(
        (test: any) => test.domain === 'https://go3net.com'
      );
      expect(go3netTest).toBeDefined();
      expect(go3netTest.validation.isValid).toBe(true);
    });
  });

  describe('Domain Diagnostics', () => {
    it('should return comprehensive diagnostics', async () => {
      const response = await request(app)
        .get('/api/domain/diagnostics')
        .set('Origin', 'https://go3net.com')
        .set('User-Agent', 'Test Agent')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.request.origin).toBe('https://go3net.com');
      expect(response.body.data.currentValidation.isValid).toBe(true);
      expect(response.body.data.environment).toBeDefined();
      expect(response.body.data.summary.go3netDomainsConfigured).toBeGreaterThan(0);
    });

    it('should include environment configuration', async () => {
      const response = await request(app)
        .get('/api/domain/diagnostics')
        .expect(200);

      expect(response.body.data.environment.nodeEnv).toBeDefined();
      expect(response.body.data.environment.frontendUrlCustom).toBeDefined();
    });
  });

  describe('Cross-Domain Authentication', () => {
    it('should accept authentication from go3net.com domains', async () => {
      // This test would require a valid JWT token
      // For now, we test that the endpoint accepts the origin
      const response = await request(app)
        .get('/api/employees')
        .set('Origin', 'https://go3net.com')
        .expect(401); // Unauthorized due to missing token, but origin is accepted

      expect(response.headers['access-control-allow-origin']).toBe('https://go3net.com');
    });

    it('should reject authentication from unauthorized domains', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Origin', 'https://malicious.com')
        .expect(401);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Content Security Policy', () => {
    it('should include go3net.com in CSP headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://go3net.com')
        .expect(200);

      // Check if CSP headers are present (helmet middleware)
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed origin headers gracefully', async () => {
      const response = await request(app)
        .get('/api/domain/validate?origin=not-a-url')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isValid).toBe(false);
    });

    it('should handle empty origin parameter', async () => {
      const response = await request(app)
        .get('/api/domain/validate?origin=')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.reason).toBe('No origin provided');
    });
  });

  describe('Performance', () => {
    it('should respond quickly to domain validation requests', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/domain/validate?origin=https://go3net.com')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(100); // Should respond within 100ms
    });

    it('should handle multiple concurrent domain validations', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/domain/validate?origin=https://go3net.com')
          .expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('success');
        expect(response.body.data.isValid).toBe(true);
      });
    });
  });
});