import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { SupabaseEmployeeRepository } from '../repositories/implementations/SupabaseEmployeeRepository';
import { EmployeeService } from '../services/EmployeeService';
import { EmployeeController } from '../controllers/EmployeeController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

const employeeRepository = new SupabaseEmployeeRepository();
const employeeService = new EmployeeService(employeeRepository);
const employeeController = new EmployeeController(employeeService);

router.use(authenticateToken);

// Static routes before dynamic routes - ORDER MATTERS!
router.get('/search', (req, res) => employeeController.searchEmployees(req, res));
router.get('/for-chat', (req, res) => employeeController.getEmployeesForChat(req, res));
router.get('/me', (req, res) => employeeController.getMyProfile(req, res));
router.put('/me', (req, res) => employeeController.updateMyProfile(req, res));
router.get('/pending', requireRole(['admin', 'hr', 'super-admin']), (req, res) => employeeController.getPendingApprovals(req, res));
router.get('/stats', requireRole(['admin', 'hr', 'super-admin']), (req, res) => employeeController.getEmployeeStats(req, res));
router.get('/approvals/history', requireRole(['admin', 'hr', 'super-admin']), (req, res) => employeeController.getApprovalHistory(req, res));

router.post('/', requireRole(['admin', 'super-admin']), (req, res) => employeeController.createEmployee(req, res));
router.get('/', (req, res) => employeeController.getAllEmployees(req, res));

// Dynamic routes
router.get('/:id', (req, res) => employeeController.getEmployeeById(req, res));
router.put('/:id', requireRole(['admin', 'hr', 'super-admin']), (req, res) => employeeController.updateEmployee(req, res));
router.delete('/:id', requireRole(['admin', 'super-admin']), (req, res) => employeeController.deleteEmployee(req, res));

// Approval endpoints with role assignment
router.post('/:id/approve-with-role', requireRole(['admin', 'hr', 'super-admin']), (req, res) => employeeController.approveEmployeeWithRole(req, res));
router.post('/:id/approve', requireRole(['admin', 'hr', 'super-admin']), (req, res) => employeeController.approveEmployee(req, res));
router.post('/:id/reject', requireRole(['admin', 'hr', 'super-admin']), (req, res) => employeeController.rejectEmployee(req, res));
router.post('/:id/update-role', requireRole(['admin', 'super-admin']), (req, res) => employeeController.updateRole(req, res));
router.post('/:id/department', requireRole(['admin', 'hr', 'super-admin']), (req, res) => employeeController.assignDepartment(req, res));

export default router;
