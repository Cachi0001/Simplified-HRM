import { Request, Response } from 'express';
import { EmployeeService } from '../services/EmployeeService';
export declare class EmployeeController {
    private employeeService;
    constructor(employeeService: EmployeeService);
    createEmployee(req: Request, res: Response): Promise<void>;
    getAllEmployees(req: Request, res: Response): Promise<void>;
    getEmployeeById(req: Request, res: Response): Promise<void>;
    getPendingApprovals(req: Request, res: Response): Promise<void>;
    getMyProfile(req: Request, res: Response): Promise<void>;
    updateEmployee(req: Request, res: Response): Promise<void>;
    updateMyProfile(req: Request, res: Response): Promise<void>;
    deleteEmployee(req: Request, res: Response): Promise<void>;
    searchEmployees(req: Request, res: Response): Promise<void>;
    approveEmployee(req: Request, res: Response): Promise<void>;
    assignDepartment(req: Request, res: Response): Promise<void>;
    getEmployeeStats(req: Request, res: Response): Promise<void>;
    rejectEmployee(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=EmployeeController.d.ts.map