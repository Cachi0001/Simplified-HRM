import { Request, Response } from 'express';
import { RequestNotificationService } from '../services/RequestNotificationService';
import logger from '../utils/logger';

export class RequestNotificationController {
    private requestNotificationService: RequestNotificationService;

    constructor() {
        this.requestNotificationService = new RequestNotificationService();
    }

    /**
     * Send notification for request status change
     * POST /api/request-notifications/status-change
     */
    async sendStatusChangeNotification(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId, newStatus, changedBy } = req.body;

            if (!requestType || !requestId || !newStatus) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type, request ID, and new status are required'
                });
                return;
            }

            logger.info('📧 [RequestNotificationController] Send status change notification', {
                requestType,
                requestId,
                newStatus,
                changedBy
            });

            await this.requestNotificationService.sendRequestStatusNotification(
                requestType,
                requestId,
                newStatus,
                changedBy
            );

            res.status(200).json({
                status: 'success',
                message: 'Status change notification sent successfully'
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Send status change notification error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Send reminder notification for pending requests
     * POST /api/request-notifications/reminder
     */
    async sendReminderNotification(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId, reminderType } = req.body;

            if (!requestType || !requestId || !reminderType) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type, request ID, and reminder type are required'
                });
                return;
            }

            logger.info('⏰ [RequestNotificationController] Send reminder notification', {
                requestType,
                requestId,
                reminderType
            });

            await this.requestNotificationService.sendRequestReminder(
                requestType,
                requestId,
                reminderType
            );

            res.status(200).json({
                status: 'success',
                message: 'Reminder notification sent successfully'
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Send reminder notification error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Send approval delegation notification
     * POST /api/request-notifications/delegation
     */
    async sendDelegationNotification(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId, fromApproverId, toApproverId, reason } = req.body;

            if (!requestType || !requestId || !fromApproverId || !toApproverId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type, request ID, from approver ID, and to approver ID are required'
                });
                return;
            }

            logger.info('🔄 [RequestNotificationController] Send delegation notification', {
                requestType,
                requestId,
                fromApproverId,
                toApproverId
            });

            await this.requestNotificationService.sendApprovalDelegationNotification(
                requestType,
                requestId,
                fromApproverId,
                toApproverId,
                reason
            );

            res.status(200).json({
                status: 'success',
                message: 'Delegation notification sent successfully'
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Send delegation notification error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Send approval escalation notification
     * POST /api/request-notifications/escalation
     */
    async sendEscalationNotification(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId, escalatedBy, reason } = req.body;

            if (!requestType || !requestId || !escalatedBy) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type, request ID, and escalated by are required'
                });
                return;
            }

            logger.info('⬆️ [RequestNotificationController] Send escalation notification', {
                requestType,
                requestId,
                escalatedBy
            });

            await this.requestNotificationService.sendApprovalEscalationNotification(
                requestType,
                requestId,
                escalatedBy,
                reason
            );

            res.status(200).json({
                status: 'success',
                message: 'Escalation notification sent successfully'
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Send escalation notification error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Send bulk notifications for multiple requests
     * POST /api/request-notifications/bulk
     */
    async sendBulkNotifications(req: Request, res: Response): Promise<void> {
        try {
            const { notifications } = req.body;

            if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
                res.status(400).json({
                    status: 'error',
                    message: 'Notifications array is required and must not be empty'
                });
                return;
            }

            logger.info('📦 [RequestNotificationController] Send bulk notifications', {
                notificationCount: notifications.length
            });

            const results = await this.requestNotificationService.sendBulkNotifications(notifications);

            res.status(200).json({
                status: 'success',
                message: `Bulk notifications completed: ${results.successful} sent, ${results.failed} failed`,
                data: { 
                    successful: results.successful,
                    failed: results.failed,
                    total: notifications.length
                }
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Send bulk notifications error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get notification history for a request
     * GET /api/request-notifications/:requestType/:requestId/history
     */
    async getNotificationHistory(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, requestId } = req.params;

            if (!requestType || !requestId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type and request ID are required'
                });
                return;
            }

            logger.info('📜 [RequestNotificationController] Get notification history', {
                requestType,
                requestId
            });

            const history = await this.requestNotificationService.getNotificationHistory(
                requestType,
                requestId
            );

            res.status(200).json({
                status: 'success',
                data: { 
                    history,
                    count: history.length
                }
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Get notification history error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Configure notification preferences for request types
     * POST /api/request-notifications/preferences
     */
    async setNotificationPreferences(req: Request, res: Response): Promise<void> {
        try {
            const { requestType, preferences } = req.body;
            const userId = req.user?.employeeId || req.user?.id;

            if (!requestType || !preferences || !userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type, preferences, and user ID are required'
                });
                return;
            }

            logger.info('⚙️ [RequestNotificationController] Set notification preferences', {
                requestType,
                userId
            });

            await this.requestNotificationService.setNotificationPreferences(
                userId,
                requestType,
                preferences
            );

            res.status(200).json({
                status: 'success',
                message: 'Notification preferences updated successfully'
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Set notification preferences error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get notification preferences for request types
     * GET /api/request-notifications/preferences/:requestType
     */
    async getNotificationPreferences(req: Request, res: Response): Promise<void> {
        try {
            const { requestType } = req.params;
            const userId = req.user?.employeeId || req.user?.id;

            if (!requestType || !userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Request type and user ID are required'
                });
                return;
            }

            logger.info('⚙️ [RequestNotificationController] Get notification preferences', {
                requestType,
                userId
            });

            const preferences = await this.requestNotificationService.getNotificationPreferences(
                userId,
                requestType
            );

            res.status(200).json({
                status: 'success',
                data: { preferences }
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Get notification preferences error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Test notification delivery
     * POST /api/request-notifications/test
     */
    async testNotification(req: Request, res: Response): Promise<void> {
        try {
            const { notificationType, recipient, testData } = req.body;
            const userRole = req.user?.role;

            if (!notificationType || !recipient) {
                res.status(400).json({
                    status: 'error',
                    message: 'Notification type and recipient are required'
                });
                return;
            }

            // Check if user has permission to test notifications
            if (!['super-admin', 'admin'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to test notifications'
                });
                return;
            }

            logger.info('🧪 [RequestNotificationController] Test notification', {
                notificationType,
                recipient
            });

            await this.requestNotificationService.sendTestNotification(
                notificationType,
                recipient,
                testData
            );

            res.status(200).json({
                status: 'success',
                message: 'Test notification sent successfully'
            });
        } catch (error) {
            logger.error('❌ [RequestNotificationController] Test notification error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }
}

export default new RequestNotificationController();