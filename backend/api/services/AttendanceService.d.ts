import { IAttendanceRepository } from '../repositories/interfaces/IAttendanceRepository';
import { IAttendance, CreateAttendanceRequest } from '../models/Attendance';
export declare class AttendanceService {
    private attendanceRepository;
    constructor(attendanceRepository: IAttendanceRepository);
    checkIn(userId: string, attendanceData: CreateAttendanceRequest): Promise<IAttendance>;
    checkOut(userId: string, attendanceData: CreateAttendanceRequest): Promise<IAttendance>;
    getCurrentStatus(userId: string): Promise<IAttendance | null>;
    getAttendanceHistory(employeeId: string, startDate?: Date, endDate?: Date, page?: number, limit?: number): Promise<{
        attendances: IAttendance[];
        total: number;
        page: number;
        limit: number;
    }>;
    getMyAttendanceHistory(userId: string, startDate?: Date, endDate?: Date, page?: number, limit?: number): Promise<{
        attendances: IAttendance[];
        total: number;
        page: number;
        limit: number;
    }>;
    getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date): Promise<IAttendance[]>;
    getAttendanceById(id: string): Promise<IAttendance | null>;
    updateAttendance(id: string, attendanceData: Partial<IAttendance>): Promise<IAttendance>;
    deleteAttendance(id: string): Promise<void>;
    getAttendanceReport(employeeId?: string, startDate?: Date, endDate?: Date): Promise<any[]>;
    private verifyOfficeLocation;
    private calculateDistanceFromOffice;
    private getEmployeeIdFromUserId;
}
//# sourceMappingURL=AttendanceService.d.ts.map