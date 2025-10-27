import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { LeaveController } from '../controllers/LeaveController';
import { LeaveService } from '../services/LeaveService';

const router = Router();

const leaveService = new LeaveService();
const leaveController = new LeaveController(leaveService);

router.post('/request', authenticateToken, (req, res) => leaveController.createLeaveRequest(req, res));
router.put('/:id/approve', authenticateToken, (req, res) => leaveController.approveLeaveRequest(req, res));
router.get('/pending', authenticateToken, (req, res) => leaveController.getPendingLeaveRequests(req, res));

export default router;