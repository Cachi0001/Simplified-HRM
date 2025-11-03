import api from '../lib/api';

export interface Employee {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'hr' | 'teamlead' | 'employee';
  department: string;
  department_id: string;
  position: string;
  phone: string;
  address: string;
  date_of_birth: string;
  hire_date: string;
  profile_picture: string;
  status: 'active' | 'pending' | 'rejected';
  work_type: 'onsite' | 'remote' | 'hybrid';
  work_days: string[];
  salary: number;
  manager_id: string;
  profile_updated_at: string;
  created_at: string;
  updated_at: string;
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
      const response = await api.get('/employees');
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
}

export const employeeService = new EmployeeService();