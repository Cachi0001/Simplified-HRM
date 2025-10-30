import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { PerformanceAnalyticsController } from '../controllers/PerformanceAnalyticsController';
import { PerformanceAnalyticsService } from '../services/PerformanceAnalyticsService';

const router = Router();

const performanceService = new PerformanceAnalyticsService();
const performanceController = new PerformanceAnalyticsController(performanceService);

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Personal Performance Routes (for current user)
 */
router.get('/my-report', (req, res) => performanceController.getMyPerformanceReport(req, res));
router.get('/my-metrics', (req, res) => performanceController.getMyPerformanceMetrics(req, res));

/**
 * Employee Performance Routes (admin/hr access)
 */
router.get('/employee/:id/report', (req, res) => performanceController.getEmployeePerformanceReport(req, res));
router.get('/employee/:id/metrics', (req, res) => performanceController.getEmployeePerformanceMetrics(req, res));
router.post('/employee/:id/calculate', (req, res) => performanceController.calculateEmployeePerformance(req, res));

/**
 * Department Performance Routes (admin/hr access)
 */
router.get('/department/:id/summary', (req, res) => performanceController.getDepartmentPerformanceSummary(req, res));

/**
 * Organization Performance Routes (admin/hr access)
 */
router.get('/top-performers', (req, res) => performanceController.getTopPerformers(req, res));
router.post('/calculate-all', (req, res) => performanceController.calculateAllEmployeesPerformance(req, res));

export default router;