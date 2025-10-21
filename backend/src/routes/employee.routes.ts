import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { EmployeeController } from '../controllers/EmployeeController';
import { EmployeeService } from '../services/EmployeeService';
import { SupabaseEmployeeRepository } from '../repositories/implementations/SupabaseEmployeeRepository';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
const employeeRepository = new SupabaseEmployeeRepository(supabase);
const employeeService = new EmployeeService(employeeRepository);
const employeeController = new EmployeeController(employeeService);


router.use(authenticateToken); 

router.post('/', requireRole(['admin']), (req, res) => employeeController.createEmployee(req, res));
router.get('/', (req, res) => employeeController.getAllEmployees(req, res));
router.get('/search', (req, res) => employeeController.searchEmployees(req, res));
router.get('/pending', requireRole(['admin']), (req, res) => employeeController.getPendingApprovals(req, res));
router.post('/:id/approve', requireRole(['admin']), (req, res) => employeeController.approveEmployee(req, res));
router.post('/:id/reject', requireRole(['admin']), (req, res) => employeeController.rejectEmployee(req, res));

export default router;
