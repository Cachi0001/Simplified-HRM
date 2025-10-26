import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IEmployee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../models/SupabaseEmployee';
import { EmailService } from './EmailService';
import logger from '../utils/logger';

export class EmployeeService {
  constructor(private employeeRepository: IEmployeeRepository) {}

  private mapEmployee(record: any): IEmployee {
    return {
      id: record.id,
      userId: record.user_id,
      email: record.email,
      fullName: record.full_name,
      role: record.role,
      department: record.department ?? undefined,
      position: record.position ?? undefined,
      phone: record.phone ?? undefined,
      address: record.address ?? undefined,
      dateOfBirth: record.date_of_birth ? new Date(record.date_of_birth) : undefined,
      hireDate: record.hire_date ? new Date(record.hire_date) : undefined,
      profilePicture: record.profile_picture ?? undefined,
      status: record.status,
      emailVerified: record.email_verified ?? false,
      emailVerificationToken: record.email_verification_token ?? undefined,
      emailVerificationExpires: record.email_verification_expires ? new Date(record.email_verification_expires) : undefined,
      passwordResetToken: record.password_reset_token ?? undefined,
      passwordResetExpires: record.password_reset_expires ? new Date(record.password_reset_expires) : undefined,
      createdAt: record.created_at ? new Date(record.created_at) : new Date(),
      updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
    };
  }

  private mapEmployees(records: any[]): IEmployee[] {
    return records.map(record => this.mapEmployee(record));
  }

