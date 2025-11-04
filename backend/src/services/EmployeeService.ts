import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IEmployee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../models/SupabaseEmployee';
import { EmailService } from './EmailService';
import NotificationService from './NotificationService';
import { ProfileValidationService } from './ProfileValidationService';
import logger from '../utils/logger';
import db from '../config/database';
import supabaseConfig from '../config/supabase';

export class EmployeeService {
  private supabase = supabaseConfig.getClient();
  
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


      // Admin and HR can see all employees regardless of status
      // Regular employees and others can only see active employees
      if (currentUserRole !== 'admin' && currentUserRole !== 'hr') {
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

  async getEmployeesForChat(currentUserId: string): Promise<any[]> {
    try {


      const employees = await this.employeeRepository.getEmployeesForChat(currentUserId);
      return employees.map(emp => ({
        id: emp.id,
        userId: emp.user_id,
        email: emp.email,
        fullName: emp.full_name,
        role: emp.role,
        department: emp.department,
        profilePicture: emp.profile_picture
      }));
    } catch (error) {
      logger.error('EmployeeService: Get employees for chat failed', { error: (error as Error).message });
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

      // Allow admin or HR to update any employee, or allow employee to update themselves
      if (currentUserRole !== 'admin' && currentUserRole !== 'superadmin' && currentUserRole !== 'hr' && existingEmployee.user_id !== currentUserId) {
        throw new Error('Access denied: You can only update your own profile');
      }

      const isUpdatingSelf = existingEmployee.user_id === currentUserId;

      // Validate the profile update
      const validation = ProfileValidationService.validateProfileUpdate(
        employeeData,
        currentUserRole,
        isUpdatingSelf
      );

      if (!validation.isValid) {
        throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`);
      }

      // Filter allowed fields based on user role and permissions
      const filteredData = ProfileValidationService.filterAllowedFields(
        employeeData,
        currentUserRole,
        isUpdatingSelf
      );

      // Special validation for HR role changes
      if (currentUserRole === 'hr' && filteredData.role === 'admin') {
        throw new Error('HR cannot assign admin role');
      }

      // Log validation warnings if any
      if (validation.warnings.length > 0) {
        logger.info('EmployeeService: Profile update warnings', {
          employeeId: id,
          warnings: validation.warnings,
          updatedBy: currentUserRole
        });
      }

      employeeData = filteredData;

      const updatedEmployee = await this.employeeRepository.update(id, employeeData);

      // Send notifications to HR/Admin/Superadmin when employee updates their own profile
      if (existingEmployee.user_id === currentUserId && currentUserRole === 'employee') {
        try {
          const updatedFields = Object.keys(employeeData).filter(field => 
            employeeData[field as keyof UpdateEmployeeRequest] !== undefined
          );
          
          if (updatedFields.length > 0) {
            // Get all HR/Admin/Superadmin users to notify
            const adminUsers = await this.getAdminUsers();
            const adminUserIds = adminUsers.map(user => user.user_id).filter(Boolean);
            
            if (adminUserIds.length > 0) {
              await NotificationService.notifyProfileUpdate(
                id,
                existingEmployee.fullName || existingEmployee.email,
                updatedFields,
                adminUserIds
              );
              
              logger.info('EmployeeService: Profile update notifications sent', {
                employeeId: id,
                updatedFields,
                adminCount: adminUserIds.length
              });
            }
          }
        } catch (notificationError) {
          // Don't fail the update if notifications fail
          logger.error('EmployeeService: Failed to send profile update notifications', {
            error: (notificationError as Error).message,
            employeeId: id
          });
        }
      }

      logger.info('EmployeeService: Employee updated successfully', { employeeId: id, updatedFields: Object.keys(employeeData), updatedBy: currentUserRole });
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
        const emailService = new EmailService(db);
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

  async rejectEmployee(id: string, reason?: string): Promise<void> {
    try {
      // Get employee details before deletion for notification
      const employee = await this.employeeRepository.findById(id);
      if (!employee) {
        throw new Error('Employee not found');
      }

      await this.employeeRepository.delete(id);

      // Send rejection notification
      try {
        await this.sendRejectionNotification(employee.email, employee.full_name, reason);
      } catch (emailError) {
        logger.error('EmployeeService: Failed to send rejection notification', { 
          employeeId: id, 
          error: emailError 
        });
        // Don't fail the rejection if email fails
      }

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
        const emailService = new EmailService(db);
        await emailService.sendDepartmentAssignmentNotification(
          mappedEmployee.email,
          mappedEmployee.fullName,
          department,
          'System Administrator'
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

  async approveEmployeeWithRole(
    employeeId: string,
    role: string,
    approverId: string,
    approverName: string,
    reason?: string
  ): Promise<any> {
    try {
      logger.info('EmployeeService: Approving employee with role', { 
        employeeId, 
        role, 
        approverId 
      });

      const result = await this.employeeRepository.approveEmployeeWithRole(
        employeeId,
        role,
        approverId,
        approverName,
        reason
      );

      logger.info('EmployeeService: Employee approved with role successfully', { 
        employeeId, 
        role 
      });

      return result;
    } catch (error) {
      logger.error('EmployeeService: Approve employee with role failed', { 
        error: (error as Error).message,
        employeeId 
      });
      throw error;
    }
  }

  async updateRole(
    employeeId: string,
    newRole: string,
    updatedById: string,
    updatedByName: string,
    reason?: string
  ): Promise<any> {
    try {
      logger.info('EmployeeService: Updating employee role', { 
        employeeId, 
        newRole, 
        updatedById 
      });

      const result = await this.employeeRepository.updateRole(
        employeeId,
        newRole,
        updatedById,
        updatedByName,
        reason
      );

      logger.info('EmployeeService: Employee role updated successfully', { 
        employeeId, 
        newRole 
      });

      return result;
    } catch (error) {
      logger.error('EmployeeService: Update role failed', { 
        error: (error as Error).message,
        employeeId 
      });
      throw error;
    }
  }

  async getApprovalHistory(employeeId?: string): Promise<any[]> {
    try {
      logger.info('EmployeeService: Getting approval history', { employeeId });

      const history = await this.employeeRepository.getApprovalHistory(employeeId);

      logger.info('EmployeeService: Approval history retrieved successfully', { 
        count: history?.length || 0 
      });

      return history || [];
    } catch (error) {
      logger.error('EmployeeService: Get approval history failed', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  async sendApprovalNotification(email: string, employeeName: string, role: string): Promise<void> {
    try {
      logger.info('EmployeeService: Sending approval notification', { email, role });

      const emailService = new EmailService(db);
      await emailService.sendApprovalEmail(email, employeeName, role);

      // Also create in-app notification if user exists
      try {
        const { NotificationService } = await import('./NotificationService');
        const notificationService = new NotificationService();
        
        // Find user by email to get user ID
        const { data: user } = await this.supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (user) {
          await notificationService.createNotification({
            userId: user.id,
            type: 'approval_decision',
            title: 'Account Approved! 🎉',
            message: `Your employee account has been approved with role: ${role}. You can now access the system.`,
            actionUrl: '/dashboard'
          });
        }
      } catch (notificationError) {
        logger.error('EmployeeService: Failed to create in-app notification', { 
          error: notificationError,
          email 
        });
        // Don't fail if notification creation fails
      }

      logger.info('EmployeeService: Approval notification sent successfully', { email });
    } catch (error) {
      logger.error('EmployeeService: Send approval notification failed', { 
        error: (error as Error).message,
        email 
      });
      throw error;
    }
  }

  async sendRejectionNotification(email: string, employeeName: string, reason?: string): Promise<void> {
    try {
      logger.info('EmployeeService: Sending rejection notification', { email });

      const emailService = new EmailService(db);
      await emailService.sendRejectionEmail(email, employeeName, reason);

      // Also create in-app notification if user exists
      try {
        const { NotificationService } = await import('./NotificationService');
        const notificationService = new NotificationService();
        
        // Find user by email to get user ID
        const { data: user } = await this.supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (user) {
          await notificationService.createNotification({
            userId: user.id,
            type: 'approval_decision',
            title: 'Account Application Update',
            message: `Your employee account application was not approved. ${reason ? `Reason: ${reason}` : 'Please contact HR for more information.'}`,
            actionUrl: '/contact'
          });
        }
      } catch (notificationError) {
        logger.error('EmployeeService: Failed to create in-app notification', { 
          error: notificationError,
          email 
        });
        // Don't fail if notification creation fails
      }

      logger.info('EmployeeService: Rejection notification sent successfully', { email });
    } catch (error) {
      logger.error('EmployeeService: Send rejection notification failed', { 
        error: (error as Error).message,
        email 
      });
      throw error;
    }
  }



  async getEmployeesForTasks(currentUserRole?: string): Promise<IEmployee[]> {
    try {
      logger.info('EmployeeService: Getting employees for tasks', { currentUserRole });

      // Get all active employees except superadmin
      const query: EmployeeQuery = {
        status: 'active',
        limit: 1000 // Get all employees
      };

      const result = await this.getAllEmployees(query, currentUserRole);
      
      // Filter out superadmin users
      const filteredEmployees = result.employees.filter(emp => emp.role !== 'superadmin');

      logger.info('EmployeeService: Employees for tasks retrieved', { 
        totalCount: result.employees.length,
        filteredCount: filteredEmployees.length 
      });

      return filteredEmployees;
    } catch (error) {
      logger.error('EmployeeService: Get employees for tasks failed', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Update employee status using database function
   */
  async updateEmployeeStatus(
    employeeId: string, 
    newStatus: string, 
    changedById: string, 
    updaterRole: string,
    reason?: string
  ): Promise<any> {
    try {
      logger.info('EmployeeService: Updating employee status', { 
        employeeId, 
        newStatus, 
        changedById,
        updaterRole,
        reason 
      });

      // Use the new safe database function
      const supabase = supabaseConfig.getClient();
      const { data, error } = await supabase.rpc('update_employee_status', {
        p_employee_id: employeeId,
        p_status: newStatus,
        p_requester_id: changedById
      });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to update employee status');
      }

      logger.info('EmployeeService: Employee status updated successfully', { 
        employeeId,
        newStatus,
        result: data
      });

      return data;
    } catch (error) {
      logger.error('EmployeeService: Error updating employee status', { 
        error: (error as Error).message,
        employeeId 
      });
      throw error;
    }
  }

  /**
   * Update employee manager using safe database function
   */
  async updateEmployeeManager(
    employeeId: string,
    managerId: string | null,
    requesterId: string
  ): Promise<any> {
    try {
      logger.info('EmployeeService: Updating employee manager', {
        employeeId,
        managerId,
        requesterId
      });

      // Use the new safe database function
      const supabase = supabaseConfig.getClient();
      const { data, error } = await supabase.rpc('update_employee_manager', {
        p_employee_id: employeeId,
        p_manager_id: managerId,
        p_requester_id: requesterId
      });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to update employee manager');
      }

      logger.info('EmployeeService: Employee manager updated successfully', {
        employeeId,
        managerId,
        result: data
      });

      return data;
    } catch (error) {
      logger.error('EmployeeService: Error updating employee manager', {
        error: (error as Error).message,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Get employee status change history
   */
  async getEmployeeStatusHistory(employeeId: string, userRole: string): Promise<any[]> {
    try {
      logger.info('EmployeeService: Getting employee status history', { 
        employeeId, 
        userRole 
      });

      // Call the database function
      const result = await db.query(
        'SELECT get_employee_status_history($1, $2) as result',
        [employeeId, userRole]
      );

      const data = result.rows[0]?.result;
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to get employee status history');
      }

      const history = data.history || [];

      logger.info('EmployeeService: Employee status history retrieved successfully', { 
        employeeId,
        historyCount: history.length
      });

      return history;
    } catch (error) {
      logger.error('EmployeeService: Error getting employee status history', { 
        error: (error as Error).message,
        employeeId 
      });
      throw error;
    }
  }

  /**
   * Get employees for management with restrictions
   */
  async getEmployeesForManagement(
    userRole: string,
    requesterId: string,
    statusFilter?: string,
    roleFilter?: string,
    departmentFilter?: string
  ): Promise<any[]> {
    try {
      logger.info('EmployeeService: Getting employees for management', { 
        userRole,
        requesterId,
        filters: { statusFilter, roleFilter, departmentFilter }
      });

      // Validate requester role
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        throw new Error('Insufficient permissions to access employee management');
      }

      // Use direct Supabase query instead of the problematic database function
      let query = supabaseConfig.getClient()
        .from('employees')
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          department_id,
          position,
          role,
          status,
          hire_date,
          salary,
          manager_id,
          profile_picture,
          avatar,
          address,
          date_of_birth,
          work_type,
          work_days,
          performance_score,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }
      if (departmentFilter) {
        query = query.eq('department_id', departmentFilter);
      }

      const { data: employees, error } = await query;

      if (error) {
        logger.error('EmployeeService: Database error getting employees for management', { error });
        throw new Error(error.message || 'Failed to get employees for management');
      }

      // Get department and manager names separately to avoid relationship conflicts
      const departmentIds = Array.from(new Set(employees?.map(emp => emp.department_id).filter(Boolean)));
      const managerIds = Array.from(new Set(employees?.map(emp => emp.manager_id).filter(Boolean)));
      
      // Fetch departments
      const { data: departments } = await supabaseConfig.getClient()
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);
      
      // Fetch managers
      const { data: managers } = await supabaseConfig.getClient()
        .from('employees')
        .select('id, full_name')
        .in('id', managerIds);
      
      // Create lookup maps
      const departmentMap = new Map(departments?.map(d => [d.id, d.name]) || []);
      const managerMap = new Map(managers?.map(m => [m.id, m.full_name]) || []);

      // Transform the data to match expected format
      const transformedEmployees = (employees || []).map((emp: any) => ({
        id: emp.id,
        user_id: emp.user_id,
        full_name: emp.full_name,
        email: emp.email,
        phone: emp.phone,
        department: departmentMap.get(emp.department_id) || 'No Department',
        department_id: emp.department_id,
        position: emp.position,
        role: emp.role,
        status: emp.status,
        hire_date: emp.hire_date,
        salary: emp.salary,
        manager_name: managerMap.get(emp.manager_id) || 'No Manager',
        manager_id: emp.manager_id,
        profile_picture_url: emp.profile_picture || emp.avatar,
        address: emp.address,
        date_of_birth: emp.date_of_birth,
        work_type: emp.work_type,
        work_days: emp.work_days,
        performance_score: emp.performance_score,
        created_at: emp.created_at,
        updated_at: emp.updated_at
      }));

      logger.info('EmployeeService: Employees for management retrieved successfully', { 
        userRole,
        employeeCount: transformedEmployees.length
      });

      return transformedEmployees;
    } catch (error) {
      logger.error('EmployeeService: Error getting employees for management', { 
        error: (error as Error).message,
        userRole 
      });
      throw error;
    }
  }

  /**
   * Update employee non-personal fields using database function
   */
  async updateEmployeeFields(
    employeeId: string,
    fields: {
      department_id?: string;
      position?: string;
      role?: string;
      manager_id?: string;
      salary?: number;
    },
    updatedById: string,
    updaterRole: string
  ): Promise<any> {
    try {
      logger.info('EmployeeService: Updating employee fields', { 
        employeeId, 
        fields,
        updatedById,
        updaterRole 
      });

      // Call the database function
      const { data, error } = await supabaseConfig.getClient()
        .rpc('update_employee_fields', {
          p_employee_id: employeeId,
          p_updated_by: updatedById,
          p_updater_role: updaterRole,
          p_department_id: fields.department_id || null,
          p_position: fields.position || null,
          p_role: fields.role || null,
          p_manager_id: fields.manager_id || null,
          p_salary: fields.salary || null
        });

      if (error) {
        logger.error('EmployeeService: Database error updating employee fields', { error });
        throw new Error(error.message || 'Failed to update employee fields');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to update employee fields');
      }

      logger.info('EmployeeService: Employee fields updated successfully', { 
        employeeId,
        result: data
      });

      return data;
    } catch (error) {
      logger.error('EmployeeService: Error updating employee fields', { 
        error: (error as Error).message,
        employeeId 
      });
      throw error;
    }
  }

  /**
   * Get all admin users (HR, Admin, Superadmin) for notifications
   */
  private async getAdminUsers(): Promise<Array<{ user_id: string; role: string; full_name?: string }>> {
    try {
      const supabase = supabaseConfig.getClient();
      
      const { data, error } = await supabase
        .from('employees')
        .select('user_id, role, full_name')
        .in('role', ['hr', 'admin', 'superadmin'])
        .eq('status', 'active')
        .not('user_id', 'is', null);

      if (error) {
        logger.error('EmployeeService: Failed to get admin users', { error: error.message });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('EmployeeService: Error getting admin users', { 
        error: (error as Error).message 
      });
      return [];
    }
  }
}