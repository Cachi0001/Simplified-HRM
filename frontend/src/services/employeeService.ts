import api from '../lib/api';

export interface Employee {
  id: string;
  user_id?: string;
  employee_id?: string;
  email: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'hr' | 'teamlead' | 'employee';
  department?: string;
  department_id?: string;
  position?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  hire_date?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  status: 'active' | 'pending' | 'rejected' | 'inactive' | 'terminated';
  work_type?: 'onsite' | 'remote' | 'hybrid';
  work_days?: string[];
  salary?: number;
  manager_id?: string;
  manager_name?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  user_is_active?: boolean;
  user_email_verified?: boolean;
  profile_updated_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
}

export interface BulkUpdate {
  employeeId: string;
  updates: Partial<Employee>;
}

export interface BulkUpdateResult {
  success: string[];
  failed: { id: string; error: string }[];
}

class EmployeeService {
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const response = await api.get('/employees/management');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      throw new Error('Failed to fetch employees');
    }
  }

  async getEmployee(id: string): Promise<Employee> {
    try {
      const response = await api.get(`/employees/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch employee ${id}:`, error);
      throw new Error('Failed to fetch employee');
    }
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    try {
      const response = await api.put(`/employees/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to update employee ${id}:`, error);
      throw new Error('Failed to update employee');
    }
  }

  async getDepartments(): Promise<Department[]> {
    try {
      const response = await api.get('/departments');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      throw new Error('Failed to fetch departments');
    }
  }

  async bulkUpdateEmployees(updates: BulkUpdate[]): Promise<BulkUpdateResult> {
    try {
      const response = await api.post('/employees/bulk-update', { updates });
      return response.data.data;
    } catch (error) {
      console.error('Failed to bulk update employees:', error);
      throw new Error('Failed to bulk update employees');
    }
  }

  async updateMyProfile(data: Partial<Employee>): Promise<Employee> {
    try {
      const response = await api.put('/employees/my-profile', data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update my profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  async getMyProfile(): Promise<Employee> {
    try {
      const response = await api.get('/employees/my-profile');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch my profile:', error);
      throw new Error('Failed to fetch profile');
    }
  }

  async getEmployeesForTasks(): Promise<Employee[]> {
    try {
      const response = await api.get('/employees/for-tasks');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch employees for tasks:', error);
      throw new Error('Failed to fetch employees for tasks');
    }
  }

  async updateEmployeeStatus(employeeId: string, newStatus: string, reason?: string): Promise<{
    success: boolean;
    employee?: Employee;
    error?: string;
    change_log?: any;
  }> {
    try {
      const response = await api.put(`/employees/${employeeId}/status`, {
        status: newStatus,
        reason: reason
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to update employee status:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to update employee status';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async updateEmployeeFields(employeeId: string, fields: {
    department_id?: string;
    position?: string;
    role?: string;
    manager_id?: string;
    salary?: number;
  }): Promise<{
    success: boolean;
    employee?: Employee;
    error?: string;
  }> {
    try {
      const response = await api.put(`/employees/${employeeId}/fields`, fields);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update employee fields:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to update employee fields';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getEmployeeStatusHistory(employeeId: string): Promise<any[]> {
    try {
      const response = await api.get(`/employees/${employeeId}/status-history`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch employee status history:', error);
      throw new Error('Failed to fetch employee status history');
    }
  }
}

export const employeeService = new EmployeeService();