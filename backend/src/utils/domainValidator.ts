/**
 * Domain validation utility for CORS and security
 */

export interface DomainValidationResult {
  isValid: boolean;
  domain: string;
  subdomain?: string;
  reason?: string;
}

export class DomainValidator {
  private static readonly ALLOWED_BASE_DOMAINS = [
    'go3net.com',
    'go3net.vercel.app',
    'go3nethrm.com',
    'go3nethrm.vercel.app',
    'localhost'
  ];

  private static readonly ALLOWED_DEVELOPMENT_DOMAINS = [
    'localhost',
    '127.0.0.1'
  ];

  /**
   * Validate if an origin is allowed
   */
  static validateOrigin(origin: string): DomainValidationResult {
    if (!origin) {
      return {
        isValid: false,
        domain: '',
        reason: 'No origin provided'
      };
    }

    try {
      // Remove protocol and get clean domain
      const cleanDomain = this.sanitizeDomain(origin);

      // Special handling for localhost - always allow in development
      if (cleanDomain.includes('localhost') || cleanDomain.includes('127.0.0.1')) {
        return {
          isValid: true,
          domain: cleanDomain,
          reason: 'Development localhost domain'
        };
      }

      // Check for exact matches first
      if (this.isExactMatch(cleanDomain)) {
        return {
          isValid: true,
          domain: cleanDomain,
          reason: 'Exact domain match'
        };
      }

      // Check for subdomain matches
      const subdomainResult = this.checkSubdomain(cleanDomain);
      if (subdomainResult.isValid) {
        return subdomainResult;
      }

      // Check development domains
      if (this.isDevelopmentDomain(cleanDomain)) {
        return {
          isValid: true,
          domain: cleanDomain,
          reason: 'Development domain'
        };
      }

      return {
        isValid: false,
        domain: cleanDomain,
        reason: 'Domain not in allowed list'
      };

    } catch (error) {
      return {
        isValid: false,
        domain: origin,
        reason: `Invalid domain format: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if domain is a valid subdomain of allowed domains
   */
  static isSubdomain(domain: string, baseDomain: string): boolean {
    const cleanDomain = this.sanitizeDomain(domain);
    const cleanBase = this.sanitizeDomain(baseDomain);

    return cleanDomain.endsWith(`.${cleanBase}`) || cleanDomain === cleanBase;
  }

  /**
   * Sanitize domain by removing protocol and port
   */
  static sanitizeDomain(domain: string): string {
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/:\d+$/, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Check for exact domain matches
   */
  private static isExactMatch(domain: string): boolean {
    const exactMatches = [
      'go3net.com',
      'www.go3net.com',
      'go3net.vercel.app',
      'go3nethrm.com',
      'www.go3nethrm.com',
      'go3nethrm.vercel.app',
      'localhost',
      'localhost:5173',
      'localhost:3000',
      'localhost:8080',
      '127.0.0.1',
      '127.0.0.1:5173',
      '127.0.0.1:3000',
      '127.0.0.1:8080'
    ];

    return exactMatches.includes(domain);
  }

  /**
   * Check subdomain patterns
   */
  private static checkSubdomain(domain: string): DomainValidationResult {
    for (const baseDomain of this.ALLOWED_BASE_DOMAINS) {
      if (this.isSubdomain(domain, baseDomain)) {
        // Extract subdomain
        const subdomain = domain.replace(`.${baseDomain}`, '').replace(baseDomain, '');

        return {
          isValid: true,
          domain: baseDomain,
          subdomain: subdomain || undefined
        };
      }
    }

    return {
      isValid: false,
      domain,
      reason: 'Not a valid subdomain of allowed domains'
    };
  }

  /**
   * Check if domain is for development
   */
  private static isDevelopmentDomain(domain: string): boolean {
    // Handle localhost with ports (including the sanitized domain without protocol)
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      return true;
    }

    // Handle exact matches and port variations
    return this.ALLOWED_DEVELOPMENT_DOMAINS.some(devDomain =>
      domain === devDomain ||
      domain.startsWith(`${devDomain}:`) ||
      domain.endsWith(`:${devDomain}`)
    );
  }

  /**
   * Get all allowed origins for CORS configuration
   */
  static getAllowedOrigins(): string[] {
    const origins = [
      // Production domains
      'https://go3net.com',
      'https://www.go3net.com',
      'https://app.go3net.com',
      'https://admin.go3net.com',
      'https://api.go3net.com',
      'https://hr.go3net.com',
      'https://hrm.go3net.com',

      // Go3nethrm domains
      'https://go3nethrm.com',
      'https://www.go3nethrm.com',
      'https://go3nethrm.vercel.app',

      // Development domains
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];

    return origins;
  }

  /**
   * Check if origin should be allowed (main validation function)
   */
  static isOriginAllowed(origin: string): boolean {
    const result = this.validateOrigin(origin);
    return result.isValid;
  }

  /**
   * Get validation details for logging
   */
  static getValidationDetails(origin: string): DomainValidationResult {
    return this.validateOrigin(origin);
  }
}

export default DomainValidator;