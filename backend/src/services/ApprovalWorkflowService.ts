import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import NotificationService from './NotificationService';
import RequestNotificationService from './RequestNotificationService';

export type RequestType = 'leave' | 'purchase' | 'expense' | 'travel' | 'overtime' | 'profile_update' | 'settings_change' | 'task_assignment';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalAction = 'approve' | 'reject' | 'request_changes' | 'escalate';

export interface ApprovalRule {
    id: string;
    requestType: RequestType;
    condition: string; // JSON condition (e.g., amount > 1000, department = 'IT')
    requiredRole: string[];
    approvalOrder: number;
    isActive: boolean;
    description?: string;
}

export interface ApprovalStatistics {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    averageApprovalTime: number;
    requestsByType: Record<RequestType, number>;
}

export interface ApprovalStep {
    id: string;
    requestId: string;
    requestType: RequestType;
    approverId: string;
    approverRole: string;
    status: ApprovalStatus;
    action?: ApprovalAction;
    comments?: string;
    actionDate?: Date;
    order: number;
    isRequired: boolean;
}

export interface ApprovalWorkflow {
    id: string;
    requestId: string;
    requestType: RequestType;
    currentStep: number;
    totalSteps: number;
    status: ApprovalStatus;
    createdAt: Date;
    completedAt?: Date;
    steps: ApprovalStep[];
}

export interface ApprovalRequest {
    id: string;
    type: RequestType;
    employeeId: string;
    data: any;
    metadata?: any;
    status?: ApprovalStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ApprovalDecision {
    approverId: string;
    action: ApprovalAction;
    comments?: string;
    escalateTo?: string;
}

export class ApprovalWorkflowService {
    private supabase: SupabaseClient;
    private notificationService: typeof NotificationService;
    private requestNotificationService: typeof RequestNotificationService;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = NotificationService;
        this.requestNotificationService = RequestNotificationService;
    }

