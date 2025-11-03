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

            // Use database function to create leave request with proper JSON handling
            const { data: result, error } = await this.supabase
                .rpc('create_leave_request', {
                    p_employee_id: data.employee_id,
                    p_type: data.type,
                    p_start_date: data.start_date,
                    p_end_date: data.end_date,
                    p_reason: data.reason || null,
                    p_notes: data.notes || null
                });

            if (error) {
                logger.error('LeaveService: Failed to create leave request', { error: error.message });
                throw new Error(`Failed to create leave request: ${error.message}`);
            }

            if (!result) {
                throw new Error('No data returned from leave request creation');
            }

            // Parse the JSON result
            const leaveRequest = typeof result === 'string' ? JSON.parse(result) : result;

            // Get employee role for notifications
            // First try to get by the actual employee_id returned from the function
            let employee = null;
            let employeeError = null;
            
            if (leaveRequest.employee_id) {
                const result = await this.supabase
                    .from('employees')
                    .select('role, full_name')
                    .eq('id', leaveRequest.employee_id)
                    .single();
                employee = result.data;
                employeeError = result.error;
            }
            
            // If that fails, try with the original input (might be user_id)
            if (!employee && data.employee_id) {
                const result = await this.supabase
                    .from('employees')
                    .select('role, full_name')
                    .eq('user_id', data.employee_id)
                    .single();
                if (!result.error) {
                    employee = result.data;
                    employeeError = null;
                }
            }

            if (employeeError) {
                logger.warn('LeaveService: Could not get employee details for notifications', { error: employeeError.message });
            } else {
                // Send notifications to appropriate approvers
                await this.notifyApproversForApprovalLevel(leaveRequest, employee.role);
            }

            logger.info('LeaveService: Leave request created successfully', { 
                leaveRequestId: leaveRequest.id,
                requesterRole: employee?.role
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
     * Notify appropriate approvers based on employee role using comprehensive notification service
     */
    private async notifyApproversForApprovalLevel(leaveRequest: ILeaveRequest, employeeRole: string): Promise<void> {
        try {
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
                days_requested: leaveRequest.days_requested || this.calculateWorkingDays(leaveRequest.start_date, leaveRequest.end_date)
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
                requesterRole: employee.role
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
            const { data: result, error } = await this.supabase
                .rpc('get_leave_request_by_id', {
                    p_request_id: id
                });

            if (error) {
                logger.error('LeaveService: Failed to get leave request', { error: error.message });
                throw error;
            }

            if (!result) {
                return null;
            }

            // Parse the JSON result
            const leaveRequest = typeof result === 'string' ? JSON.parse(result) : result;
            
            // Check if error was returned from function
            if (leaveRequest.error) {
                return null;
            }

            return leaveRequest;
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
            const { data: result, error } = await this.supabase
                .rpc('get_employee_leave_requests', {
                    p_employee_id: employeeId
                });

            if (error) {
                logger.error('LeaveService: Failed to get employee leave requests', { error: error.message });
                throw error;
            }

            if (!result) {
                return [];
            }

            // Parse the JSON result
            const leaveRequests = typeof result === 'string' ? JSON.parse(result) : result;
            
            return Array.isArray(leaveRequests) ? leaveRequests : [];
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
     * Get pending leave requests for a specific role (excludes own requests)
     */
    async getPendingLeaveRequestsForRole(userRole: string, userId: string): Promise<ILeaveRequest[]> {
        try {
            logger.info('LeaveService: Getting pending requests for role', { userRole, userId });

            const { data: result, error } = await this.supabase
                .rpc('get_pending_requests_for_role', {
                    p_user_role: userRole,
                    p_user_id: userId,
                    p_request_type: 'leave'
                });

            if (error) {
                logger.error('LeaveService: Failed to get role-based pending requests', { error: error.message });
                throw error;
            }

            if (!result) {
                return [];
            }

            // Parse the JSON results
            const requests = Array.isArray(result) ? result : [result];
            return requests.map(item => {
                const requestData = typeof item.request_data === 'string' ? JSON.parse(item.request_data) : item.request_data;
                return requestData;
            });
        } catch (error) {
            logger.error('LeaveService: Get role-based pending requests failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get all leave requests (for admin view)
     */
    async getAllLeaveRequests(status?: string): Promise<ILeaveRequest[]> {
        try {
            const { data: result, error } = await this.supabase
                .rpc('get_all_leave_requests', {
                    p_status: status || null
                });

            if (error) {
                logger.error('LeaveService: Failed to get all leave requests', { error: error.message });
                throw error;
            }

            if (!result) {
                return [];
            }

            // Parse the JSON result
            const leaveRequests = typeof result === 'string' ? JSON.parse(result) : result;
            
            return Array.isArray(leaveRequests) ? leaveRequests : [];
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

            const { data: result, error } = await this.supabase
                .rpc('update_leave_request_status', {
                    p_request_id: leaveRequestId,
                    p_status: 'approved',
                    p_approved_by: data.approved_by,
                    p_approval_comments: data.notes || null
                });

            if (error) {
                logger.error('LeaveService: Failed to approve leave request', { error: error.message });
                throw error;
            }

            if (!result) {
                throw new Error('No data returned from leave request approval');
            }

            // Parse the JSON result
            const updatedRequest = typeof result === 'string' ? JSON.parse(result) : result;
            
            // Check if error was returned from function
            if (updatedRequest.error) {
                throw new Error(updatedRequest.error);
            }

            // Notify the employee about approval
            await this.notificationService.createNotification({
                userId: updatedRequest.employee_id,
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

            const { data: result, error } = await this.supabase
                .rpc('update_leave_request_status', {
                    p_request_id: leaveRequestId,
                    p_status: 'rejected',
                    p_approved_by: data.approved_by,
                    p_rejection_reason: data.rejection_reason
                });

            if (error) {
                logger.error('LeaveService: Failed to reject leave request', { error: error.message });
                throw error;
            }

            if (!result) {
                throw new Error('No data returned from leave request rejection');
            }

            // Parse the JSON result
            const updatedRequest = typeof result === 'string' ? JSON.parse(result) : result;
            
            // Check if error was returned from function
            if (updatedRequest.error) {
                throw new Error(updatedRequest.error);
            }

            // Notify the employee about rejection
            await this.notificationService.createNotification({
                userId: updatedRequest.employee_id,
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