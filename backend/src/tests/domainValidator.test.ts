import DomainValidator from '../utils/domainValidator';

describe('DomainValidator', () => {
  describe('sanitizeDomain', () => {
    it('should remove protocol from domain', () => {
      expect(DomainValidator.sanitizeDomain('https://go3net.com')).toBe('go3net.com');
      expect(DomainValidator.sanitizeDomain('http://go3net.com')).toBe('go3net.com');
    });

    it('should remove port from domain', () => {
      expect(DomainValidator.sanitizeDomain('go3net.com:8080')).toBe('go3net.com');
      expect(DomainValidator.sanitizeDomain('localhost:3000')).toBe('localhost');
    });

    it('should convert to lowercase', () => {
      expect(DomainValidator.sanitizeDomain('GO3NET.COM')).toBe('go3net.com');
      expect(DomainValidator.sanitizeDomain('App.GO3NET.com')).toBe('app.go3net.com');
    });

    it('should trim whitespace', () => {
      expect(DomainValidator.sanitizeDomain('  go3net.com  ')).toBe('go3net.com');
    });
  });

  describe('isSubdomain', () => {
    it('should correctly identify subdomains', () => {
      expect(DomainValidator.isSubdomain('app.go3net.com', 'go3net.com')).toBe(true);
      expect(DomainValidator.isSubdomain('admin.go3net.com', 'go3net.com')).toBe(true);
      expect(DomainValidator.isSubdomain('api.go3net.com', 'go3net.com')).toBe(true);
    });

    it('should return true for exact domain match', () => {
      expect(DomainValidator.isSubdomain('go3net.com', 'go3net.com')).toBe(true);
    });

    it('should return false for non-subdomains', () => {
      expect(DomainValidator.isSubdomain('example.com', 'go3net.com')).toBe(false);
      expect(DomainValidator.isSubdomain('malicious-go3net.com', 'go3net.com')).toBe(false);
    });

    it('should handle protocol and port in domains', () => {
      expect(DomainValidator.isSubdomain('https://app.go3net.com', 'go3net.com')).toBe(true);
      expect(DomainValidator.isSubdomain('app.go3net.com:443', 'go3net.com')).toBe(true);
    });
  });

  describe('validateOrigin', () => {
    it('should validate go3net.com domains', () => {
      const result = DomainValidator.validateOrigin('https://go3net.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('go3net.com');
    });

    it('should validate go3net.com subdomains', () => {
      const result = DomainValidator.validateOrigin('https://app.go3net.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('go3net.com');
      expect(result.subdomain).toBe('app');
    });

    it('should validate www.go3net.com', () => {
      const result = DomainValidator.validateOrigin('https://www.go3net.com');
      expect(result.isValid).toBe(true);
    });

    it('should validate localhost for development', () => {
      const result = DomainValidator.validateOrigin('http://localhost:3000');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid domains', () => {
      const result = DomainValidator.validateOrigin('https://malicious.com');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Domain not in allowed list');
    });

    it('should handle empty origin', () => {
      const result = DomainValidator.validateOrigin('');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No origin provided');
    });

    it('should validate go3nethrm domains', () => {
      const result = DomainValidator.validateOrigin('https://go3nethrm.com');
      expect(result.isValid).toBe(true);
    });

    it('should validate vercel deployment', () => {
      const result = DomainValidator.validateOrigin('https://go3nethrm.vercel.app');
      expect(result.isValid).toBe(true);
    });
  });

  describe('isOriginAllowed', () => {
    it('should return true for allowed origins', () => {
      expect(DomainValidator.isOriginAllowed('https://go3net.com')).toBe(true);
      expect(DomainValidator.isOriginAllowed('https://app.go3net.com')).toBe(true);
      expect(DomainValidator.isOriginAllowed('https://go3nethrm.com')).toBe(true);
      expect(DomainValidator.isOriginAllowed('http://localhost:3000')).toBe(true);
    });

    it('should return false for disallowed origins', () => {
      expect(DomainValidator.isOriginAllowed('https://malicious.com')).toBe(false);
      expect(DomainValidator.isOriginAllowed('https://fake-go3net.com')).toBe(false);
    });
  });

  describe('getAllowedOrigins', () => {
    it('should return array of allowed origins', () => {
      const origins = DomainValidator.getAllowedOrigins();
      expect(Array.isArray(origins)).toBe(true);
      expect(origins.length).toBeGreaterThan(0);
    });

    it('should include go3net.com domains', () => {
      const origins = DomainValidator.getAllowedOrigins();
      expect(origins).toContain('https://go3net.com');
      expect(origins).toContain('https://www.go3net.com');
      expect(origins).toContain('https://app.go3net.com');
    });

    it('should include development domains', () => {
      const origins = DomainValidator.getAllowedOrigins();
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:5173');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed URLs gracefully', () => {
      const result = DomainValidator.validateOrigin('not-a-url');
      expect(result.isValid).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(DomainValidator.isOriginAllowed('')).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = DomainValidator.validateOrigin('HTTPS://GO3NET.COM');
      expect(result.isValid).toBe(true);
    });

    it('should handle deep subdomains', () => {
      const result = DomainValidator.validateOrigin('https://api.v1.go3net.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('go3net.com');
    });
  });
});