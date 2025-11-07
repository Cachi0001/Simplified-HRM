import { Router } from 'express';
import { AttendanceController } from '../controllers/AttendanceController';
import { authenticate } from '../middleware/auth';

const router = Router();
const attendanceController = new AttendanceController();

router.use(authenticate);

router.post('/clock-in', attendanceController.clockIn);

router.post('/clock-out', attendanceController.clockOut);

router.get('/my-records', attendanceController.getMyRecords);

router.get('/today', attendanceController.getTodayStatus);

export default router;
