import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { LeaveController } from '../controllers/LeaveController';
import { LeaveService } from '../services/LeaveService';

const router = Router();

const leaveService = new LeaveService();
const leaveController = new LeaveController(leaveService);

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Employee Leave Request Management
 */
router.post('/request', (req, res) => leaveController.createLeaveRequest(req, res));
router.get('/my-requests', (req, res) => leaveController.getMyLeaveRequests(req, res));
router.get('/stats', (req, res) => leaveController.getLeaveStats(req, res));
router.get('/:id', (req, res) => leaveController.getLeaveRequest(req, res));
router.put('/:id', (req, res) => leaveController.updateLeaveRequest(req, res));
router.put('/:id/cancel', (req, res) => leaveController.cancelLeaveRequest(req, res));

/**
 * Admin/HR Leave Request Management
 */
router.get('/admin/all', (req, res) => leaveController.getAllLeaveRequests(req, res));
router.get('/admin/pending', (req, res) => leaveController.getPendingLeaveRequests(req, res));
router.put('/:id/approve', (req, res) => leaveController.approveLeaveRequest(req, res));
router.put('/:id/reject', (req, res) => leaveController.rejectLeaveRequest(req, res));

// Legacy route for backward compatibility
router.get('/pending', (req, res) => leaveController.getPendingLeaveRequests(req, res));

export default router;