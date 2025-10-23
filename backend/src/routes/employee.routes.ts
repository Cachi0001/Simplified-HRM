import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { MongoEmployeeRepository } from '../repositories/implementations/MongoEmployeeRepository';
import { EmployeeService } from '../services/EmployeeService';
import { EmployeeController } from '../controllers/EmployeeController';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

const employeeRepository = new MongoEmployeeRepository();
const employeeService = new EmployeeService(employeeRepository);
const employeeController = new EmployeeController(employeeService);

router.use(authenticateToken);

router.post('/', requireRole(['admin']), (req, res) => employeeController.createEmployee(req, res));
router.get('/', (req, res) => employeeController.getAllEmployees(req, res));
router.get('/search', (req, res) => employeeController.searchEmployees(req, res));
router.get('/me', (req, res) => employeeController.getMyProfile(req, res));
router.put('/me', (req, res) => employeeController.updateMyProfile(req, res));
router.get('/pending', requireRole(['admin']), (req, res) => employeeController.getPendingApprovals(req, res));
router.get('/stats', requireRole(['admin']), (req, res) => employeeController.getEmployeeStats(req, res));
router.get('/:id', (req, res) => employeeController.getEmployeeById(req, res));
router.put('/:id', (req, res) => employeeController.updateEmployee(req, res));
router.delete('/:id', requireRole(['admin']), (req, res) => employeeController.deleteEmployee(req, res));
router.post('/:id/approve', requireRole(['admin']), (req, res) => employeeController.approveEmployee(req, res));
router.post('/:id/reject', requireRole(['admin']), (req, res) => employeeController.rejectEmployee(req, res));
router.post('/:id/department', requireRole(['admin']), (req, res) => employeeController.assignDepartment(req, res));

export default router;
