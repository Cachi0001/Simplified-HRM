import { Request, Response } from 'express';
import { LeaveService } from '../services/LeaveService';
import logger from '../utils/logger';

export class LeaveController {
    constructor(private leaveService: LeaveService) {}

    /**
     * Create a new leave request
     * POST /api/leave/request
     */
    async createLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { type, start_date, end_date, reason, notes } = req.body;
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!employeeId || !type || !start_date || !end_date) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID, type, start_date, and end_date are required'
                });
                return;
            }

            logger.info('🏖️ [LeaveController] Create leave request', {
                employeeId,
                type,
                start_date,
                end_date
            });

            const leaveRequest = await this.leaveService.createLeaveRequest({
                employee_id: employeeId,
                type,
                start_date,
                end_date,
                reason,
                notes
            });

            res.status(201).json({
                status: 'success',
                message: 'Leave request created successfully',
                data: { leaveRequest }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Create leave request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get leave request by ID
     * GET /api/leave/:id
     */
    async getLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Leave request ID is required'
                });
                return;
            }

            const leaveRequest = await this.leaveService.getLeaveRequestById(id);

            if (!leaveRequest) {
                res.status(404).json({
                    status: 'error',
                    message: 'Leave request not found'
                });
                return;
            }

            res.status(200).json({
                status: 'success',
                data: { leaveRequest }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Get leave request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get employee's leave requests
     * GET /api/leave/my-requests
     */
    async getMyLeaveRequests(req: Request, res: Response): Promise<void> {
        try {
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID is required'
                });
                return;
            }

            const leaveRequests = await this.leaveService.getEmployeeLeaveRequests(employeeId);

            res.status(200).json({
                status: 'success',
                data: { leaveRequests, count: leaveRequests.length }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Get my leave requests error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get all leave requests (admin only)
     * GET /api/leave/all
     */
    async getAllLeaveRequests(req: Request, res: Response): Promise<void> {
        try {
            const { status } = req.query;
            const userRole = req.user?.role;

            // Check if user has permission to view all requests
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions'
                });
                return;
            }

            const leaveRequests = await this.leaveService.getAllLeaveRequests(status as string);

            res.status(200).json({
                status: 'success',
                data: { leaveRequests, count: leaveRequests.length }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Get all leave requests error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get pending leave requests (for approvers)
     * GET /api/leave/pending
     */
    async getPendingLeaveRequests(req: Request, res: Response): Promise<void> {
        try {
            const userRole = req.user?.role;

            // Check if user has permission to approve requests
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions'
                });
                return;
            }

            logger.info('📋 [LeaveController] Get pending leave requests', { userRole });

            const pendingRequests = await this.leaveService.getPendingLeaveRequests();

            res.status(200).json({
                status: 'success',
                data: { leaveRequests: pendingRequests, count: pendingRequests.length }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Get pending leave requests error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Approve a leave request
     * PUT /api/leave/:id/approve
     */
    async approveLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const approverId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !approverId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Leave request ID and approver ID are required'
                });
                return;
            }

            // Check if user has permission to approve
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to approve leave requests'
                });
                return;
            }

            logger.info('✅ [LeaveController] Approve leave request', { id, approverId });

            const approvedRequest = await this.leaveService.approveLeaveRequest(id, {
                approved_by: approverId,
                notes
            });

            res.status(200).json({
                status: 'success',
                message: 'Leave request approved successfully',
                data: { leaveRequest: approvedRequest }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Approve leave request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Reject a leave request
     * PUT /api/leave/:id/reject
     */
    async rejectLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { rejection_reason } = req.body;
            const approverId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !approverId || !rejection_reason) {
                res.status(400).json({
                    status: 'error',
                    message: 'Leave request ID, approver ID, and rejection reason are required'
                });
                return;
            }

            // Check if user has permission to reject
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to reject leave requests'
                });
                return;
            }

            logger.info('❌ [LeaveController] Reject leave request', { id, approverId });

            const rejectedRequest = await this.leaveService.rejectLeaveRequest(id, {
                approved_by: approverId,
                rejection_reason
            });

            res.status(200).json({
                status: 'success',
                message: 'Leave request rejected successfully',
                data: { leaveRequest: rejectedRequest }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Reject leave request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Cancel a leave request (by employee)
     * PUT /api/leave/:id/cancel
     */
    async cancelLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!id || !employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Leave request ID and employee ID are required'
                });
                return;
            }

            logger.info('🚫 [LeaveController] Cancel leave request', { id, employeeId });

            const cancelledRequest = await this.leaveService.cancelLeaveRequest(id, employeeId);

            res.status(200).json({
                status: 'success',
                message: 'Leave request cancelled successfully',
                data: { leaveRequest: cancelledRequest }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Cancel leave request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update a leave request (by employee, only if pending)
     * PUT /api/leave/:id
     */
    async updateLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { type, start_date, end_date, reason, notes } = req.body;
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!id || !employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Leave request ID and employee ID are required'
                });
                return;
            }

            logger.info('📝 [LeaveController] Update leave request', { id, employeeId });

            const updatedRequest = await this.leaveService.updateLeaveRequest(id, employeeId, {
                type,
                start_date,
                end_date,
                reason,
                notes
            });

            res.status(200).json({
                status: 'success',
                message: 'Leave request updated successfully',
                data: { leaveRequest: updatedRequest }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Update leave request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get leave statistics for an employee
     * GET /api/leave/stats
     */
    async getLeaveStats(req: Request, res: Response): Promise<void> {
        try {
            const employeeId = req.user?.employeeId || req.user?.id;
            const { year } = req.query;

            if (!employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID is required'
                });
                return;
            }

            const stats = await this.leaveService.getEmployeeLeaveStats(
                employeeId,
                year ? parseInt(year as string) : undefined
            );

            res.status(200).json({
                status: 'success',
                data: { stats }
            });
        } catch (error) {
            logger.error('❌ [LeaveController] Get leave stats error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }
}