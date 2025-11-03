import { Router } from 'express';
import { domainController } from '../controllers/DomainController';

const router = Router();

// GET /api/domain/validate - Validate specific domain
router.get('/validate', (req, res) => domainController.validateDomain(req, res));

// GET /api/domain/cors-test - Test CORS configuration
router.get('/cors-test', (req, res) => domainController.testCors(req, res));

// OPTIONS /api/domain/cors-test - Handle preflight for CORS test
router.options('/cors-test', (req, res) => domainController.testCors(req, res));

// GET /api/domain/health - Domain configuration health check
router.get('/health', (req, res) => domainController.healthCheck(req, res));

// GET /api/domain/diagnostics - Comprehensive domain diagnostics
router.get('/diagnostics', (req, res) => domainController.diagnostics(req, res));

export default router;