    /**
     * Create approval request
     */
    async createApprovalRequest(
        requestType: RequestType,
        requestData: any
    ): Promise<ApprovalWorkflow> {
        try {
            logger.info('ApprovalWorkflowService: Creating approval request', {
                requestType,
                requestedBy: requestData.requestedBy
            });

            // Create the approval request
            const request: ApprovalRequest = {
                id: requestData.requestId || this.generateRequestId(),
                type: requestType,
                employeeId: requestData.requestedBy,
                data: requestData,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Initialize the workflow
            return await this.initializeWorkflow(request);
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to create approval request', {
                error: (error as Error).message,
                requestType
            });
            throw error;
        }
    }

    /**
     * Initialize approval workflow for a request
     */
    async initializeWorkflow(request: ApprovalRequest): Promise<ApprovalWorkflow> {
        try {
            logger.info('ApprovalWorkflowService: Initializing workflow', {
                requestId: request.id,
                requestType: request.type,
                employeeId: request.employeeId
            });

            // Get applicable approval rules for this request
            const approvalRules = await this.getApplicableRules(request);

            if (approvalRules.length === 0) {
                throw new Error(`No approval rules found for request type: ${request.type}`);
            }

            // Create workflow record
            const { data: workflow, error: workflowError } = await this.supabase
                .from('approval_workflows')
                .insert({
                    request_id: request.id,
                    request_type: request.type,
                    current_step: 1,
                    total_steps: approvalRules.length,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (workflowError) {
                throw workflowError;
            }

            // Create approval steps based on rules
            const steps: ApprovalStep[] = [];
            for (let i = 0; i < approvalRules.length; i++) {
                const rule = approvalRules[i];
                const approvers = await this.getApproversForRule(rule);

                for (const approver of approvers) {
                    const { data: step, error: stepError } = await this.supabase
                        .from('approval_steps')
                        .insert({
                            workflow_id: workflow.id,
                            request_id: request.id,
                            request_type: request.type,
                            approver_id: approver.id,
                            approver_role: approver.role,
                            status: 'pending',
                            order: rule.approvalOrder,
                            is_required: true,
                            created_at: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (stepError) {
                        logger.error('ApprovalWorkflowService: Failed to create approval step', {
                            error: stepError.message
                        });
                        continue;
                    }

                    steps.push({
                        id: step.id,
                        requestId: request.id,
                        requestType: request.type,
                        approverId: approver.id,
                        approverRole: approver.role,
                        status: 'pending',
                        order: rule.approvalOrder,
                        isRequired: true
                    });
                }
            }

            // Notify first level approvers
            await this.notifyCurrentApprovers(workflow.id);

            const result: ApprovalWorkflow = {
                id: workflow.id,
                requestId: request.id,
                requestType: request.type,
                currentStep: 1,
                totalSteps: approvalRules.length,
                status: 'pending',
                createdAt: new Date(workflow.created_at),
                steps
            };

            logger.info('ApprovalWorkflowService: Workflow initialized successfully', {
                workflowId: workflow.id,
                totalSteps: approvalRules.length
            });

            return result;
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to initialize workflow', {
                error: (error as Error).message,
                requestId: request.id
            });
            throw error;
        }
    }

    /**
     * Process approval decision
     */
    async processApprovalDecision(
        workflowId: string,
        stepId: string,
        decision: ApprovalDecision
    ): Promise<{ workflow: ApprovalWorkflow; isComplete: boolean; finalStatus: ApprovalStatus }> {
        try {
            logger.info('ApprovalWorkflowService: Processing approval decision', {
                workflowId,
                stepId,
                action: decision.action,
                approverId: decision.approverId
            });

            // Update the approval step
            const { data: updatedStep, error: stepError } = await this.supabase
                .from('approval_steps')
                .update({
                    status: decision.action === 'approve' ? 'approved' :
                        decision.action === 'reject' ? 'rejected' : 'pending',
                    action: decision.action,
                    comments: decision.comments,
                    action_date: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', stepId)
                .eq('approver_id', decision.approverId)
                .select()
                .single();

            if (stepError) {
                throw stepError;
            }

            // Get current workflow state
            const workflow = await this.getWorkflowById(workflowId);
            if (!workflow) {
                throw new Error('Workflow not found');
            }

            let isComplete = false;
            let finalStatus: ApprovalStatus = 'pending';

            // Handle different actions
            switch (decision.action) {
                case 'reject':
                    // Rejection completes the workflow immediately
                    finalStatus = 'rejected';
                    isComplete = true;
                    await this.completeWorkflow(workflowId, finalStatus);
                    break;

                case 'approve':
                    // Check if all required steps for current level are approved
                    const currentLevelComplete = await this.isCurrentLevelComplete(workflowId);

                    if (currentLevelComplete) {
                        const hasNextLevel = await this.hasNextApprovalLevel(workflowId);

                        if (hasNextLevel) {
                            // Move to next approval level
                            await this.advanceToNextLevel(workflowId);
                            await this.notifyCurrentApprovers(workflowId);
                        } else {
                            // All approvals complete
                            finalStatus = 'approved';
                            isComplete = true;
                            await this.completeWorkflow(workflowId, finalStatus);
                        }
                    }
                    break;

                case 'escalate':
                    if (decision.escalateTo) {
                        await this.escalateApproval(stepId, decision.escalateTo, decision.comments);
                    }
                    break;

                case 'request_changes':
                    // Send back to requester for changes
                    await this.requestChanges(workflowId, decision.comments);
                    break;
            }

            // Send notifications based on the decision
            if (isComplete && (finalStatus === 'approved' || finalStatus === 'rejected')) {
                await this.sendDecisionNotifications(workflow, decision, isComplete, finalStatus);
            }

            const updatedWorkflow = await this.getWorkflowById(workflowId);

            logger.info('ApprovalWorkflowService: Approval decision processed', {
                workflowId,
                isComplete,
                finalStatus
            });

            return {
                workflow: updatedWorkflow!,
                isComplete,
                finalStatus
            };
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to process approval decision', {
                error: (error as Error).message,
                workflowId,
                stepId
            });
            throw error;
        }
    }

    /**
     * Get workflow by ID
     */
    async getWorkflowById(workflowId: string): Promise<ApprovalWorkflow | null> {
        try {
            const { data: workflow, error: workflowError } = await this.supabase
                .from('approval_workflows')
                .select('*')
                .eq('id', workflowId)
                .single();

            if (workflowError) {
                if (workflowError.code === 'PGRST116') return null;
                throw workflowError;
            }

            const { data: steps, error: stepsError } = await this.supabase
                .from('approval_steps')
                .select(`
                    *,
                    approver:employees!approval_steps_approver_id_fkey(id, full_name, email, role)
                `)
                .eq('workflow_id', workflowId)
                .order('order', { ascending: true });

            if (stepsError) {
                throw stepsError;
            }

            return {
                id: workflow.id,
                requestId: workflow.request_id,
                requestType: workflow.request_type,
                currentStep: workflow.current_step,
                totalSteps: workflow.total_steps,
                status: workflow.status,
                createdAt: new Date(workflow.created_at),
                completedAt: workflow.completed_at ? new Date(workflow.completed_at) : undefined,
                steps: steps?.map(step => ({
                    id: step.id,
                    requestId: step.request_id,
                    requestType: step.request_type,
                    approverId: step.approver_id,
                    approverRole: step.approver_role,
                    status: step.status,
                    action: step.action,
                    comments: step.comments,
                    actionDate: step.action_date ? new Date(step.action_date) : undefined,
                    order: step.order,
                    isRequired: step.is_required
                })) || []
            };
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to get workflow', {
                error: (error as Error).message,
                workflowId
            });
            return null;
        }
    }

    /**
     * Get pending approvals for a user
     */
    async getPendingApprovalsForUser(userId: string): Promise<ApprovalStep[]> {
        try {
            const { data: steps, error } = await this.supabase
                .from('approval_steps')
                .select(`
                    *,
                    workflow:approval_workflows!approval_steps_workflow_id_fkey(*),
                    requester:employees!approval_workflows_request_id_fkey(id, full_name, email)
                `)
                .eq('approver_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) {
                throw error;
            }

            return steps?.map(step => ({
                id: step.id,
                requestId: step.request_id,
                requestType: step.request_type,
                approverId: step.approver_id,
                approverRole: step.approver_role,
                status: step.status,
                action: step.action,
                comments: step.comments,
                actionDate: step.action_date ? new Date(step.action_date) : undefined,
                order: step.order,
                isRequired: step.is_required
            })) || [];
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to get pending approvals', {
                error: (error as Error).message,
                userId
            });
            return [];
        }
    }

    /**
     * Get approval rules for request type
     */
    async getApprovalRules(requestType: RequestType): Promise<ApprovalRule[]> {
        try {
            const { data: rules, error } = await this.supabase
                .from('approval_rules')
                .select('*')
                .eq('request_type', requestType)
                .eq('is_active', true)
                .order('approval_order', { ascending: true });

            if (error) {
                throw error;
            }

            return rules?.map(rule => ({
                id: rule.id,
                requestType: rule.request_type,
                condition: rule.condition,
                requiredRole: rule.required_role,
                approvalOrder: rule.approval_order,
                isActive: rule.is_active,
                description: rule.description
            })) || [];
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to get approval rules', {
                error: (error as Error).message,
                requestType
            });
            return [];
        }
    }

    /**
     * Create or update approval rule
     */
    async upsertApprovalRule(rule: Omit<ApprovalRule, 'id'> & { id?: string }): Promise<ApprovalRule> {
        try {
            const ruleData = {
                request_type: rule.requestType,
                condition: rule.condition,
                required_role: rule.requiredRole,
                approval_order: rule.approvalOrder,
                is_active: rule.isActive,
                description: rule.description,
                updated_at: new Date().toISOString()
            };

            let query;
            if (rule.id) {
                query = this.supabase
                    .from('approval_rules')
                    .update(ruleData)
                    .eq('id', rule.id);
            } else {
                query = this.supabase
                    .from('approval_rules')
                    .insert({ ...ruleData, created_at: new Date().toISOString() });
            }

            const { data, error } = await query.select().single();

            if (error) {
                throw error;
            }

            return {
                id: data.id,
                requestType: data.request_type,
                condition: data.condition,
                requiredRole: data.required_role,
                approvalOrder: data.approval_order,
                isActive: data.is_active,
                description: data.description
            };
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to upsert approval rule', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Get applicable approval rules for a request
     */
    private async getApplicableRules(request: ApprovalRequest): Promise<ApprovalRule[]> {
        const allRules = await this.getApprovalRules(request.type);

        // Filter rules based on conditions
        const applicableRules: ApprovalRule[] = [];

        for (const rule of allRules) {
            if (await this.evaluateRuleCondition(rule, request)) {
                applicableRules.push(rule);
            }
        }

        return applicableRules.sort((a, b) => a.approvalOrder - b.approvalOrder);
    }

    /**
     * Evaluate if a rule condition matches the request
     */
    private async evaluateRuleCondition(rule: ApprovalRule, request: ApprovalRequest): Promise<boolean> {
        try {
            // Parse the condition (simple JSON-based conditions for now)
            const condition = JSON.parse(rule.condition);

            // Example conditions:
            // { "amount": { "gt": 1000 } }
            // { "department": { "eq": "IT" } }
            // { "urgency": { "in": ["high", "urgent"] } }

            for (const [field, criteria] of Object.entries(condition)) {
                const requestValue = request.data[field] || request.metadata?.[field];

                if (typeof criteria === 'object' && criteria !== null) {
                    for (const [operator, value] of Object.entries(criteria)) {
                        switch (operator) {
                            case 'gt':
                                if (!(requestValue > value)) return false;
                                break;
                            case 'gte':
                                if (!(requestValue >= value)) return false;
                                break;
                            case 'lt':
                                if (!(requestValue < value)) return false;
                                break;
                            case 'lte':
                                if (!(requestValue <= value)) return false;
                                break;
                            case 'eq':
                                if (requestValue !== value) return false;
                                break;
                            case 'ne':
                                if (requestValue === value) return false;
                                break;
                            case 'in':
                                if (!Array.isArray(value) || !value.includes(requestValue)) return false;
                                break;
                            case 'nin':
                                if (Array.isArray(value) && value.includes(requestValue)) return false;
                                break;
                        }
                    }
                } else {
                    // Simple equality check
                    if (requestValue !== criteria) return false;
                }
            }

            return true;
        } catch (error) {
            logger.warn('ApprovalWorkflowService: Failed to evaluate rule condition', {
                ruleId: rule.id,
                condition: rule.condition,
                error: (error as Error).message
            });
            return true; // Default to applying the rule if condition evaluation fails
        }
    }

    /**
     * Get approvers for a rule
     */
    private async getApproversForRule(rule: ApprovalRule): Promise<any[]> {
        try {
            const { data: approvers, error } = await this.supabase
                .from('employees')
                .select('id, full_name, email, role')
                .in('role', rule.requiredRole)
                .eq('status', 'active');

            if (error) {
                throw error;
            }

            return approvers || [];
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to get approvers for rule', {
                error: (error as Error).message,
                ruleId: rule.id
            });
            return [];
        }
    }

    /**
     * Check if current approval level is complete
     */
    private async isCurrentLevelComplete(workflowId: string): Promise<boolean> {
        try {
            const { data: workflow } = await this.supabase
                .from('approval_workflows')
                .select('current_step')
                .eq('id', workflowId)
                .single();

            if (!workflow) return false;

            const { data: pendingSteps, error } = await this.supabase
                .from('approval_steps')
                .select('id')
                .eq('workflow_id', workflowId)
                .eq('order', workflow.current_step)
                .eq('status', 'pending')
                .eq('is_required', true);

            if (error) throw error;

            return (pendingSteps?.length || 0) === 0;
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to check if current level is complete', {
                error: (error as Error).message,
                workflowId
            });
            return false;
        }
    }

    /**
     * Check if there's a next approval level
     */
    private async hasNextApprovalLevel(workflowId: string): Promise<boolean> {
        try {
            const { data: workflow } = await this.supabase
                .from('approval_workflows')
                .select('current_step, total_steps')
                .eq('id', workflowId)
                .single();

            return workflow ? workflow.current_step < workflow.total_steps : false;
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to check next approval level', {
                error: (error as Error).message,
                workflowId
            });
            return false;
        }
    }

    /**
     * Advance workflow to next level
     */
    private async advanceToNextLevel(workflowId: string): Promise<void> {
        try {
            await this.supabase
                .from('approval_workflows')
                .update({
                    current_step: this.supabase.rpc('increment_current_step'),
                    updated_at: new Date().toISOString()
                })
                .eq('id', workflowId);
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to advance to next level', {
                error: (error as Error).message,
                workflowId
            });
            throw error;
        }
    }

    /**
     * Complete workflow
     */
    private async completeWorkflow(workflowId: string, finalStatus: ApprovalStatus): Promise<void> {
        try {
            await this.supabase
                .from('approval_workflows')
                .update({
                    status: finalStatus,
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', workflowId);
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to complete workflow', {
                error: (error as Error).message,
                workflowId
            });
            throw error;
        }
    }

    /**
     * Notify current level approvers
     */
    private async notifyCurrentApprovers(workflowId: string): Promise<void> {
        try {
            const workflow = await this.getWorkflowById(workflowId);
            if (!workflow) return;

            const currentSteps = workflow.steps.filter(
                step => step.order === workflow.currentStep && step.status === 'pending'
            );

            for (const step of currentSteps) {
                await this.requestNotificationService.sendApprovalRequestNotification(
                    step.approverId,
                    workflow.requestType,
                    workflow.requestId,
                    step.id
                );
            }
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to notify current approvers', {
                error: (error as Error).message,
                workflowId
            });
        }
    }

    /**
     * Send decision notifications
     */
    private async sendDecisionNotifications(
        workflow: ApprovalWorkflow,
        decision: ApprovalDecision,
        isComplete: boolean,
        finalStatus: 'approved' | 'rejected'
    ): Promise<void> {
        try {
            if (isComplete) {
                await this.requestNotificationService.sendApprovalDecisionNotification(
                    workflow.requestId,
                    workflow.requestType,
                    finalStatus,
                    decision.approverId,
                    decision.comments
                );
            }
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to send decision notifications', {
                error: (error as Error).message,
                workflowId: workflow.id
            });
        }
    }

    /**
     * Escalate approval to another user
     */
    async escalateApproval(stepId: string, escalateTo: string, comments?: string): Promise<void> {
        try {
            // Create new approval step for escalated approver
            const { data: originalStep } = await this.supabase
                .from('approval_steps')
                .select('*')
                .eq('id', stepId)
                .single();

            if (originalStep) {
                await this.supabase
                    .from('approval_steps')
                    .insert({
                        workflow_id: originalStep.workflow_id,
                        request_id: originalStep.request_id,
                        request_type: originalStep.request_type,
                        approver_id: escalateTo,
                        approver_role: 'escalated',
                        status: 'pending',
                        order: originalStep.order,
                        is_required: true,
                        comments: `Escalated from ${originalStep.approver_id}: ${comments || ''}`,
                        created_at: new Date().toISOString()
                    });

                // Mark original step as escalated
                await this.supabase
                    .from('approval_steps')
                    .update({
                        status: 'escalated',
                        action: 'escalate',
                        comments,
                        action_date: new Date().toISOString()
                    })
                    .eq('id', stepId);
            }
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to escalate approval', {
                error: (error as Error).message,
                stepId
            });
            throw error;
        }
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Request changes from requester
     */
    private async requestChanges(workflowId: string, comments?: string): Promise<void> {
        try {
            const workflow = await this.getWorkflowById(workflowId);
            if (!workflow) return;

            await this.requestNotificationService.sendChangeRequestNotification(
                workflow.requestId,
                workflow.requestType,
                comments
            );
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to request changes', {
                error: (error as Error).message,
                workflowId
            });
            throw error;
        }
    }

    /**
     * Get approval workflow by ID
     */
    async getApprovalWorkflow(workflowId: string): Promise<ApprovalWorkflow | null> {
        try {
            const { data: workflow, error } = await this.supabase
                .from('approval_workflows')
                .select('*')
                .eq('id', workflowId)
                .single();

            if (error) throw error;
            return workflow;
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to get approval workflow', {
                error: (error as Error).message,
                workflowId
            });
            throw error;
        }
    }

    /**
     * Process approval step
     */
    async processApprovalStep(stepId: string, decision: ApprovalDecision, approverId: string, comments?: string): Promise<any> {
        try {
            // Find the workflow for this step
            const { data: step, error: stepError } = await this.supabase
                .from('approval_steps')
                .select('workflow_id')
                .eq('id', stepId)
                .single();

            if (stepError || !step) {
                throw new Error('Approval step not found');
            }

            return await this.processApprovalDecision(step.workflow_id, stepId, {
                action: decision as unknown as ApprovalAction,
                approverId,
                comments
            });
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to process approval step', {
                error: (error as Error).message,
                stepId
            });
            throw error;
        }
    }

    /**
     * Get approval history
     */
    async getApprovalHistory(requestId: string): Promise<any[]> {
        try {
            const { data: history, error } = await this.supabase
                .from('approval_workflows')
                .select('*')
                .eq('request_id', requestId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return history || [];
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to get approval history', {
                error: (error as Error).message,
                requestId
            });
            throw error;
        }
    }

    /**
     * Delegate approval
     */
    async delegateApproval(stepId: string, delegateTo: string, delegatedBy: string, reason?: string): Promise<any> {
        try {
            // Update the current step to delegate to another user
            const { error } = await this.supabase
                .from('approval_steps')
                .update({
                    approver_id: delegateTo,
                    comments: `Delegated by ${delegatedBy}. Reason: ${reason || 'No reason provided'}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', stepId);

            if (error) throw error;

            return { success: true, message: 'Approval delegated successfully' };
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to delegate approval', {
                error: (error as Error).message,
                stepId
            });
            throw error;
        }
    }

    /**
     * Get approval statistics
     */
    async getApprovalStatistics(filters?: any): Promise<ApprovalStatistics> {
        try {
            const { data: workflows, error } = await this.supabase
                .from('approval_workflows')
                .select('*');

            if (error) throw error;

            const stats: ApprovalStatistics = {
                totalRequests: workflows?.length || 0,
                pendingRequests: workflows?.filter(w => w.status === 'pending').length || 0,
                approvedRequests: workflows?.filter(w => w.status === 'approved').length || 0,
                rejectedRequests: workflows?.filter(w => w.status === 'rejected').length || 0,
                averageApprovalTime: 0,
                requestsByType: {} as Record<RequestType, number>
            };

            return stats;
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to get approval statistics', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Bulk process approvals
     */
    async bulkProcessApprovals(approvals: Array<{ stepId: string; decision: ApprovalDecision; approverId: string; comments?: string }>): Promise<any[]> {
        try {
            const results = [];
            for (const approval of approvals) {
                try {
                    const result = await this.processApprovalStep(approval.stepId, approval.decision, approval.approverId, approval.comments);
                    results.push({ stepId: approval.stepId, success: true, result });
                } catch (error) {
                    results.push({ stepId: approval.stepId, success: false, error: (error as Error).message });
                }
            }
            return results;
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to bulk process approvals', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Set workflow configuration
     */
    async setWorkflowConfiguration(requestType: RequestType, config: any): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('approval_rules')
                .upsert({
                    request_type: requestType,
                    configuration: config,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to set workflow configuration', {
                error: (error as Error).message,
                requestType
            });
            throw error;
        }
    }

    /**
     * Get workflow configuration
     */
    async getWorkflowConfiguration(requestType: RequestType): Promise<any> {
        try {
            const { data: config, error } = await this.supabase
                .from('approval_rules')
                .select('*')
                .eq('request_type', requestType)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return config?.configuration || {};
        } catch (error) {
            logger.error('ApprovalWorkflowService: Failed to get workflow configuration', {
                error: (error as Error).message,
                requestType
            });
            throw error;
        }
    }
}

export default new ApprovalWorkflowService();