import api from '../lib/api';

export interface PerformanceMetrics {
  employee_id: string;
  full_name?: string;
  department_name?: string;
  period_start: string;
  period_end: string;
  expected_working_days: number;
  days_present: number;
  days_late: number;
  average_late_minutes: number;
  total_tasks_assigned: number;
  total_tasks_completed: number;
  tasks_completed_on_time: number;
  attendance_score: number;
  punctuality_score: number;
  task_completion_score: number;
  overall_score: number;
}

class PerformanceService {
  async getMyPerformance(startDate?: Date, endDate?: Date): Promise<PerformanceMetrics> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);

      const queryString = params.toString();
      const url = queryString ? `/performance/my-performance?${queryString}` : '/performance/my-performance';
      
      const response = await api.get(url);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get my performance:', error);
      throw error;
    }
  }

  async getEmployeePerformance(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetrics> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);

      const queryString = params.toString();
      const url = queryString 
        ? `/performance/${employeeId}?${queryString}` 
        : `/performance/${employeeId}`;
      
      const response = await api.get(url);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get employee performance:', error);
      throw error;
    }
  }

  async getAllPerformance(startDate?: Date, endDate?: Date): Promise<PerformanceMetrics[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);

      const queryString = params.toString();
      const url = queryString ? `/performance/all?${queryString}` : '/performance/all';
      
      const response = await api.get(url);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get all performance:', error);
      throw error;
    }
  }

  async getHistoricalMetrics(employeeId: string, limit: number = 12): Promise<any[]> {
    try {
      const response = await api.get(`/performance/${employeeId}/history?limit=${limit}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get historical metrics:', error);
      throw error;
    }
  }
}

export const performanceService = new PerformanceService();
export default performanceService;
