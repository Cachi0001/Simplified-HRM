import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IEmployee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../models/SupabaseEmployee';
import { EmailService } from './EmailService';
import logger from '../utils/logger';

export class EmployeeService {
  constructor(private employeeRepository: IEmployeeRepository) {}

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
      return employee;
    } catch (error) {
      logger.error('EmployeeService: Create employee failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAllEmployees(query?: EmployeeQuery, currentUserRole?: string): Promise<{ employees: IEmployee[]; total: number; page: number; limit: number }> {
    try {
      logger.info('EmployeeService: Getting all employees', { role: currentUserRole });

      // Non-admin users can only see active employees
      if (currentUserRole !== 'admin') {
        query = { ...query, status: 'active' };
      }

      return await this.employeeRepository.findAll(query);
    } catch (error) {
      logger.error('EmployeeService: Get all employees failed', { error: (error as Error).message });
      throw error;
    }
  }

  async searchEmployees(query: string, currentUserRole?: string): Promise<IEmployee[]> {
    try {
      logger.info('EmployeeService: Searching employees', { query, role: currentUserRole });

      // Non-admin users can only search active employees (already handled in repository)
      // For admins, search all employees
      if (currentUserRole === 'admin') {
        // For admins, we need to modify the query to search all statuses
        // Since the repository filters for active only, we'll need to modify the query
        query = query; // Keep as is, repository will handle the filtering
      }

      return await this.employeeRepository.search(query);
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

      // Check permissions
      if (currentUserRole !== 'admin' && employee.userId !== currentUserId) {
        throw new Error('Access denied');
      }

      return employee;
    } catch (error) {
      logger.error('EmployeeService: Get employee by ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getMyProfile(userId: string): Promise<IEmployee | null> {
    try {
      return await this.employeeRepository.findByUserId(userId);
    } catch (error) {
      logger.error('EmployeeService: Get my profile failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateEmployee(id: string, employeeData: UpdateEmployeeRequest, currentUserRole: string, currentUserId?: string): Promise<IEmployee> {
    try {
      // Check if employee exists
      const existingEmployee = await this.employeeRepository.findById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      // Check permissions
      if (currentUserRole !== 'admin' && existingEmployee.userId !== currentUserId) {
        throw new Error('Access denied');
      }

      // Non-admin users can only update specific fields
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
      return updatedEmployee;
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
      // Only admins can delete employees
      if (currentUserRole !== 'admin') {
        throw new Error('Only administrators can delete employees');
      }

      // Check if employee exists
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
      return await this.employeeRepository.getPendingApprovals();
    } catch (error) {
      logger.error('EmployeeService: Get pending approvals failed', { error: (error as Error).message });
      throw error;
    }
  }

  async approveEmployee(id: string): Promise<IEmployee> {
    try {
      // First, get the employee to find the associated user ID
      const employee = await this.employeeRepository.findById(id);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Update the employee status to 'active'
      const updatedEmployee = await this.employeeRepository.approve(id);

      // CRITICAL: Also mark the user's email as verified so they can login
      await this.employeeRepository.updateEmailVerification(employee.userId, true);

      logger.info('✅ User emailVerified set to true after approval', {
        userId: employee.userId,
        employeeId: id
      });

      // Send email notification
      try {
        const emailService = new EmailService();
        await emailService.sendApprovalConfirmation(updatedEmployee.email, updatedEmployee.fullName);
        logger.info('📧 Approval email sent', { email: updatedEmployee.email });
      } catch (emailError) {
        logger.warn('Approval email failed (non-critical)', { error: (emailError as Error).message });
      }

      return updatedEmployee;
    } catch (error) {
      logger.error('EmployeeService: Approve employee failed', { error: (error as Error).message });
      throw error;
    }
  }

  async rejectEmployee(id: string): Promise<void> {
    try {
      // Delete the employee record (reject registration)
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

      // Send notification email to employee
      try {
        const emailService = new EmailService();
        await emailService.sendDepartmentAssignmentNotification(
          updatedEmployee.email,
          updatedEmployee.fullName,
          department
        );
        logger.info('📧 Department assignment email sent', { employeeId: id, department });
      } catch (emailError) {
        logger.warn('Department assignment email failed (non-critical)', { error: (emailError as Error).message });
      }

      logger.info('EmployeeService: Department assigned successfully', { employeeId: id, department });
      return updatedEmployee;
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
