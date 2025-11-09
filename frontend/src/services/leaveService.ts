import api from '../lib/api';

export interface LeaveType {
  leave_type: string;
  description: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: string;
  approver_name?: string;
  approved_at?: string;
  admin_comments?: string;
  created_at: string;
}

export interface CreateLeaveRequestData {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  notes?: string;
}

class LeaveService {
  /**
   * Get available leave types with balances for current user
   */
  async getAvailableLeaveTypes(): Promise<LeaveType[]> {
    try {
      const response = await api.get<{ success: boolean; data: LeaveType[] }>('/leave/available-types');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get available leave types:', error);
      throw error;
    }
  }

  /**
   * Get my leave requests
   */
  async getMyLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const response = await api.get<{ success: boolean; data: LeaveRequest[] }>('/leave/my-requests');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get leave requests:', error);
      throw error;
    }
  }

  /**
   * Create a new leave request
   */
  async createLeaveRequest(data: CreateLeaveRequestData): Promise<LeaveRequest> {
    try {
      const response = await api.post<{ success: boolean; data: LeaveRequest }>('/leave/request', data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create leave request:', error);
      throw error;
    }
  }

  /**
   * Cancel a leave request
   */
  async cancelLeaveRequest(requestId: string): Promise<void> {
    try {
      await api.delete(`/leave/request/${requestId}`);
    } catch (error) {
      console.error('Failed to cancel leave request:', error);
      throw error;
    }
  }

  /**
   * Get all leave requests (admin/hr)
   */
  async getAllLeaveRequests(status?: string): Promise<LeaveRequest[]> {
    try {
      const params = status ? `?status=${status}` : '';
      const response = await api.get<{ success: boolean; data: LeaveRequest[] }>(`/leave/requests${params}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get all leave requests:', error);
      throw error;
    }
  }

  /**
   * Approve a leave request (admin/hr)
   */
  async approveLeaveRequest(requestId: string, comments?: string): Promise<void> {
    try {
      await api.post(`/leave/request/${requestId}/approve`, { comments });
    } catch (error) {
      console.error('Failed to approve leave request:', error);
      throw error;
    }
  }

  /**
   * Reject a leave request (admin/hr)
   */
  async rejectLeaveRequest(requestId: string, reason: string): Promise<void> {
    try {
      await api.post(`/leave/request/${requestId}/reject`, { reason });
    } catch (error) {
      console.error('Failed to reject leave request:', error);
      throw error;
    }
  }
}

export const leaveService = new LeaveService();
export default leaveService;
