import { Request, Response } from 'express';
import { PurchaseService } from '../services/PurchaseService';
import logger from '../utils/logger';

export class PurchaseController {
    constructor(private purchaseService: PurchaseService) {}

    /**
     * Create a new purchase request
     * POST /api/purchase/request
     */
    async createPurchaseRequest(req: Request, res: Response): Promise<void> {
        try {
            const { 
                item_name, 
                description, 
                quantity, 
                unit_price, 
                vendor, 
                category, 
                urgency, 
                justification, 
                notes, 
                budget_code, 
                expected_delivery_date 
            } = req.body;
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!employeeId || !item_name || !unit_price) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID, item_name, and unit_price are required'
                });
                return;
            }

            logger.info('🛒 [PurchaseController] Create purchase request', {
                employeeId,
                item_name,
                unit_price,
                quantity: quantity || 1
            });

            const purchaseRequest = await this.purchaseService.createPurchaseRequest({
                employee_id: employeeId,
                item_name,
                description,
                quantity,
                unit_price,
                vendor,
                category,
                urgency,
                justification,
                notes,
                budget_code,
                expected_delivery_date
            });

            res.status(201).json({
                status: 'success',
                message: 'Purchase request created successfully',
                data: { purchaseRequest }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Create purchase request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get purchase request by ID
     * GET /api/purchase/:id
     */
    async getPurchaseRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Purchase request ID is required'
                });
                return;
            }

            const purchaseRequest = await this.purchaseService.getPurchaseRequestById(id);

            if (!purchaseRequest) {
                res.status(404).json({
                    status: 'error',
                    message: 'Purchase request not found'
                });
                return;
            }

            res.status(200).json({
                status: 'success',
                data: { purchaseRequest }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Get purchase request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get employee's purchase requests
     * GET /api/purchase/my-requests
     */
    async getMyPurchaseRequests(req: Request, res: Response): Promise<void> {
        try {
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID is required'
                });
                return;
            }

            const purchaseRequests = await this.purchaseService.getEmployeePurchaseRequests(employeeId);

            res.status(200).json({
                status: 'success',
                data: { purchaseRequests, count: purchaseRequests.length }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Get my purchase requests error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get all purchase requests (admin only)
     * GET /api/purchase/all
     */
    async getAllPurchaseRequests(req: Request, res: Response): Promise<void> {
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

            const purchaseRequests = await this.purchaseService.getAllPurchaseRequests(status as string);

            res.status(200).json({
                status: 'success',
                data: { purchaseRequests, count: purchaseRequests.length }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Get all purchase requests error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get pending purchase requests (for approvers)
     * GET /api/purchase/pending
     */
    async getPendingPurchaseRequests(req: Request, res: Response): Promise<void> {
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

            logger.info('📋 [PurchaseController] Get pending purchase requests', { userRole });

            const pendingRequests = await this.purchaseService.getPendingPurchaseRequests();

            res.status(200).json({
                status: 'success',
                data: { purchaseRequests: pendingRequests, count: pendingRequests.length }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Get pending purchase requests error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Approve a purchase request
     * PUT /api/purchase/:id/approve
     */
    async approvePurchaseRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { notes, budget_code } = req.body;
            const approverId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !approverId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Purchase request ID and approver ID are required'
                });
                return;
            }

            // Check if user has permission to approve
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to approve purchase requests'
                });
                return;
            }

            logger.info('✅ [PurchaseController] Approve purchase request', { id, approverId });

            const approvedRequest = await this.purchaseService.approvePurchaseRequest(id, {
                approved_by: approverId,
                notes,
                budget_code
            });

            res.status(200).json({
                status: 'success',
                message: 'Purchase request approved successfully',
                data: { purchaseRequest: approvedRequest }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Approve purchase request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Reject a purchase request
     * PUT /api/purchase/:id/reject
     */
    async rejectPurchaseRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { rejection_reason } = req.body;
            const approverId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !approverId || !rejection_reason) {
                res.status(400).json({
                    status: 'error',
                    message: 'Purchase request ID, approver ID, and rejection reason are required'
                });
                return;
            }

            // Check if user has permission to reject
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to reject purchase requests'
                });
                return;
            }

            logger.info('❌ [PurchaseController] Reject purchase request', { id, approverId });

            const rejectedRequest = await this.purchaseService.rejectPurchaseRequest(id, {
                approved_by: approverId,
                rejection_reason
            });

            res.status(200).json({
                status: 'success',
                message: 'Purchase request rejected successfully',
                data: { purchaseRequest: rejectedRequest }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Reject purchase request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Cancel a purchase request (by employee)
     * PUT /api/purchase/:id/cancel
     */
    async cancelPurchaseRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!id || !employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Purchase request ID and employee ID are required'
                });
                return;
            }

            logger.info('🚫 [PurchaseController] Cancel purchase request', { id, employeeId });

            const cancelledRequest = await this.purchaseService.cancelPurchaseRequest(id, employeeId);

            res.status(200).json({
                status: 'success',
                message: 'Purchase request cancelled successfully',
                data: { purchaseRequest: cancelledRequest }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Cancel purchase request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update a purchase request (by employee, only if pending)
     * PUT /api/purchase/:id
     */
    async updatePurchaseRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { 
                item_name, 
                description, 
                quantity, 
                unit_price, 
                vendor, 
                category, 
                urgency, 
                justification, 
                notes, 
                budget_code, 
                expected_delivery_date 
            } = req.body;
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!id || !employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Purchase request ID and employee ID are required'
                });
                return;
            }

            logger.info('📝 [PurchaseController] Update purchase request', { id, employeeId });

            const updatedRequest = await this.purchaseService.updatePurchaseRequest(id, employeeId, {
                item_name,
                description,
                quantity,
                unit_price,
                vendor,
                category,
                urgency,
                justification,
                notes,
                budget_code,
                expected_delivery_date
            });

            res.status(200).json({
                status: 'success',
                message: 'Purchase request updated successfully',
                data: { purchaseRequest: updatedRequest }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Update purchase request error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get purchase statistics for an employee
     * GET /api/purchase/stats
     */
    async getPurchaseStats(req: Request, res: Response): Promise<void> {
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

            const stats = await this.purchaseService.getEmployeePurchaseStats(
                employeeId,
                year ? parseInt(year as string) : undefined
            );

            res.status(200).json({
                status: 'success',
                data: { stats }
            });
        } catch (error) {
            logger.error('❌ [PurchaseController] Get purchase stats error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }
}