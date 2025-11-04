import { Router } from 'express';
import { PerformanceMetricsController } from '../controllers/PerformanceMetricsController';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/roleAuth';

const router = Router();
const performanceController = new PerformanceMetricsController();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Employee performance metrics routes
router.get('/employee/:employeeId', (req, res) => performanceController.getEmployeePerformance(req, res));
router.post('/employee/:employeeId/calculate', (req, res) => performanceController.calculateEmployeePerformance(req, res));
router.get('/employee/:employeeId/trends', (req, res) => performanceController.getEmployeePerformanceTrends(req, res));

// Performance summary and dashboard routes
router.get('/summary', (req, res) => performanceController.getPerformanceSummary(req, res));
router.post('/multiple', (req, res) => performanceController.getMultipleEmployeePerformance(req, res));

// Performance weights configuration
router.get('/weights', (req, res) => performanceController.getPerformanceWeights(req, res));
router.put('/weights/:weightId', (req, res) => performanceController.updatePerformanceWeight(req, res));

// Batch operations (admin only)
router.post('/recalculate-all', (req, res) => performanceController.recalculateAllPerformance(req, res));

export default router;