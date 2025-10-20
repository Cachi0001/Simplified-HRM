import { Attendance, CreateAttendanceRequest, AttendanceQuery } from '../../models/Attendance';

export interface IAttendanceRepository {
  checkIn(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<Attendance>;
  checkOut(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<Attendance>;
  getCurrentStatus(employeeId: string): Promise<Attendance | null>;
  getAttendanceHistory(query: AttendanceQuery): Promise<{ attendances: Attendance[]; total: number; page: number; limit: number }>;
  getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  getAttendanceById(id: string): Promise<Attendance | null>;
  updateAttendance(id: string, attendanceData: Partial<Attendance>): Promise<Attendance>;
  deleteAttendance(id: string): Promise<void>;
  getAttendanceReport(employeeId?: string, startDate?: Date, endDate?: Date): Promise<any[]>;
  getEmployeeIdFromUserId(userId: string): Promise<string>;
}
