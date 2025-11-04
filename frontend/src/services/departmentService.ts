import api from '../lib/api';

export interface Department {
  id: string;
  name: string;
  description?: string;
  team_lead_id?: string;
  team_lead_name?: string;
  type?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  members?: DepartmentMember[];
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  user_name: string;
  role: string;
  joined_at: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  team_lead_id?: string;
  type?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  team_lead_id?: string;
  type?: string;
}

export interface AddMemberRequest {
  user_id: string;
  role?: string;
}

class DepartmentService {
  /**
   * Get all departments
   */
  async getAllDepartments(): Promise<Department[]> {
    try {
      const response = await api.get('/departments');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      throw error;
    }
  }

  /**
   * Get department by ID
   */
  async getDepartment(id: string): Promise<Department> {
    try {
      const response = await api.get(`/departments/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch department:', error);
      throw error;
    }
  }

  /**
   * Create new department
   */
  async createDepartment(data: CreateDepartmentRequest): Promise<Department> {
    try {
      const response = await api.post('/departments', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to create department:', error);
      throw error;
    }
  }

  /**
   * Update department
   */
  async updateDepartment(id: string, data: UpdateDepartmentRequest): Promise<Department> {
    try {
      const response = await api.put(`/departments/${id}`, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to update department:', error);
      throw error;
    }
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string): Promise<void> {
    try {
      await api.delete(`/departments/${id}`);
    } catch (error) {
      console.error('Failed to delete department:', error);
      throw error;
    }
  }

  /**
   * Get department members
   */
  async getDepartmentMembers(id: string): Promise<DepartmentMember[]> {
    try {
      const response = await api.get(`/departments/${id}/members`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch department members:', error);
      throw error;
    }
  }

  /**
   * Add member to department
   */
  async addDepartmentMember(id: string, data: AddMemberRequest): Promise<DepartmentMember> {
    try {
      const response = await api.post(`/departments/${id}/members`, data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to add department member:', error);
      throw error;
    }
  }

  /**
   * Remove member from department
   */
  async removeDepartmentMember(departmentId: string, userId: string): Promise<void> {
    try {
      await api.delete(`/departments/${departmentId}/members/${userId}`);
    } catch (error) {
      console.error('Failed to remove department member:', error);
      throw error;
    }
  }

  /**
   * Update member role in department
   */
  async updateMemberRole(departmentId: string, userId: string, role: string): Promise<DepartmentMember> {
    try {
      const response = await api.put(`/departments/${departmentId}/members/${userId}/role`, { role });
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(id: string): Promise<any> {
    try {
      const response = await api.get(`/departments/${id}/stats`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch department stats:', error);
      throw error;
    }
  }

  /**
   * Search departments
   */
  async searchDepartments(query: string): Promise<Department[]> {
    try {
      const response = await api.get(`/departments/search?q=${encodeURIComponent(query)}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to search departments:', error);
      throw error;
    }
  }

  /**
   * Get my departments (for team leads)
   */
  async getMyDepartments(): Promise<Department[]> {
    try {
      const response = await api.get('/departments/my-departments');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch my departments:', error);
      throw error;
    }
  }

  /**
   * Send notification to department
   */
  async sendDepartmentNotification(id: string, notification: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
  }): Promise<void> {
    try {
      await api.post(`/departments/${id}/notify`, notification);
    } catch (error) {
      console.error('Failed to send department notification:', error);
      throw error;
    }
  }

  /**
   * Broadcast message to department
   */
  async broadcastToDepartment(id: string, broadcast: {
    title: string;
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    requires_acknowledgment?: boolean;
  }): Promise<void> {
    try {
      await api.post(`/departments/${id}/broadcast`, broadcast);
    } catch (error) {
      console.error('Failed to broadcast to department:', error);
      throw error;
    }
  }
}

export const departmentService = new DepartmentService();
export default departmentService;