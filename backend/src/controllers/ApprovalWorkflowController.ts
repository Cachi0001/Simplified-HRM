import { Request, Response } from 'express';
import ApprovalWorkflowService, { ApprovalAction, ApprovalDecision } from '../services/ApprovalWorkflowService';
import { RequestNotificationService } from '../services/RequestNotificationService';
import logger from '../utils/logger';

export class ApprovalWorkflowController {
    private requestNotificationService: RequestNotificationService;

    constructor() {
        this.requestNotificationService = new RequestNotificationService();
    }

    /**
     * Get approval workflow for a request
     * GET /api/approval-workflow/:requestType/:requestId
     */
    async getApprovalWorkflow(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId } = req.params;

            if (!requestType || !requestId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type and request ID are required'
                });
                return;
            }

            logger.info('🔄 [ApprovalWorkflowController] Get approval workflow', {
                requestType,
                requestId
            });

            const workflow = await ApprovalWorkflowService.getApprovalWorkflow(requestId);

            res.status(200).json({
                status: 'success',
                data: { workflow }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Get approval workflow error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Process approval step
     * POST /api/approval-workflow/:requestType/:requestId/approve
     */
    async processApproval(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId } = req.params;
            const { notes, decision } = req.body;
            const approverId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!requestType || !requestId || !approverId || !decision) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type, request ID, approver ID, and decision are required'
                });
                return;
            }

            // Check if user has permission to approve
            if (!['super-admin', 'admin', 'hr', 'manager'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to process approvals'
                });
                return;
            }

            logger.info('✅ [ApprovalWorkflowController] Process approval', {
                requestType,
                requestId,
                approverId,
                decision
            });

            const result = await ApprovalWorkflowService.processApprovalStep(
                requestId,
                decision,
                approverId,
                notes
            );

            // Send notification about status change
            await this.requestNotificationService.sendRequestStatusNotification(
                requestId,
                requestType as any,
                result.newStatus || decision,
                notes
            );

            res.status(200).json({
                status: 'success',
                message: `Request ${decision} successfully`,
                data: { 
                    workflow: result.workflow,
                    newStatus: result.newStatus,
                    isComplete: result.isComplete
                }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Process approval error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get pending approvals for current user
     * GET /api/approval-workflow/pending
     */
    async getPendingApprovals(req: Request, res: Response): Promise<void> {
        try {
            const approverId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!approverId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Approver ID is required'
                });
                return;
            }

            // Check if user has permission to view approvals
            if (!['super-admin', 'admin', 'hr', 'manager'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view pending approvals'
                });
                return;
            }

            logger.info('📋 [ApprovalWorkflowController] Get pending approvals', {
                approverId,
                userRole
            });

            const pendingApprovals = await ApprovalWorkflowService.getPendingApprovalsForUser(approverId);

            res.status(200).json({
                status: 'success',
                data: { 
                    pendingApprovals,
                    count: pendingApprovals.length
                }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Get pending approvals error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get approval history for a request
     * GET /api/approval-workflow/:requestType/:requestId/history
     */
    async getApprovalHistory(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId } = req.params;

            if (!requestType || !requestId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type and request ID are required'
                });
                return;
            }

            logger.info('📜 [ApprovalWorkflowController] Get approval history', {
                requestType,
                requestId
            });

            const history = await ApprovalWorkflowService.getApprovalHistory(requestId);

            res.status(200).json({
                status: 'success',
                data: { history }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Get approval history error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Delegate approval to another user
     * POST /api/approval-workflow/:requestType/:requestId/delegate
     */
    async delegateApproval(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId } = req.params;
            const { delegateToId, reason } = req.body;
            const approverId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!requestType || !requestId || !approverId || !delegateToId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type, request ID, approver ID, and delegate ID are required'
                });
                return;
            }

            // Check if user has permission to delegate
            if (!['super-admin', 'admin', 'hr', 'manager'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to delegate approvals'
                });
                return;
            }

            logger.info('🔄 [ApprovalWorkflowController] Delegate approval', {
                requestType,
                requestId,
                approverId,
                delegateToId
            });

            const result = await ApprovalWorkflowService.delegateApproval(
                requestId,
                delegateToId,
                approverId,
                reason
            );

            // Send notification about delegation
            await this.requestNotificationService.sendApprovalDelegationNotification(
                requestId,
                requestType as any,
                delegateToId,
                approverId
            );

            res.status(200).json({
                status: 'success',
                message: 'Approval delegated successfully',
                data: { workflow: result }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Delegate approval error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Escalate approval to higher authority
     * POST /api/approval-workflow/:requestType/:requestId/escalate
     */
    async escalateApproval(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId } = req.params;
            const { reason } = req.body;
            const escalatedBy = req.user?.employeeId || req.user?.id;

            if (!requestType || !requestId || !escalatedBy) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type, request ID, and escalator ID are required'
                });
                return;
            }

            logger.info('⬆️ [ApprovalWorkflowController] Escalate approval', {
                requestType,
                requestId,
                escalatedBy
            });

            const result = await ApprovalWorkflowService.escalateApproval(
                requestId,
                escalatedBy,
                reason
            );

            // Send notification about escalation
            await this.requestNotificationService.sendApprovalEscalationNotification(
                requestId,
                requestType as any,
                escalatedBy,
                reason
            );

            res.status(200).json({
                status: 'success',
                message: 'Approval escalated successfully',
                data: { workflow: result }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Escalate approval error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get approval workflow statistics
     * GET /api/approval-workflow/stats
     */
    async getApprovalStats(req: Request, res: Response): Promise<void> {
        try {
            const { startDate, endDate, requestType } = req.query;
            const userRole = req.user?.role;

            // Check if user has permission to view stats
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view approval statistics'
                });
                return;
            }

            logger.info('📊 [ApprovalWorkflowController] Get approval stats', {
                startDate,
                endDate,
                requestType
            });

            const stats = await ApprovalWorkflowService.getApprovalStatistics({
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                requestType: requestType as any
            });

            res.status(200).json({
                status: 'success',
                data: { stats }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Get approval stats error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Bulk approve multiple requests
     * POST /api/approval-workflow/bulk-approve
     */
    async bulkApprove(req: Request, res: Response): Promise<void> {
        try {
            const { requests, notes } = req.body;
            const approverId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!requests || !Array.isArray(requests) || requests.length === 0) {
                res.status(400).json({
                    status: 'error',
                    message: 'Requests array is required and must not be empty'
                });
                return;
            }

            // Check if user has permission to bulk approve
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions for bulk approval'
                });
                return;
            }

            logger.info('📦 [ApprovalWorkflowController] Bulk approve requests', {
                approverId,
                requestCount: requests.length
            });

            const results = await ApprovalWorkflowService.bulkProcessApprovals(
                requests.map((req: any) => ({
                    stepId: req.stepId,
                    decision: {
                        approverId,
                        action: 'approve' as ApprovalAction,
                        comments: notes
                    } as ApprovalDecision,
                    approverId,
                    comments: notes
                }))
            );

            // Send notifications for each approved request
            const successful = results.filter((r: any) => r.success);
            const failed = results.filter((r: any) => !r.success);

            for (const result of successful) {
                try {
                    await this.requestNotificationService.sendRequestStatusNotification(
                        result.stepId,
                        'leave', // Default type, should be dynamic
                        'approved',
                        notes
                    );
                } catch (notificationError) {
                    logger.error('❌ [ApprovalWorkflowController] Bulk approve notification error', {
                        stepId: result.stepId,
                        error: (notificationError as Error).message
                    });
                }
            }

            res.status(200).json({
                status: 'success',
                message: `Bulk approval completed: ${successful.length} approved, ${failed.length} failed`,
                data: { 
                    successful,
                    failed,
                    summary: {
                        totalRequests: requests.length,
                        successfulCount: successful.length,
                        failedCount: failed.length
                    }
                }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Bulk approve error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Set approval workflow configuration
     * POST /api/approval-workflow/config
     */
    async setWorkflowConfig(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, config } = req.body;
            const userRole = req.user?.role;

            if (!requestType || !config) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type and config are required'
                });
                return;
            }

            // Check if user has permission to configure workflows
            if (!['super-admin', 'admin'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to configure approval workflows'
                });
                return;
            }

            logger.info('⚙️ [ApprovalWorkflowController] Set workflow config', {
                requestType,
                userRole
            });

            await ApprovalWorkflowService.setWorkflowConfiguration(requestType, config);

            res.status(200).json({
                status: 'success',
                message: 'Workflow configuration updated successfully'
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Set workflow config error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get approval workflow configuration
     * GET /api/approval-workflow/config/:requestType
     */
    async getWorkflowConfig(req: Request, res: Response): Promise<void> {
        try {
            const { requestType } = req.params;
            const userRole = req.user?.role;

            if (!requestType) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type is required'
                });
                return;
            }

            // Check if user has permission to view workflow configs
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view workflow configuration'
                });
                return;
            }

            logger.info('⚙️ [ApprovalWorkflowController] Get workflow config', {
                requestType,
                userRole
            });

            const config = await ApprovalWorkflowService.getWorkflowConfiguration(requestType as any);

            res.status(200).json({
                status: 'success',
                data: { config }
            });
        } catch (error) {
            logger.error('❌ [ApprovalWorkflowController] Get workflow config error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }
}

export default new ApprovalWorkflowController();