import { IAttendanceRepository } from '../interfaces/IAttendanceRepository';
import { Attendance, CreateAttendanceRequest, AttendanceQuery } from '../../models/Attendance';
export declare class SupabaseAttendanceRepository implements IAttendanceRepository {
    private supabase;
    constructor(supabase: any);
    checkIn(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<Attendance>;
    checkOut(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<Attendance>;
    getCurrentStatus(employeeId: string): Promise<Attendance | null>;
    getAttendanceHistory(query: AttendanceQuery): Promise<{
        attendances: Attendance[];
        total: number;
        page: number;
        limit: number;
    }>;
    getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
    getAttendanceById(id: string): Promise<Attendance | null>;
    updateAttendance(id: string, attendanceData: Partial<Attendance>): Promise<Attendance>;
    deleteAttendance(id: string): Promise<void>;
    getAttendanceReport(employeeId?: string, startDate?: Date, endDate?: Date): Promise<any[]>;
    private mapSupabaseAttendanceToAttendance;
    getEmployeeIdFromUserId(userId: string): Promise<string>;
}
//# sourceMappingURL=SupabaseAttendanceRepository.d.ts.map