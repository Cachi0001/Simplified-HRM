import { Request, Response } from 'express';
import DomainValidator from '../utils/domainValidator';
import logger from '../utils/logger';

export class DomainController {
  /**
   * Validate domain configuration
   */
  async validateDomain(req: Request, res: Response): Promise<void> {
    try {
      const { origin } = req.query;
      
      if (!origin || typeof origin !== 'string') {
        res.status(400).json({
          status: 'error',
          message: 'Origin parameter is required'
        });
        return;
      }

      const validationResult = DomainValidator.getValidationDetails(origin);
      
      logger.info('Domain validation requested', {
        origin,
        result: validationResult,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        status: 'success',
        data: {
          origin,
          isValid: validationResult.isValid,
          domain: validationResult.domain,
          subdomain: validationResult.subdomain,
          reason: validationResult.reason,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Domain validation error', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        status: 'error',
        message: errorMessage
      });
    }
  }

  /**
   * Test CORS configuration for specific domain
   */
  async testCors(req: Request, res: Response): Promise<void> {
    try {
      const origin = req.headers.origin;
      const userAgent = req.headers['user-agent'];
      const referer = req.headers.referer;

      const validationResult = DomainValidator.getValidationDetails(origin || '');
      
      logger.info('CORS test requested', {
        origin,
        userAgent,
        referer,
        validationResult,
        timestamp: new Date().toISOString()
      });

      // Test if the current request would pass CORS validation
      const corsHeaders = {
        'Access-Control-Allow-Origin': validationResult.isValid ? (origin || '*') : 'null',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      };

      // Set CORS headers for this response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        res.header(key, value);
      });

      res.status(200).json({
        status: 'success',
        message: 'CORS test completed',
        data: {
          origin,
          corsAllowed: validationResult.isValid,
          validationResult,
          corsHeaders,
          requestHeaders: {
            origin,
            userAgent,
            referer,
            host: req.headers.host
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('CORS test error', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        status: 'error',
        message: errorMessage
      });
    }
  }

  /**
   * Get domain configuration health check
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const allowedOrigins = DomainValidator.getAllowedOrigins();
      const currentOrigin = req.headers.origin;
      const isCurrentOriginAllowed = DomainValidator.isOriginAllowed(currentOrigin || '');

      // Test key domains
      const domainTests = [
        'https://go3net.com',
        'https://www.go3net.com',
        'https://app.go3net.com',
        'https://admin.go3net.com',
        'https://go3nethrm.com',
        'https://go3nethrm.vercel.app'
      ].map(domain => ({
        domain,
        validation: DomainValidator.getValidationDetails(domain)
      }));

      logger.info('Domain health check requested', {
        currentOrigin,
        isCurrentOriginAllowed,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        status: 'success',
        message: 'Domain configuration health check',
        data: {
          currentOrigin,
          isCurrentOriginAllowed,
          allowedOrigins,
          domainTests,
          configuration: {
            totalAllowedOrigins: allowedOrigins.length,
            go3netSupported: allowedOrigins.some(origin => origin.includes('go3net.com')),
            subdomainSupport: true,
            httpsRequired: true
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Domain health check error', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        status: 'error',
        message: errorMessage
      });
    }
  }

  /**
   * Get comprehensive domain diagnostics
   */
  async diagnostics(req: Request, res: Response): Promise<void> {
    try {
      const origin = req.headers.origin;
      const host = req.headers.host;
      const userAgent = req.headers['user-agent'];
      const referer = req.headers.referer;
      const forwardedFor = req.headers['x-forwarded-for'];

      // Environment information
      const environment = {
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        frontendUrl: process.env.FRONTEND_URL,
        frontendUrlProd: process.env.FRONTEND_URL_PROD,
        frontendUrlCustom: process.env.FRONTEND_URL_CUSTOM,
        additionalCorsOrigins: process.env.ADDITIONAL_CORS_ORIGINS
      };

      // Domain validation for current request
      const currentValidation = DomainValidator.getValidationDetails(origin || '');

      // Test all configured domains
      const allOrigins = DomainValidator.getAllowedOrigins();
      const domainValidations = allOrigins.map(testOrigin => ({
        origin: testOrigin,
        validation: DomainValidator.getValidationDetails(testOrigin)
      }));

      logger.info('Domain diagnostics requested', {
        origin,
        host,
        currentValidation,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        status: 'success',
        message: 'Domain diagnostics report',
        data: {
          request: {
            origin,
            host,
            userAgent,
            referer,
            forwardedFor,
            method: req.method,
            url: req.originalUrl
          },
          currentValidation,
          environment,
          domainValidations,
          summary: {
            totalConfiguredOrigins: allOrigins.length,
            currentOriginAllowed: currentValidation.isValid,
            go3netDomainsConfigured: allOrigins.filter(o => o.includes('go3net.com')).length,
            httpsOrigins: allOrigins.filter(o => o.startsWith('https')).length,
            httpOrigins: allOrigins.filter(o => o.startsWith('http:')).length
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Domain diagnostics error', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json({
        status: 'error',
        message: errorMessage
      });
    }
  }
}

export const domainController = new DomainController();