import { pool } from '../config/database';

export interface Employee {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  position?: string;
  department?: string;
  department_id?: string;
  salary?: number;
  hire_date?: string;
  status: 'pending' | 'active' | 'rejected' | 'inactive';
  role: string;
  profile_picture?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  approved_by_id?: string;
  approved_at?: Date;
  team_lead_id?: string;
  working_days?: string[];
  profile_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEmployeeData {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  departmentId?: string;
}

export class EmployeeRepository {
  async create(data: CreateEmployeeData): Promise<Employee> {
    const result = await pool.query(
      `SELECT * FROM create_employee($1, $2, $3, $4, $5, $6, $7)`,
      [data.userId, data.email, data.fullName, data.phone, data.dateOfBirth, data.address, data.departmentId]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM get_employee_by_user_id($1)',
      [userId]
    );
    return result.rows[0] || null;
  }

  async findAll(filters?: { status?: string; department?: string }): Promise<Employee[]> {
    let queryText = 'SELECT * FROM employees WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      queryText += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.department) {
      queryText += ` AND department = $${paramCount}`;
      params.push(filters.department);
      paramCount++;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await pool.query(queryText, params);
    return result.rows;
  }

  async findPending(): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE status = $1 ORDER BY created_at ASC',
      ['pending']
    );
    return result.rows;
  }

  async approve(id: string, approvedById: string, role: string): Promise<Employee> {
    const result = await pool.query(
      `UPDATE employees 
       SET status = 'active', approved_by_id = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [approvedById, id]
    );
    return result.rows[0];
  }

  async reject(id: string, reason: string): Promise<Employee> {
    const result = await pool.query(
      `UPDATE employees 
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  async updateProfile(id: string, data: Partial<Employee>): Promise<Employee> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async updateWorkingDays(id: string, workingDays: string[]): Promise<Employee> {
    const result = await pool.query(
      `UPDATE employees 
       SET working_days = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(workingDays), id]
    );
    return result.rows[0];
  }
}
