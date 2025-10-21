import { IEmployeeRepository } from '../interfaces/IEmployeeRepository';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../../models/Employee';
import logger from '../../utils/logger';

export class SupabaseEmployeeRepository implements IEmployeeRepository {
  constructor(private supabase: any) {}

  async create(employeeData: CreateEmployeeRequest, userId: string): Promise<Employee> {
    try {
      logger.info('Creating employee', { email: employeeData.email, userId });

      const { data, error } = await this.supabase
        .from('employees')
        .insert({
          user_id: userId,
          email: employeeData.email,
          full_name: employeeData.fullName,
          role: employeeData.role,
          department: employeeData.department,
          position: employeeData.position,
          phone: employeeData.phone,
          address: employeeData.address,
          date_of_birth: employeeData.dateOfBirth?.toISOString(),
          hire_date: employeeData.hireDate?.toISOString(),
          profile_picture: employeeData.profilePicture,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        logger.error('Employee creation error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseEmployeeToEmployee(data);
    } catch (error) {
      logger.error('Employee creation failed', { error: (error as Error).message });
      throw error;
    }
  }

  async findAll(query?: EmployeeQuery): Promise<{ employees: Employee[]; total: number; page: number; limit: number }> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const offset = (page - 1) * limit;

      let supabaseQuery = this.supabase.from('employees').select('*', { count: 'exact' });

      // Apply filters
      if (query?.search) {
        supabaseQuery = supabaseQuery.or(`full_name.ilike.%${query.search}%,email.ilike.%${query.search}%`);
      }
      if (query?.department) {
        supabaseQuery = supabaseQuery.eq('department', query.department);
      }
      if (query?.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }
      if (query?.role) {
        supabaseQuery = supabaseQuery.eq('role', query.role);
      }

      const { data, error, count } = await supabaseQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Find employees error', { error: error.message });
        throw new Error(error.message);
      }

      return {
        employees: data.map(this.mapSupabaseEmployeeToEmployee),
        total: count || 0,
        page,
        limit
      };
    } catch (error) {
      logger.error('Find employees failed', { error: (error as Error).message });
      throw error;
    }
  }

  async findById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        logger.error('Find employee by ID error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseEmployeeToEmployee(data);
    } catch (error) {
      logger.error('Find employee by ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        logger.error('Find employee by user ID error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseEmployeeToEmployee(data);
    } catch (error) {
      logger.error('Find employee by user ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async update(id: string, employeeData: UpdateEmployeeRequest): Promise<Employee> {
    try {
      logger.info('Updating employee', { id });

      const updateData: any = {};
      if (employeeData.fullName !== undefined) updateData.full_name = employeeData.fullName;
      if (employeeData.department !== undefined) updateData.department = employeeData.department;
      if (employeeData.position !== undefined) updateData.position = employeeData.position;
      if (employeeData.phone !== undefined) updateData.phone = employeeData.phone;
      if (employeeData.address !== undefined) updateData.address = employeeData.address;
      if (employeeData.dateOfBirth !== undefined) updateData.date_of_birth = employeeData.dateOfBirth?.toISOString();
      if (employeeData.hireDate !== undefined) updateData.hire_date = employeeData.hireDate?.toISOString();
      if (employeeData.profilePicture !== undefined) updateData.profile_picture = employeeData.profilePicture;
      if (employeeData.status !== undefined) updateData.status = employeeData.status;

      const { data, error } = await this.supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Employee update error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseEmployeeToEmployee(data);
    } catch (error) {
      logger.error('Employee update failed', { error: (error as Error).message });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Employee deletion error', { error: error.message });
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Employee deletion failed', { error: (error as Error).message });
      throw error;
    }
  }

  async search(query: string): Promise<Employee[]> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,department.ilike.%${query}%`)
        .eq('status', 'active')
        .limit(20);

      if (error) {
        logger.error('Employee search error', { error: error.message });
        throw new Error(error.message);
      }

      return data.map(this.mapSupabaseEmployeeToEmployee);
    } catch (error) {
      logger.error('Employee search failed', { error: (error as Error).message });
      throw error;
    }
  }

  private mapSupabaseEmployeeToEmployee(data: any): Employee {
    return {
      id: data.id,
      userId: data.user_id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      department: data.department,
      position: data.position,
      emailVerified: data.email_verified !== null ? data.email_verified : false,
      phone: data.phone,
      address: data.address,
      dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
      hireDate: data.hire_date ? new Date(data.hire_date) : undefined,
      profilePicture: data.profile_picture,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async getPendingApprovals(): Promise<Employee[]> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Get pending approvals error', { error: error.message });
        throw new Error(error.message);
      }

      return data.map(this.mapSupabaseEmployeeToEmployee);
    } catch (error) {
      logger.error('Get pending approvals failed', { error: (error as Error).message });
      throw error;
    }
  }
}
