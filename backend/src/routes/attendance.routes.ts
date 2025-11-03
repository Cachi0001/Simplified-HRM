import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { AttendanceController } from '../controllers/AttendanceController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const attendanceController = new AttendanceController();

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Attendance Management
 */
router.post('/check-in', (req, res) => attendanceController.checkIn(req, res));
router.post('/check-out', (req, res) => attendanceController.checkOut(req, res));
router.get('/current-status', (req, res) => attendanceController.getCurrentStatus(req, res));
router.get('/history', (req, res) => attendanceController.getAttendanceHistory(req, res));
router.get('/stats', (req, res) => attendanceController.getAttendanceStats(req, res));

export default router;