import { EmployeeRepository, Employee } from '../repositories/EmployeeRepository';
import { UserRepository } from '../repositories/UserRepository';
import { EmailService } from './EmailService';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

    // Employees and teamleads can only update personal information
    // Admins, HR, and superadmins can update work-related information
    const canUpdateWorkInfo = ['superadmin', 'admin', 'hr'].includes(user.role);

    let updated: Employee;

    if (canUpdateWorkInfo && (data.position || data.department_id)) {
      // Admin/HR updating work information
      const result = await pool.query(
        `SELECT * FROM update_employee_work_profile($1, $2, $3, $4, $5, $6)`,
        [
          employee.id,
          data.position || null,
          data.department_id || null,
          data.salary || null,
          data.team_lead_id || null,
          data.role || null
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

  async updateMyWorkingDays(userId: string, workingDays: string[]): Promise<Employee> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    return await this.updateWorkingDays(employee.id, workingDays);
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
}
