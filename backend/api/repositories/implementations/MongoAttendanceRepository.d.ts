import { IAttendanceRepository } from '../interfaces/IAttendanceRepository';
import { CreateAttendanceRequest, AttendanceQuery, IAttendance } from '../../models/Attendance';
export declare class MongoAttendanceRepository implements IAttendanceRepository {
    checkIn(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<IAttendance>;
    checkOut(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<IAttendance>;
    getCurrentStatus(employeeId: string): Promise<IAttendance | null>;
    getAttendanceHistory(query: AttendanceQuery): Promise<{
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
    getEmployeeIdFromUserId(userId: string): Promise<string>;
}
//# sourceMappingURL=MongoAttendanceRepository.d.ts.map