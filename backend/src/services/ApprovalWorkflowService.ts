import { Pool } from 'pg';
import logger from '../utils/logger';
import { canApproveRequest, determineApprovalLevel } from '../middleware/approvalValidation';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';

export interface ApprovalAction {
    request_id: string;
    request_type: 'leave' | 'purchase';
    action: 'submitted' | 'approved' | 'rejected' | 'cancelled';
    action_by: string;
    action_by_role: string;
    comments?: string;
    previous_status?: string;
    new_status?: string;
}

export interface ApprovalDecision {
    approved_by?: string;
    rejected_by?: string;
    approval_comments?: string;
    rejection_reason?: string;
}

export class ApprovalWorkflowService {
    constructor(
        private db: Pool,
        private notificationService: NotificationService,
        private emailService: EmailService
    ) {}

    /**
     * Process approval for leave or purchase request
     */
    async processApproval(
        requestId: string,
        requestType: 'leave' | 'purchase',
        approverId: string,
        approverRole: string,
        decision: ApprovalDecision
    ): Promise<any> {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');

            // Get the request and requester information
            const requestQuery = requestType === 'leave' 
                ? `SELECT lr.*, e.role as requester_role, e.full_name as requester_name, e.user_id as requester_user_id
                   FROM leave_requests lr 
                   JOIN employees e ON lr.employee_id = e.id 
                   WHERE lr.id = $1`
                : `SELECT pr.*, e.role as requester_role, e.full_name as requester_name, e.user_id as requester_user_id
                   FROM purchase_requests pr 
                   JOIN employees e ON pr.employee_id = e.id 
                   WHERE pr.id = $1`;

            const requestResult = await client.query(requestQuery, [requestId]);
            
            if (requestResult.rows.length === 0) {
                throw new Error(`${requestType} request not found`);
            }

            const request = requestResult.rows[0];
            const requesterRole = request.requester_role;

            // Validate approval permissions
            const approvalValidation = canApproveRequest(approverRole, requesterRole);
            if (!approvalValidation.canApprove) {
                throw new Error(approvalValidation.reason || 'Cannot approve this request');
            }

            // Check if request is in pending status
            if (request.status !== 'pending') {
                throw new Error(`Cannot approve ${requestType} request with status: ${request.status}`);
            }

            // Determine if this is approval or rejection
            const isApproval = decision.approved_by && !decision.rejected_by;
            const newStatus = isApproval ? 'approved' : 'rejected';

            // Update the request
            const updateQuery = requestType === 'leave'
                ? `UPDATE leave_requests 
                   SET status = $1, 
                       ${isApproval ? 'approved_by = $2, approved_at = NOW(), approval_comments = $3' : 'rejected_by = $2, rejected_at = NOW(), rejection_reason = $3'}
                   WHERE id = $4 
                   RETURNING *`
                : `UPDATE purchase_requests 
                   SET status = $1, 
                       ${isApproval ? 'approved_by = $2, approved_at = NOW(), approval_comments = $3' : 'rejected_by = $2, rejected_at = NOW(), rejection_reason = $3'}
                   WHERE id = $4 
                   RETURNING *`;

            const updateParams = [
                newStatus,
                approverId,
                isApproval ? decision.approval_comments : decision.rejection_reason,
                requestId
            ];

            const updateResult = await client.query(updateQuery, updateParams);
            const updatedRequest = updateResult.rows[0];

            // Log the approval action
            await this.logApprovalAction(client, {
                request_id: requestId,
                request_type: requestType,
                action: isApproval ? 'approved' : 'rejected',
                action_by: approverId,
                action_by_role: approverRole,
                comments: isApproval ? decision.approval_comments : decision.rejection_reason,
                previous_status: 'pending',
                new_status: newStatus
            });

            await client.query('COMMIT');

            // Send notifications asynchronously
            this.sendApprovalNotifications(
                updatedRequest,
                requestType,
                isApproval,
                approverRole,
                request.requester_user_id,
                request.requester_name
            ).catch(error => {
                logger.error('❌ [ApprovalWorkflow] Notification error', { error: error.message });
            });

            logger.info(`✅ [ApprovalWorkflow] ${requestType} request ${isApproval ? 'approved' : 'rejected'}`, {
                requestId,
                approverId,
                approverRole,
                requesterRole
            });

            return updatedRequest;

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('❌ [ApprovalWorkflow] Process approval error', {
                error: (error as Error).message,
                requestId,
                requestType
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get pending requests for a specific approver role
     */
    async getPendingRequestsForApprover(approverRole: string, requestType?: 'leave' | 'purchase'): Promise<any[]> {
        try {
            let query = '';
            let params: any[] = [];

            if (!requestType || requestType === 'leave') {
                const leaveQuery = `
                    SELECT 
                        'leave' as request_type,
                        lr.*,
                        e.full_name as requester_name,
                        e.role as requester_role,
                        e.department
                    FROM leave_requests lr
                    JOIN employees e ON lr.employee_id = e.id
                    WHERE lr.status = 'pending'
                    AND (
                        (lr.approval_level = 'hr_admin' AND $1 IN ('hr', 'admin', 'superadmin'))
                        OR (lr.approval_level = 'superadmin_only' AND $1 = 'superadmin')
                    )
                    ORDER BY lr.created_at ASC
                `;
                
                if (requestType === 'leave') {
                    query = leaveQuery;
                    params = [approverRole];
                } else {
                    query += leaveQuery;
                    params = [approverRole];
                }
            }

            if (!requestType || requestType === 'purchase') {
                const purchaseQuery = `
                    SELECT 
                        'purchase' as request_type,
                        pr.*,
                        e.full_name as requester_name,
                        e.role as requester_role,
                        e.department
                    FROM purchase_requests pr
                    JOIN employees e ON pr.employee_id = e.id
                    WHERE pr.status = 'pending'
                    AND (
                        (pr.approval_level = 'hr_admin' AND $1 IN ('hr', 'admin', 'superadmin'))
                        OR (pr.approval_level = 'superadmin_only' AND $1 = 'superadmin')
                    )
                    ORDER BY pr.created_at ASC
                `;

                if (requestType === 'purchase') {
                    query = purchaseQuery;
                    params = [approverRole];
                } else if (query) {
                    query += ' UNION ALL ' + purchaseQuery;
                    params.push(approverRole);
                } else {
                    query = purchaseQuery;
                    params = [approverRole];
                }
            }

            const result = await this.db.query(query, params);
            return result.rows;

        } catch (error) {
            logger.error('❌ [ApprovalWorkflow] Get pending requests error', {
                error: (error as Error).message,
                approverRole
            });
            throw error;
        }
    }

    /**
     * Get approval history for a request
     */
    async getApprovalHistory(requestId: string, requestType: 'leave' | 'purchase'): Promise<any[]> {
        try {
            const query = `
                SELECT 
                    aa.*,
                    u.full_name as action_by_name
                FROM approval_actions aa
                LEFT JOIN users u ON aa.action_by = u.id
                WHERE aa.request_id = $1 AND aa.request_type = $2
                ORDER BY aa.action_at ASC
            `;

            const result = await this.db.query(query, [requestId, requestType]);
            return result.rows;

        } catch (error) {
            logger.error('❌ [ApprovalWorkflow] Get approval history error', {
                error: (error as Error).message,
                requestId,
                requestType
            });
            throw error;
        }
    }

    /**
     * Log approval action to audit trail
     */
    private async logApprovalAction(client: any, action: ApprovalAction): Promise<void> {
        const query = `
            INSERT INTO approval_actions (
                request_id, request_type, action, action_by, action_by_role,
                comments, previous_status, new_status, notification_sent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
        `;

        await client.query(query, [
            action.request_id,
            action.request_type,
            action.action,
            action.action_by,
            action.action_by_role,
            action.comments,
            action.previous_status,
            action.new_status
        ]);
    }

    /**
     * Send approval notifications
     */
    private async sendApprovalNotifications(
        request: any,
        requestType: 'leave' | 'purchase',
        isApproval: boolean,
        approverRole: string,
        requesterUserId: string,
        requesterName: string
    ): Promise<void> {
        try {
            const action = isApproval ? 'approved' : 'rejected';
            const notificationType = `${requestType}_request`;

            // Notification to requester
            await this.notificationService.createNotification({
                userId: requesterUserId,
                type: notificationType as any,
                title: `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Request ${action.charAt(0).toUpperCase() + action.slice(1)}`,
                message: `Your ${requestType} request has been ${action}`,
                data: {
                    request_id: request.id,
                    request_type: requestType,
                    action,
                    approver_role: approverRole
                },
                action_url: `/dashboard/${requestType}-requests/${request.id}`
            });

            // Email notification to requester
            const emailTemplate = `${requestType}_request_${action}`;
            await this.emailService.sendTemplatedEmail(
                requesterUserId,
                emailTemplate,
                {
                    requester_name: requesterName,
                    request_id: request.id,
                    approver_role: approverRole,
                    comments: isApproval ? request.approval_comments : request.rejection_reason,
                    ...(requestType === 'leave' ? {
                        start_date: request.start_date,
                        end_date: request.end_date,
                        leave_type: request.type
                    } : {
                        item_name: request.item_name,
                        amount: request.amount || request.estimated_cost
                    })
                }
            );

            logger.info(`📧 [ApprovalWorkflow] Notifications sent for ${requestType} ${action}`, {
                requestId: request.id,
                requesterUserId
            });

        } catch (error) {
            logger.error('❌ [ApprovalWorkflow] Send notifications error', {
                error: (error as Error).message
            });
            // Don't throw here as this is async notification
        }
    }

    /**
     * Update request approval level based on requester role
     */
    async updateRequestApprovalLevel(
        requestId: string,
        requestType: 'leave' | 'purchase',
        requesterRole: string
    ): Promise<void> {
        try {
            const approvalLevel = determineApprovalLevel(requesterRole);
            
            const query = requestType === 'leave'
                ? 'UPDATE leave_requests SET approval_level = $1, requester_role = $2 WHERE id = $3'
                : 'UPDATE purchase_requests SET approval_level = $1, requester_role = $2 WHERE id = $3';

            await this.db.query(query, [approvalLevel, requesterRole, requestId]);

            logger.info(`📋 [ApprovalWorkflow] Updated approval level`, {
                requestId,
                requestType,
                requesterRole,
                approvalLevel
            });

        } catch (error) {
            logger.error('❌ [ApprovalWorkflow] Update approval level error', {
                error: (error as Error).message,
                requestId,
                requestType
            });
            throw error;
        }
    }
}