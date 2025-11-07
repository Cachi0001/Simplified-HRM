import { Router } from 'express';
import { EmployeeController } from '../controllers/EmployeeController';
import { authenticate } from '../middleware/auth';

const router = Router();
const employeeController = new EmployeeController();

// All routes require authentication
router.use(authenticate);

// Get pending employees (for admin approval)
router.get('/pending', employeeController.getPendingEmployees);

// Get all employees (for management)
router.get('/management', employeeController.getAllEmployees);

// Get employees for task assignment
router.get('/for-tasks', employeeController.getActiveEmployees);

// Get my profile
router.get('/my-profile', employeeController.getMyProfile);

// Update my profile
router.put('/my-profile', employeeController.updateMyProfile);

// Update my working days
router.put('/my-working-days', employeeController.updateMyWorkingDays);

// Bulk update employees
router.post('/bulk-update', employeeController.bulkUpdateEmployees);

// Get employee by ID
router.get('/:id', employeeController.getEmployeeById);

// Approve employee
router.post('/:id/approve', employeeController.approveEmployee);

// Reject employee
router.post('/:id/reject', employeeController.rejectEmployee);

// Update working days
router.put('/:id/working-days', employeeController.updateWorkingDays);

export default router;
