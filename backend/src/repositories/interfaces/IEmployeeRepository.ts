import { CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery, IEmployee } from '../../models/SupabaseEmployee';

export interface IEmployeeRepository {
  create(employeeData: CreateEmployeeRequest, userId: string): Promise<any>;
  findAll(query?: EmployeeQuery): Promise<{ employees: any[]; total: number; page: number; limit: number }>;
  findById(id: string): Promise<any | null>;
  findByUserId(userId: string): Promise<any | null>;
  update(id: string, employeeData: UpdateEmployeeRequest): Promise<any>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<any[]>;
  getPendingApprovals(): Promise<any[]>;
  approve(id: string): Promise<any>;
  getEmployeeStats(): Promise<{ total: number; active: number; pending: number; rejected: number }>;
  assignDepartment(id: string, department: string): Promise<any>;
  updateEmailVerification(userId: string, verified: boolean): Promise<void>;
}
