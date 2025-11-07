import { AttendanceRepository, ClockInData, ClockOutData, Attendance } from '../repositories/AttendanceRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';

export class AttendanceService {
  private attendanceRepo: AttendanceRepository;
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.attendanceRepo = new AttendanceRepository();
    this.employeeRepo = new EmployeeRepository();
  }

  async clockIn(data: ClockInData): Promise<{ attendance: Attendance; message: string }> {
    const employee = await this.employeeRepo.findById(data.employee_id);
    
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.status !== 'active') {
      throw new ValidationError('Only active employees can clock in');
    }

    const locationValidation = await this.attendanceRepo.validateClockInLocation(
      data.employee_id,
      data.lat,
      data.lng
    );

    if (!locationValidation.is_valid) {
      throw new ValidationError(locationValidation.message);
    }

    const todayAttendance = await this.attendanceRepo.getTodayAttendance(data.employee_id);
    
    if (todayAttendance && todayAttendance.clock_in) {
      throw new ValidationError('You have already clocked in today');
    }

    const attendance = await this.attendanceRepo.clockIn(data);

    const message = attendance.is_late
      ? `Clocked in successfully. You are ${attendance.late_minutes} minutes late.`
      : 'Clocked in successfully. You are on time!';

    return { attendance, message };
  }

  async clockOut(data: ClockOutData): Promise<{ attendance: Attendance; message: string }> {
    const employee = await this.employeeRepo.findById(data.employee_id);
    
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const todayAttendance = await this.attendanceRepo.getTodayAttendance(data.employee_id);
    
    if (!todayAttendance || !todayAttendance.clock_in) {
      throw new ValidationError('You must clock in before clocking out');
    }

    if (todayAttendance.clock_out) {
      throw new ValidationError('You have already clocked out today');
    }

    const locationValidation = await this.attendanceRepo.validateClockOutLocation(
      data.employee_id,
      data.lat,
      data.lng
    );

    if (!locationValidation.is_valid) {
      throw new ValidationError(locationValidation.message);
    }

    const attendance = await this.attendanceRepo.clockOut(data);

    const message = `Clocked out successfully. You worked ${attendance.hours_worked} hours today.`;

    return { attendance, message };
  }

  async getMyRecords(employeeId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    return await this.attendanceRepo.getMyRecords(employeeId, startDate, endDate);
  }

  async getTodayStatus(employeeId: string): Promise<Attendance | null> {
    return await this.attendanceRepo.getTodayAttendance(employeeId);
  }
}
