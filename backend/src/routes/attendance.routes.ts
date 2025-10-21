import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { AttendanceController } from '../controllers/AttendanceController';
import { AttendanceService } from '../services/AttendanceService';
import { SupabaseAttendanceRepository } from '../repositories/implementations/SupabaseAttendanceRepository';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
const attendanceRepository = new SupabaseAttendanceRepository(supabase);
const attendanceService = new AttendanceService(attendanceRepository);
const attendanceController = new AttendanceController(attendanceService);

router.use(authenticateToken);

router.post('/checkin', (req, res) => attendanceController.checkIn(req, res));
router.post('/checkout', (req, res) => attendanceController.checkOut(req, res));
router.get('/status', (req, res) => attendanceController.getCurrentStatus(req, res));
router.get('/history', (req, res) => attendanceController.getAttendanceHistory(req, res));

router.get('/employee/:employeeId', requireRole(['admin']), (req, res) => attendanceController.getEmployeeAttendance(req, res));
router.get('/report', requireRole(['admin']), (req, res) => attendanceController.getAttendanceReport(req, res));

export default router;
