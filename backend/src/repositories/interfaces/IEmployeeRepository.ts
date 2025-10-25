import { CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery, IEmployee } from '../../models/SupabaseEmployee';

export interface IEmployeeRepository {
  create(employeeData: CreateEmployeeRequest, userId: string): Promise<IEmployee>;
  findAll(query?: EmployeeQuery): Promise<{ employees: IEmployee[]; total: number; page: number; limit: number }>;
  findById(id: string): Promise<IEmployee | null>;
  findByUserId(userId: string): Promise<IEmployee | null>;
  update(id: string, employeeData: UpdateEmployeeRequest): Promise<IEmployee>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<IEmployee[]>;
  getPendingApprovals(): Promise<IEmployee[]>;
  approve(id: string): Promise<IEmployee>;
  getEmployeeStats(): Promise<{ total: number; active: number; pending: number; rejected: number }>;
  assignDepartment(id: string, department: string): Promise<IEmployee>;
}
