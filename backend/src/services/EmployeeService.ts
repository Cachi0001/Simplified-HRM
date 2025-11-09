import { EmployeeRepository, Employee } from '../repositories/EmployeeRepository';
import { UserRepository } from '../repositories/UserRepository';
import { EmailService } from './EmailService';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { pool } from '../config/database';

export class EmployeeService {
  private employeeRepo: EmployeeRepository;
  private userRepo: UserRepository;
  private emailService: EmailService;

  constructor() {
    this.employeeRepo = new EmployeeRepository();
    this.userRepo = new UserRepository();
    this.emailService = new EmailService();
  }

  async getPendingEmployees(): Promise<Employee[]> {
    return await this.employeeRepo.findPending();
  }

  async getAllEmployees(filters?: { status?: string; department?: string }): Promise<Employee[]> {
    return await this.employeeRepo.findAll(filters);
  }

  async getActiveEmployees(): Promise<Employee[]> {
    return await this.employeeRepo.findAll({ status: 'active' });
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  async getEmployeeByUserId(userId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }
    return employee;
  }

  async getMyProfileWithCompletion(userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT get_my_profile($1) as profile_data`,
      [userId]
    );

    const profileData = result.rows[0]?.profile_data;

    if (!profileData || !profileData.success) {
      throw new NotFoundError('Profile not found');
    }

    return profileData;
  }

  async updateMyProfile(userId: string, data: Partial<Employee>): Promise<Employee> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    // Get user to check role
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Employees and teamleads can update position (their job title)
    // Only Admins, HR, and superadmins can update department, salary, role, team_lead
    const canUpdateWorkInfo = ['superadmin', 'admin', 'hr'].includes(user.role);

    let updated: Employee;

    // Allow employees to update their position, but only admin can update other work fields
    if (data.position || (canUpdateWorkInfo && (data.department_id || data.salary || data.team_lead_id || data.role))) {
      // Update work information
      const result = await pool.query(
        `SELECT * FROM update_employee_work_profile($1, $2, $3, $4, $5, $6)`,
        [
          employee.id,
          data.position || null,
          canUpdateWorkInfo ? (data.department_id || null) : null,  // Only admin can change department
          canUpdateWorkInfo ? (data.salary || null) : null,  // Only admin can change salary
          canUpdateWorkInfo ? (data.team_lead_id || null) : null,  // Only admin can change team lead
          canUpdateWorkInfo ? (data.role || null) : null  // Only admin can change role
        ]
      );
      updated = result.rows[0];
    }

    // Update personal information (all users can do this)
    const personalResult = await pool.query(
      `SELECT * FROM update_my_personal_profile($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        employee.id,
        data.full_name || null,
        data.phone || null,
        data.address || null,
        data.date_of_birth || null,
        data.emergency_contact_name || null,
        data.emergency_contact_phone || null,
        data.profile_picture || null
      ]
    );

    updated = personalResult.rows[0];

    // Update working days if provided
    if (data.working_days || (data as any).work_days) {
      const workingDays = data.working_days || (data as any).work_days;
      await this.employeeRepo.updateWorkingDays(employee.id, workingDays);
    }

    // Notify supervisors of profile update
    await pool.query(
      `SELECT notify_supervisors_profile_update($1, $2)`,
      [employee.id, updated.full_name]
    );

    return updated;
  }

  async approveEmployee(employeeId: string, approvedById: string, role: string): Promise<{ message: string; employee: Employee }> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.status !== 'pending') {
      throw new ValidationError('Employee is not pending approval');
    }

    // Get approver employee record
    const approver = await this.employeeRepo.findByUserId(approvedById);
    if (!approver) {
      throw new NotFoundError('Approver not found');
    }

    // Use the database function for approval
    const result = await pool.query(
      `SELECT approve_employee($1, $2, $3)`,
      [employeeId, approver.id, role]
    );

    const response = result.rows[0].approve_employee;

    if (!response.success) {
      throw new ValidationError(response.message);
    }

    // Verify email when approving
    await pool.query(
      `UPDATE users SET email_verified = true WHERE id = $1`,
      [employee.user_id]
    );

    // Initialize leave balances for the approved employee
    await pool.query(
      `SELECT initialize_leave_balances($1)`,
      [employeeId]
    );

    // Send approval email
    await this.emailService.sendApprovalEmail(employee.email, employee.full_name);

    // Get updated employee
    const updatedEmployee = await this.employeeRepo.findById(employeeId);

    return {
      message: response.message,
      employee: updatedEmployee!
    };
  }

  async rejectEmployee(employeeId: string, rejectedById: string, reason: string): Promise<{ message: string; employee: Employee }> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.status !== 'pending') {
      throw new ValidationError('Employee is not pending approval');
    }

    // Get rejector employee record
    const rejector = await this.employeeRepo.findByUserId(rejectedById);
    if (!rejector) {
      throw new NotFoundError('Rejector not found');
    }

    // Use the database function for rejection
    const result = await pool.query(
      `SELECT reject_employee($1, $2, $3)`,
      [employeeId, rejector.id, reason]
    );

    const response = result.rows[0].reject_employee;

    if (!response.success) {
      throw new ValidationError(response.message);
    }

    // Send rejection email
    await this.emailService.sendRejectionEmail(employee.email, employee.full_name, reason);

    // Get updated employee
    const updatedEmployee = await this.employeeRepo.findById(employeeId);

    return {
      message: response.message,
      employee: updatedEmployee!
    };
  }

  async updateWorkingDays(employeeId: string, workingDays: string[]): Promise<Employee> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Validate working days
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const normalizedDays = workingDays.map(day => day.toLowerCase());
    const invalidDays = normalizedDays.filter(day => !validDays.includes(day));
    
    if (invalidDays.length > 0) {
      throw new ValidationError(`Invalid working days: ${invalidDays.join(', ')}`);
    }

    // Use the database function for updating working schedule
    const result = await pool.query(
      `SELECT * FROM update_my_working_schedule($1, $2)`,
      [employeeId, JSON.stringify(normalizedDays)]
    );

    return result.rows[0];
  }

  async updateMyWorkingDays(userId: string, workingDays: string[], workingHours?: { start: string; end: string }, timezone?: string): Promise<Employee> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    // Update working days, hours, and timezone
    const updateData: any = { working_days: workingDays };
    if (workingHours) {
      updateData.working_hours = workingHours;
    }
    if (timezone) {
      updateData.timezone = timezone;
    }

    return await this.employeeRepo.updateProfile(employee.id, updateData);
  }

  async bulkUpdateEmployees(updates: Array<{ id: string; data: Partial<Employee> }>): Promise<Array<{ id: string; success: boolean; employee?: Employee; error?: string }>> {
    const results = await Promise.all(
      updates.map(async (update) => {
        try {
          const employee = await this.employeeRepo.updateProfile(update.id, update.data);
          return { id: update.id, success: true, employee };
        } catch (error: any) {
          return { id: update.id, success: false, error: error.message };
        }
      })
    );

    return results;
  }

  async updateEmployeeStatus(employeeId: string, status: string): Promise<Employee> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Update employee status
    const result = await pool.query(
      `UPDATE employees SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, employeeId]
    );

    // If status is being set to active, also verify the email
    if (status === 'active') {
      await pool.query(
        `UPDATE users SET email_verified = true WHERE id = $1`,
        [employee.user_id]
      );
    }

    return result.rows[0];
  }

  async updateEmployeeFields(employeeId: string, data: Partial<Employee>): Promise<Employee> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    return await this.employeeRepo.updateProfile(employeeId, data);
  }
}
