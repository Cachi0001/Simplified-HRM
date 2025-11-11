import { Router } from 'express';
import { LeaveController } from '../controllers/LeaveController';
import { authenticate } from '../middleware/auth';

const router = Router();
const leaveController = new LeaveController();

router.use(authenticate);

router.get('/', leaveController.getAllLeaveRequests);

router.get('/types', leaveController.getLeaveTypes);

router.get('/available-types', leaveController.getAvailableLeaveTypes);

router.post('/request', leaveController.createLeaveRequest);

router.get('/my-requests', leaveController.getMyLeaveRequests);

router.get('/my-balances', leaveController.getMyLeaveBalances);

router.get('/my-statistics', leaveController.getMyLeaveStatistics);

router.get('/requests', leaveController.getAllLeaveRequests);

router.get('/requests/:id', leaveController.getLeaveRequestById);

router.put('/requests/:id/approve', leaveController.approveLeaveRequest);
router.put('/:id/approve', leaveController.approveLeaveRequest);

router.put('/requests/:id/reject', leaveController.rejectLeaveRequest);
router.put('/:id/reject', leaveController.rejectLeaveRequest);

router.put('/requests/:id/cancel', leaveController.cancelLeaveRequest);

router.get('/balances/:employeeId', leaveController.getLeaveBalances);

router.delete('/requests/:id', leaveController.deleteLeaveRequest);

// Admin/HR/SuperAdmin only routes
router.post('/reset/:employeeId', leaveController.resetLeaveBalance);
router.post('/reset-all', leaveController.bulkResetLeaveBalances);

export default router;
