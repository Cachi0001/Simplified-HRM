import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../../models/Employee';

export interface IEmployeeRepository {
  create(employeeData: CreateEmployeeRequest, userId: string): Promise<Employee>;
  findAll(query?: EmployeeQuery): Promise<{ employees: Employee[]; total: number; page: number; limit: number }>;
  findById(id: string): Promise<Employee | null>;
  findByUserId(userId: string): Promise<Employee | null>;
  update(id: string, employeeData: UpdateEmployeeRequest): Promise<Employee>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Employee[]>;
  getPendingApprovals(): Promise<Employee[]>;
  approve(id: string): Promise<Employee>;
}
