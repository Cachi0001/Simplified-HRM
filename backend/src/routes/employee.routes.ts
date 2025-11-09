import { Router } from 'express';
import { EmployeeController } from '../controllers/EmployeeController';
import { authenticate } from '../middleware/auth';

const router = Router();
const employeeController = new EmployeeController();

// All routes require authentication
router.use(authenticate);

// Get pending employees (for admin approval)
router.get('/pending', employeeController.getPendingEmployees);

// Get all employees (alias for management - for backward compatibility)
router.get('/', employeeController.getAllEmployees);

// Get all employees (for management)
router.get('/management', employeeController.getAllEmployees);

// Get employees for task assignment
router.get('/for-tasks', employeeController.getActiveEmployees);

// Get my profile
router.get('/my-profile', employeeController.getMyProfile);
router.get('/me', employeeController.getMyProfile);

// Update my profile
router.put('/my-profile', employeeController.updateMyProfile);
router.put('/me', employeeController.updateMyProfile);

// Update my working days
router.get('/me/working-days', employeeController.getMyWorkingDays);
router.put('/me/working-days', employeeController.updateMyWorkingDays);

// Bulk update employees
router.post('/bulk-update', employeeController.bulkUpdateEmployees);

// Get employee stats (must be before /:id route)
router.get('/stats', employeeController.getEmployeeStats);

// Approve employee (must be before /:id routes)
router.post('/:id/approve', employeeController.approveEmployee);
router.post('/:id/approve-with-role', employeeController.approveEmployee);

// Reject employee (must be before /:id routes)
router.post('/:id/reject', employeeController.rejectEmployee);

// Update working days (must be before /:id routes)
router.put('/:id/working-days', employeeController.updateWorkingDays);

// Update employee status (must be before /:id routes)
router.put('/:id/status', employeeController.updateEmployeeStatus);

// Update employee fields (must be before /:id routes)
router.put('/:id/fields', employeeController.updateEmployeeFields);

// Get employee by ID (must be LAST among /:id routes)
router.get('/:id', employeeController.getEmployeeById);

export default router;
