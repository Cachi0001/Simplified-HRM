import { Request, Response } from 'express';
import { AttendanceService } from '../services/AttendanceService';
export declare class AttendanceController {
    private attendanceService;
    constructor(attendanceService: AttendanceService);
    checkIn(req: Request, res: Response): Promise<void>;
    checkOut(req: Request, res: Response): Promise<void>;
    getCurrentStatus(req: Request, res: Response): Promise<void>;
    getAttendanceHistory(req: Request, res: Response): Promise<void>;
    getEmployeeAttendance(req: Request, res: Response): Promise<void>;
    getAttendanceReport(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AttendanceController.d.ts.map