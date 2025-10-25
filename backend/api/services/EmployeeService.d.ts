import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IEmployee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../models/Employee';
export declare class EmployeeService {
    private employeeRepository;
    constructor(employeeRepository: IEmployeeRepository);
    createEmployee(employeeData: CreateEmployeeRequest, userId: string, currentUserRole: string): Promise<IEmployee>;
    getAllEmployees(query?: EmployeeQuery, currentUserRole?: string): Promise<{
        employees: IEmployee[];
        total: number;
        page: number;
        limit: number;
    }>;
    searchEmployees(query: string, currentUserRole?: string): Promise<IEmployee[]>;
    getEmployeeById(id: string, currentUserRole: string, currentUserId?: string): Promise<IEmployee | null>;
    getMyProfile(userId: string): Promise<IEmployee | null>;
    updateEmployee(id: string, employeeData: UpdateEmployeeRequest, currentUserRole: string, currentUserId?: string): Promise<IEmployee>;
    updateMyProfile(employeeData: UpdateEmployeeRequest, userId: string): Promise<IEmployee>;
    deleteEmployee(id: string, currentUserRole: string): Promise<void>;
    getPendingApprovals(): Promise<IEmployee[]>;
    approveEmployee(id: string): Promise<IEmployee>;
    rejectEmployee(id: string): Promise<void>;
    assignDepartment(id: string, department: string): Promise<IEmployee>;
    getEmployeeStats(): Promise<{
        total: number;
        active: number;
        pending: number;
        rejected: number;
    }>;
}
//# sourceMappingURL=EmployeeService.d.ts.map