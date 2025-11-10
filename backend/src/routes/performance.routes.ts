import { Router } from 'express';
import { PerformanceController } from '../controllers/PerformanceController';
import { authenticate } from '../middleware/auth';

const router = Router();
const performanceController = new PerformanceController();

// All routes require authentication
router.use(authenticate);

// Get my performance metrics
router.get('/my-performance', performanceController.getMyPerformance);

// Get all employees performance (admin/hr/teamlead only)
router.get('/all', performanceController.getAllPerformance);

// Get specific employee performance
router.get('/:employeeId', performanceController.getEmployeePerformance);

// Get historical metrics for an employee
router.get('/:employeeId/history', performanceController.getHistoricalMetrics);

export default router;
