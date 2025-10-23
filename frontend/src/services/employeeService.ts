import api, { Employee, EmployeeQuery } from '../lib/api';

export interface CreateEmployeeRequest {
  email: string;
  fullName: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

export class EmployeeService {
  private static instance: EmployeeService;

  public static getInstance(): EmployeeService {
    if (!EmployeeService.instance) {
      EmployeeService.instance = new EmployeeService();
    }
    return EmployeeService.instance;
  }

  // Get all employees with optional filtering
  async getAllEmployees(query?: EmployeeQuery): Promise<{
    employees: Employee[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await api.get('/employees', { params: query });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch employees');
    }
  }

  // Get employee by ID
  async getEmployeeById(id: string): Promise<Employee> {
    try {
      const response = await api.get(`/employees/${id}`);
      return response.data.data.employee;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch employee');
    }
  }

  // Get current user's profile
  async getMyProfile(): Promise<Employee> {
    try {
      const response = await api.get('/employees/me');
      return response.data.data.employee;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch profile');
    }
  }

  // Update current user's profile
  async updateMyProfile(data: Partial<CreateEmployeeRequest>): Promise<Employee> {
    try {
      const response = await api.put('/employees/me', data);
      return response.data.data.employee;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  // Search employees
  async searchEmployees(query: string): Promise<Employee[]> {
    try {
      const response = await api.get('/employees/search', {
        params: { q: query }
      });
      return response.data.data.employees;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Search failed');
    }
  }

  // Create employee (admin only)
  async createEmployee(employeeData: CreateEmployeeRequest): Promise<Employee> {
    try {
      const response = await api.post('/employees', employeeData);
      return response.data.data.employee;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create employee');
    }
  }

  // Update employee (admin only)
  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    try {
      const response = await api.put(`/employees/${id}`, data);
      return response.data.data.employee;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update employee');
    }
  }

  // Delete employee (admin only)
  async deleteEmployee(id: string): Promise<void> {
    try {
      await api.delete(`/employees/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete employee');
    }
  }

  // Get pending approvals (admin only)
  async getPendingApprovals(): Promise<Employee[]> {
    try {
      const response = await api.get('/employees/pending');
      return response.data.employees || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch pending approvals');
    }
  }

  // Approve employee (admin only)
  async approveEmployee(id: string): Promise<Employee> {
    try {
      const response = await api.post(`/employees/${id}/approve`);
      return response.data.data.employee;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve employee');
    }
  }

  // Reject employee (admin only)
  async rejectEmployee(id: string): Promise<void> {
    try {
      await api.post(`/employees/${id}/reject`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject employee');
    }
  }
}

// Export singleton instance
export const employeeService = EmployeeService.getInstance();
