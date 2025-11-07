import { LeaveRepository, CreateLeaveRequestData, LeaveRequest, LeaveBalance } from '../repositories/LeaveRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { EmailService } from './EmailService';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class LeaveService {
  private leaveRepo: LeaveRepository;
  private employeeRepo: EmployeeRepository;
  private emailService: EmailService;

  constructor() {
    this.leaveRepo = new LeaveRepository();
    this.employeeRepo = new EmployeeRepository();
    this.emailService = new EmailService();
  }

  async createLeaveRequest(userId: string, data: Omit<CreateLeaveRequestData, 'employeeId'>): Promise<any> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    if (employee.status !== 'active') {
      throw new ValidationError('Only active employees can request leave');
    }

    const requestData: CreateLeaveRequestData = {
      employeeId: employee.id,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      notes: data.notes
    };

    const result = await this.leaveRepo.createLeaveRequest(requestData);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return result;
  }

  async getMyLeaveRequests(userId: string, status?: string): Promise<LeaveRequest[]> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    return await this.leaveRepo.getLeaveRequests(employee.id, status);
  }

  async getAllLeaveRequests(status?: string): Promise<LeaveRequest[]> {
    return await this.leaveRepo.getLeaveRequests(undefined, status);
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRepo.getLeaveRequestById(id);
    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }
    return leaveRequest;
  }

  async getMyLeaveBalances(userId: string, year?: number): Promise<LeaveBalance[]> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    return await this.leaveRepo.getLeaveBalances(employee.id, year);
  }

  async getLeaveBalances(employeeId: string, year?: number): Promise<LeaveBalance[]> {
    return await this.leaveRepo.getLeaveBalances(employeeId, year);
  }

  async approveLeaveRequest(leaveRequestId: string, approvedByUserId: string, comments?: string): Promise<{ message: string; leaveRequest: LeaveRequest }> {
    const leaveRequest = await this.leaveRepo.getLeaveRequestById(leaveRequestId);
    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    if (leaveRequest.status !== 'pending') {
      throw new ValidationError(`Cannot approve leave request with status: ${leaveRequest.status}`);
    }

    const approver = await this.employeeRepo.findByUserId(approvedByUserId);
    if (!approver) {
      throw new NotFoundError('Approver not found');
    }

    if (!['superadmin', 'admin', 'hr'].includes(approver.role)) {
      throw new ValidationError('You do not have permission to approve leave requests');
    }

    const result = await this.leaveRepo.approveLeaveRequest(leaveRequestId, approver.id, comments);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    await this.emailService.sendLeaveApprovedEmail(
      leaveRequest.employee_email!,
      leaveRequest.employee_name!,
      leaveRequest.leave_type,
      leaveRequest.start_date,
      leaveRequest.end_date
    );

    const updatedLeaveRequest = await this.leaveRepo.getLeaveRequestById(leaveRequestId);

    return {
      message: result.message,
      leaveRequest: updatedLeaveRequest!
    };
  }

  async rejectLeaveRequest(leaveRequestId: string, rejectedByUserId: string, reason: string): Promise<{ message: string; leaveRequest: LeaveRequest }> {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    const leaveRequest = await this.leaveRepo.getLeaveRequestById(leaveRequestId);
    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    if (leaveRequest.status !== 'pending') {
      throw new ValidationError(`Cannot reject leave request with status: ${leaveRequest.status}`);
    }

    const rejector = await this.employeeRepo.findByUserId(rejectedByUserId);
    if (!rejector) {
      throw new NotFoundError('Rejector not found');
    }

    if (!['superadmin', 'admin', 'hr'].includes(rejector.role)) {
      throw new ValidationError('You do not have permission to reject leave requests');
    }

    const result = await this.leaveRepo.rejectLeaveRequest(leaveRequestId, rejector.id, reason);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    await this.emailService.sendLeaveRejectedEmail(
      leaveRequest.employee_email!,
      leaveRequest.employee_name!,
      leaveRequest.leave_type,
      reason
    );

    const updatedLeaveRequest = await this.leaveRepo.getLeaveRequestById(leaveRequestId);

    return {
      message: result.message,
      leaveRequest: updatedLeaveRequest!
    };
  }

  async cancelLeaveRequest(leaveRequestId: string, userId: string): Promise<{ message: string }> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    const result = await this.leaveRepo.cancelLeaveRequest(leaveRequestId, employee.id);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return { message: result.message };
  }

  async getMyLeaveStatistics(userId: string, year?: number): Promise<any> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    return await this.leaveRepo.getLeaveStatistics(employee.id, year);
  }

  async getLeaveTypes(): Promise<any[]> {
    return await this.leaveRepo.getLeaveTypes();
  }

  async deleteLeaveRequest(leaveRequestId: string, userId: string): Promise<{ message: string }> {
    const result = await this.leaveRepo.deleteLeaveRequest(leaveRequestId, userId);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return { message: result.message };
  }
}