  async createEmployee(employeeData: CreateEmployeeRequest, userId: string, currentUserRole: string): Promise<IEmployee> {
    try {
      if (currentUserRole !== 'admin') {
        throw new Error('Only administrators can create employees');
      }

      logger.info('EmployeeService: Creating employee', { email: employeeData.email, createdBy: userId });

      if (!employeeData.email || !employeeData.fullName || !employeeData.role) {
        throw new Error('Email, full name, and role are required');
      }

      const employee = await this.employeeRepository.create(employeeData, userId);

      logger.info('EmployeeService: Employee created successfully', { employeeId: employee.id });
      return this.mapEmployee(employee);
    } catch (error) {
      logger.error('EmployeeService: Create employee failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAllEmployees(query?: EmployeeQuery, currentUserRole?: string): Promise<{ employees: IEmployee[]; total: number; page: number; limit: number }> {
    try {
      logger.info('EmployeeService: Getting all employees', { role: currentUserRole });

      if (currentUserRole !== 'admin') {
        query = { ...query, status: 'active' };
      }

      const result = await this.employeeRepository.findAll(query);
      return {
        ...result,
        employees: this.mapEmployees(result.employees)
      };
    } catch (error) {
      logger.error('EmployeeService: Get all employees failed', { error: (error as Error).message });
      throw error;
    }
  }

  async searchEmployees(query: string, currentUserRole?: string): Promise<IEmployee[]> {
    try {
      logger.info('EmployeeService: Searching employees', { query, role: currentUserRole });

      if (currentUserRole === 'admin') {
        query = query;
      }

      const employees = await this.employeeRepository.search(query);
      return this.mapEmployees(employees);
    } catch (error) {
      logger.error('EmployeeService: Search employees failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getEmployeeById(id: string, currentUserRole: string, currentUserId?: string): Promise<IEmployee | null> {
    try {
      const employee = await this.employeeRepository.findById(id);

      if (!employee) {
        return null;
      }

      if (currentUserRole !== 'admin' && employee.user_id !== currentUserId) {
        throw new Error('Access denied');
      }

      return this.mapEmployee(employee);
    } catch (error) {
      logger.error('EmployeeService: Get employee by ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getMyProfile(userId: string): Promise<IEmployee | null> {
    try {
      const employee = await this.employeeRepository.findByUserId(userId);
      return employee ? this.mapEmployee(employee) : null;
    } catch (error) {
      logger.error('EmployeeService: Get my profile failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateEmployee(id: string, employeeData: UpdateEmployeeRequest, currentUserRole: string, currentUserId?: string): Promise<IEmployee> {
    try {
      const existingEmployee = await this.employeeRepository.findById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      if (currentUserRole !== 'admin' && existingEmployee.user_id !== currentUserId) {
        throw new Error('Access denied');
      }

      if (currentUserRole !== 'admin') {
        const allowedFields = ['fullName', 'department', 'position', 'phone', 'address', 'dateOfBirth', 'hireDate', 'profilePicture', 'status'];
        const filteredData: UpdateEmployeeRequest = {};

        allowedFields.forEach(field => {
          if (employeeData[field as keyof UpdateEmployeeRequest] !== undefined) {
            (filteredData as any)[field] = employeeData[field as keyof UpdateEmployeeRequest];
          }
        });

        employeeData = filteredData;
      }

      const updatedEmployee = await this.employeeRepository.update(id, employeeData);

      logger.info('EmployeeService: Employee updated successfully', { employeeId: id });
      return this.mapEmployee(updatedEmployee);
    } catch (error) {
      logger.error('EmployeeService: Update employee failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateMyProfile(employeeData: UpdateEmployeeRequest, userId: string): Promise<IEmployee> {
    try {
      const employee = await this.employeeRepository.findByUserId(userId);
      if (!employee) {
        throw new Error('Employee profile not found');
      }

      return await this.updateEmployee(employee.id, employeeData, 'employee', userId);
    } catch (error) {
      logger.error('EmployeeService: Update my profile failed', { error: (error as Error).message });
      throw error;
    }
  }

  async deleteEmployee(id: string, currentUserRole: string): Promise<void> {
    try {
      if (currentUserRole !== 'admin') {
        throw new Error('Only administrators can delete employees');
      }

      const employee = await this.employeeRepository.findById(id);
      if (!employee) {
        throw new Error('Employee not found');
      }

      await this.employeeRepository.delete(id);

      logger.info('EmployeeService: Employee deleted successfully', { employeeId: id });
    } catch (error) {
      logger.error('EmployeeService: Delete employee failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getPendingApprovals(): Promise<IEmployee[]> {
    try {
      const employees = await this.employeeRepository.getPendingApprovals();
      return this.mapEmployees(employees);
    } catch (error) {
      logger.error('EmployeeService: Get pending approvals failed', { error: (error as Error).message });
      throw error;
    }
  }

  async approveEmployee(id: string): Promise<IEmployee> {
    try {
      logger.info('🔄 [EmployeeService] Starting employee approval process', { employeeId: id });

      const employee = await this.employeeRepository.findById(id);
      if (!employee) {
        logger.error('❌ [EmployeeService] Employee not found', { employeeId: id });
        throw new Error('Employee not found');
      }

      logger.info('✅ [EmployeeService] Employee found', {
        employeeId: id,
        userId: employee.user_id,
        email: employee.email,
        currentStatus: employee.status
      });

      const updatedEmployee = await this.employeeRepository.approve(id);
      logger.info('✅ [EmployeeService] Employee status updated to active', {
        employeeId: id,
        newStatus: updatedEmployee.status
      });

      logger.info('🔄 [EmployeeService] Updating user email verification', {
        userId: employee.user_id,
        employeeId: id
      });

      await this.employeeRepository.updateEmailVerification(employee.user_id, true);

      logger.info('✅ [EmployeeService] User email verification updated successfully', {
        userId: employee.user_id,
        employeeId: id
      });

      const mappedEmployee = this.mapEmployee(updatedEmployee);

      try {
        const emailService = new EmailService();
        await emailService.sendApprovalConfirmation(mappedEmployee.email, mappedEmployee.fullName);
        logger.info('📧 [EmployeeService] Approval email sent', { email: mappedEmployee.email });
      } catch (emailError) {
        logger.warn('⚠️ [EmployeeService] Approval email failed (non-critical)', { error: (emailError as Error).message });
      }

      logger.info('✅ [EmployeeService] Employee approval process completed successfully', {
        employeeId: id,
        userId: employee.user_id,
        email: employee.email
      });

      return mappedEmployee;
    } catch (error) {
      logger.error('❌ [EmployeeService] Approve employee failed', {
        error: (error as Error).message,
        employeeId: id
      });
      throw error;
    }
  }

  async rejectEmployee(id: string): Promise<void> {
    try {
      await this.employeeRepository.delete(id);

      logger.info('EmployeeService: Employee rejected successfully', { employeeId: id });
    } catch (error) {
      logger.error('EmployeeService: Reject employee failed', { error: (error as Error).message });
      throw error;
    }
  }

  async assignDepartment(id: string, department: string): Promise<IEmployee> {
    try {
      logger.info('EmployeeService: Assigning department', { employeeId: id, department });

      const updatedEmployee = await this.employeeRepository.assignDepartment(id, department);
      const mappedEmployee = this.mapEmployee(updatedEmployee);

      try {
        const emailService = new EmailService();
        await emailService.sendDepartmentAssignmentNotification(
          mappedEmployee.email,
          mappedEmployee.fullName,
          department
        );
        logger.info('📧 Department assignment email sent', { employeeId: id, department });
      } catch (emailError) {
        logger.warn('Department assignment email failed (non-critical)', { error: (emailError as Error).message });
      }

      logger.info('EmployeeService: Department assigned successfully', { employeeId: id, department });
      return mappedEmployee;
    } catch (error) {
      logger.error('EmployeeService: Assign department failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getEmployeeStats(): Promise<{ total: number; active: number; pending: number; rejected: number }> {
    try {
      return await this.employeeRepository.getEmployeeStats();
    } catch (error) {
      logger.error('EmployeeService: Get employee stats failed', { error: (error as Error).message });
      throw error;
    }
  }
}
