import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { NotificationService } from './NotificationService';
import { ComprehensiveNotificationService } from './ComprehensiveNotificationService';
import { EmailService } from './EmailService';
import db from '../config/database';

export interface ILeaveRequest {
    id: string;
    employee_id: string;
    type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid';
    start_date: string;
    end_date: string;
    days_requested: number;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    reason?: string;
    notes?: string;
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateLeaveRequestData {
    employee_id: string;
    type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid';
    start_date: string;
    end_date: string;
    reason?: string;
    notes?: string;
}

export interface ApproveLeaveRequestData {
    approved_by: string;
    notes?: string;
}

export interface RejectLeaveRequestData {
    approved_by: string;
    rejection_reason: string;
}

export class LeaveService {
    private supabase: SupabaseClient;
    private notificationService: NotificationService;
    private comprehensiveNotificationService: ComprehensiveNotificationService;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = new NotificationService();
        const emailService = new EmailService(db);
        this.comprehensiveNotificationService = new ComprehensiveNotificationService(
            db,
            this.notificationService,
            emailService
        );
    }

    /**
     * Calculate number of days between two dates (excluding weekends)
     */
    private calculateWorkingDays(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }

    /**
     * Create a new leave request
     */
    async createLeaveRequest(data: CreateLeaveRequestData): Promise<ILeaveRequest> {
        try {
            logger.info('LeaveService: Creating leave request', { 
                employeeId: data.employee_id, 
                type: data.type,
                startDate: data.start_date,
                endDate: data.end_date
            });

            // Get employee role to determine approval level
            const { data: employee, error: employeeError } = await this.supabase
                .from('employees')
                .select('role')
                .eq('id', data.employee_id)
                .single();

            if (employeeError) {
                logger.error('LeaveService: Failed to get employee role', { error: employeeError.message });
                throw employeeError;
            }

            // Determine approval level based on employee role
            const approvalLevel = this.determineApprovalLevel(employee.role);

            // Calculate working days
            const daysRequested = this.calculateWorkingDays(data.start_date, data.end_date);

            const { data: leaveRequest, error } = await this.supabase
                .from('leave_requests')
                .insert({
                    employee_id: data.employee_id,
                    type: data.type,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    days_requested: daysRequested,
                    reason: data.reason,
                    notes: data.notes,
                    status: 'pending',
                    approval_level: approvalLevel,
                    requester_role: employee.role,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                logger.error('LeaveService: Failed to create leave request', { error: error.message });
                throw error;
            }

            // Send notifications to appropriate approvers based on approval level
            await this.notifyApproversForApprovalLevel(leaveRequest, approvalLevel);

            logger.info('LeaveService: Leave request created successfully', { 
                leaveRequestId: leaveRequest.id,
                approvalLevel,
                requesterRole: employee.role
            });
            return leaveRequest;
        } catch (error) {
            logger.error('LeaveService: Create leave request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Determine approval level based on employee role
     */
    private determineApprovalLevel(role: string): string {
        switch (role) {
            case 'employee':
            case 'teamlead':
                return 'hr_admin';
            case 'hr':
            case 'admin':
                return 'superadmin_only';
            case 'superadmin':
                return 'auto_approved';
            default:
                return 'hr_admin';
        }
    }

    /**
     * Notify appropriate approvers based on approval level using comprehensive notification service
     */
    private async notifyApproversForApprovalLevel(leaveRequest: ILeaveRequest, approvalLevel: string): Promise<void> {
        try {
            if (approvalLevel === 'auto_approved') {
                logger.info('LeaveService: Request auto-approved, no notifications sent', {
                    leaveRequestId: leaveRequest.id
                });
                return;
            }

            // Get requester information
            const { data: employee, error: employeeError } = await this.supabase
                .from('employees')
                .select('full_name, role')
                .eq('id', leaveRequest.employee_id)
                .single();

            if (employeeError) {
                logger.error('LeaveService: Failed to get employee info for notifications', { 
                    error: employeeError.message 
                });
                return;
            }

            // Prepare request data for notifications
            const requestData = {
                start_date: leaveRequest.start_date,
                end_date: leaveRequest.end_date,
                leave_type: leaveRequest.type,
                reason: leaveRequest.reason,
                days_requested: leaveRequest.days_requested
            };

            // Send comprehensive approval notifications
            await this.comprehensiveNotificationService.sendApprovalNotifications(
                leaveRequest.id,
                'leave',
                employee.role,
                employee.full_name,
                requestData
            );

            logger.info('LeaveService: Comprehensive approval notifications sent', {
                leaveRequestId: leaveRequest.id,
                requesterRole: employee.role,
                approvalLevel
            });

        } catch (error) {
            logger.error('LeaveService: Failed to send approval notifications', {
                error: (error as Error).message,
                leaveRequestId: leaveRequest.id
            });
        }
    }

    /**
     * Get leave request by ID
     */
    async getLeaveRequestById(id: string): Promise<ILeaveRequest | null> {
        try {
            const { data, error } = await this.supabase
                .from('leave_requests')
                .select(`
                    *,
                    employee:employees!leave_requests_employee_id_fkey(id, full_name, email),
                    approver:employees!leave_requests_approved_by_fkey(id, full_name, email)
                `)
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') {
                logger.error('LeaveService: Failed to get leave request', { error: error.message });
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('LeaveService: Get leave request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get all leave requests for an employee
     */
    async getEmployeeLeaveRequests(employeeId: string): Promise<ILeaveRequest[]> {
        try {
            const { data, error } = await this.supabase
                .from('leave_requests')
                .select(`
                    *,
                    approver:employees!leave_requests_approved_by_fkey(id, full_name, email)
                `)
                .eq('employee_id', employeeId)
                .order('created_at', { ascending: false });

            if (error) {
                logger.error('LeaveService: Failed to get employee leave requests', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('LeaveService: Get employee leave requests failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get all pending leave requests (for approvers)
     */
    async getPendingLeaveRequests(): Promise<ILeaveRequest[]> {
        try {
            const { data, error } = await this.supabase
                .from('leave_requests')
                .select(`
                    *,
                    employee:employees!leave_requests_employee_id_fkey(id, full_name, email, department)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) {
                logger.error('LeaveService: Failed to get pending leave requests', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('LeaveService: Get pending leave requests failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get all leave requests (for admin view)
     */
    async getAllLeaveRequests(status?: string): Promise<ILeaveRequest[]> {
        try {
            let query = this.supabase
                .from('leave_requests')
                .select(`
                    *,
                    employee:employees!leave_requests_employee_id_fkey(id, full_name, email, department)
                `);

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                logger.error('LeaveService: Failed to get all leave requests', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('LeaveService: Get all leave requests failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Approve a leave request
     */
    async approveLeaveRequest(leaveRequestId: string, data: ApproveLeaveRequestData): Promise<ILeaveRequest> {
        try {
            logger.info('LeaveService: Approving leave request', { leaveRequestId, approvedBy: data.approved_by });

            const { data: updatedRequest, error } = await this.supabase
                .from('leave_requests')
                .update({
                    status: 'approved',
                    approved_by: data.approved_by,
                    approved_at: new Date().toISOString(),
                    notes: data.notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', leaveRequestId)
                .select(`
                    *,
                    employee:employees!leave_requests_employee_id_fkey(id, full_name, email),
                    approver:employees!leave_requests_approved_by_fkey(id, full_name, email)
                `)
                .single();

            if (error) {
                logger.error('LeaveService: Failed to approve leave request', { error: error.message });
                throw error;
            }

            // Notify the employee about approval
            await this.notificationService.createNotification({
                userId: updatedRequest.employee.id,
                type: 'leave',
                title: 'Leave Request Approved',
                message: `Your ${updatedRequest.type} leave request from ${updatedRequest.start_date} to ${updatedRequest.end_date} has been approved.`,
                relatedId: updatedRequest.id,
                actionUrl: '/leave-requests'
            });

            logger.info('LeaveService: Leave request approved successfully', { leaveRequestId });
            return updatedRequest;
        } catch (error) {
            logger.error('LeaveService: Approve leave request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Reject a leave request
     */
    async rejectLeaveRequest(leaveRequestId: string, data: RejectLeaveRequestData): Promise<ILeaveRequest> {
        try {
            logger.info('LeaveService: Rejecting leave request', { leaveRequestId, approvedBy: data.approved_by });

            const { data: updatedRequest, error } = await this.supabase
                .from('leave_requests')
                .update({
                    status: 'rejected',
                    approved_by: data.approved_by,
                    approved_at: new Date().toISOString(),
                    rejection_reason: data.rejection_reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', leaveRequestId)
                .select(`
                    *,
                    employee:employees!leave_requests_employee_id_fkey(id, full_name, email),
                    approver:employees!leave_requests_approved_by_fkey(id, full_name, email)
                `)
                .single();

            if (error) {
                logger.error('LeaveService: Failed to reject leave request', { error: error.message });
                throw error;
            }

            // Notify the employee about rejection
            await this.notificationService.createNotification({
                userId: updatedRequest.employee.id,
                type: 'leave',
                title: 'Leave Request Rejected',
                message: `Your ${updatedRequest.type} leave request from ${updatedRequest.start_date} to ${updatedRequest.end_date} has been rejected. Reason: ${data.rejection_reason}`,
                relatedId: updatedRequest.id,
                actionUrl: '/leave-requests'
            });

            logger.info('LeaveService: Leave request rejected successfully', { leaveRequestId });
            return updatedRequest;
        } catch (error) {
            logger.error('LeaveService: Reject leave request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Cancel a leave request (by employee)
     */
    async cancelLeaveRequest(leaveRequestId: string, employeeId: string): Promise<ILeaveRequest> {
        try {
            logger.info('LeaveService: Cancelling leave request', { leaveRequestId, employeeId });

            const { data: updatedRequest, error } = await this.supabase
                .from('leave_requests')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', leaveRequestId)
                .eq('employee_id', employeeId)
                .eq('status', 'pending') // Only allow cancelling pending requests
                .select()
                .single();

            if (error) {
                logger.error('LeaveService: Failed to cancel leave request', { error: error.message });
                throw error;
            }

            logger.info('LeaveService: Leave request cancelled successfully', { leaveRequestId });
            return updatedRequest;
        } catch (error) {
            logger.error('LeaveService: Cancel leave request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Update a leave request (only if pending)
     */
    async updateLeaveRequest(leaveRequestId: string, employeeId: string, updateData: Partial<CreateLeaveRequestData>): Promise<ILeaveRequest> {
        try {
            logger.info('LeaveService: Updating leave request', { leaveRequestId, employeeId });

            const updatePayload: any = {
                updated_at: new Date().toISOString()
            };

            if (updateData.type) updatePayload.type = updateData.type;
            if (updateData.start_date) updatePayload.start_date = updateData.start_date;
            if (updateData.end_date) updatePayload.end_date = updateData.end_date;
            if (updateData.reason) updatePayload.reason = updateData.reason;
            if (updateData.notes) updatePayload.notes = updateData.notes;

            // Recalculate days if dates changed
            if (updateData.start_date || updateData.end_date) {
                const currentRequest = await this.getLeaveRequestById(leaveRequestId);
                if (currentRequest) {
                    const startDate = updateData.start_date || currentRequest.start_date;
                    const endDate = updateData.end_date || currentRequest.end_date;
                    updatePayload.days_requested = this.calculateWorkingDays(startDate, endDate);
                }
            }

            const { data: updatedRequest, error } = await this.supabase
                .from('leave_requests')
                .update(updatePayload)
                .eq('id', leaveRequestId)
                .eq('employee_id', employeeId)
                .eq('status', 'pending') // Only allow updating pending requests
                .select()
                .single();

            if (error) {
                logger.error('LeaveService: Failed to update leave request', { error: error.message });
                throw error;
            }

            logger.info('LeaveService: Leave request updated successfully', { leaveRequestId });
            return updatedRequest;
        } catch (error) {
            logger.error('LeaveService: Update leave request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get leave statistics for an employee
     */
    async getEmployeeLeaveStats(employeeId: string, year?: number): Promise<any> {
        try {
            const currentYear = year || new Date().getFullYear();
            const startDate = `${currentYear}-01-01`;
            const endDate = `${currentYear}-12-31`;

            const { data, error } = await this.supabase
                .from('leave_requests')
                .select('type, days_requested, status')
                .eq('employee_id', employeeId)
                .eq('status', 'approved')
                .gte('start_date', startDate)
                .lte('end_date', endDate);

            if (error) {
                logger.error('LeaveService: Failed to get leave stats', { error: error.message });
                throw error;
            }

            const stats = {
                totalDaysTaken: 0,
                byType: {} as Record<string, number>,
                year: currentYear
            };

            data?.forEach(request => {
                stats.totalDaysTaken += request.days_requested;
                stats.byType[request.type] = (stats.byType[request.type] || 0) + request.days_requested;
            });

            return stats;
        } catch (error) {
            logger.error('LeaveService: Get leave stats failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Send notifications to all approvers (super-admin, admin, hr)
     */
    private async notifyApprovers(leaveRequest: ILeaveRequest, type: string): Promise<void> {
        try {
            // Get all users with approval roles
            const { data: approvers, error } = await this.supabase
                .from('employees')
                .select('id, full_name, email')
                .in('role', ['super-admin', 'admin', 'hr']);

            if (error) {
                logger.error('LeaveService: Failed to get approvers', { error: error.message });
                return;
            }

            // Get employee details
            const { data: employee } = await this.supabase
                .from('employees')
                .select('full_name, email')
                .eq('id', leaveRequest.employee_id)
                .single();

            if (!employee) return;

            // Send notifications to all approvers
            if (approvers && approvers.length > 0) {
                for (const approver of approvers) {
                    await this.notificationService.createNotification({
                        userId: approver.id,
                        type: 'leave',
                        title: 'New Leave Request',
                        message: `${employee.full_name} has submitted a ${leaveRequest.type} leave request from ${leaveRequest.start_date} to ${leaveRequest.end_date} (${leaveRequest.days_requested} days).`,
                        relatedId: leaveRequest.id,
                        actionUrl: '/admin/leave-requests'
                    });
                }
            }

            logger.info('LeaveService: Approver notifications sent', { count: approvers.length });
        } catch (error) {
            logger.error('LeaveService: Failed to notify approvers', { error: (error as Error).message });
        }
    }
}

export default new LeaveService();