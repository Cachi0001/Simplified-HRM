import { pool } from '../config/database';

export interface Department {
  id: string;
  name: string;
  description?: string;
  team_lead_id?: string;
  team_lead_name?: string;
  budget?: number;
  created_by?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  team_lead_id?: string;
  budget?: number;
  created_by: string;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  team_lead_id?: string;
  budget?: number;
}

export class DepartmentRepository {
  async getAll(): Promise<Department[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM get_all_departments()'
      );
      console.log(`[DepartmentRepo] Fetched ${result.rows.length} departments`);
      return result.rows;
    } catch (error: any) {
      console.error('[DepartmentRepo] Error fetching departments:', error.message);
      throw new Error(`Failed to fetch departments: ${error.message}`);
    }
  }

  async getById(id: string): Promise<Department | null> {
    const result = await pool.query(
      'SELECT * FROM get_department_by_id($1)',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateDepartmentData): Promise<Department> {
    const result = await pool.query(
      'SELECT * FROM create_department($1, $2, $3, $4, $5)',
      [data.name, data.created_by, data.description, data.team_lead_id, data.budget]
    );
    return result.rows[0];
  }

  async update(id: string, data: UpdateDepartmentData): Promise<Department> {
    const result = await pool.query(
      'SELECT * FROM update_department($1, $2, $3, $4, $5)',
      [id, data.name, data.description, data.team_lead_id, data.budget]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const result = await pool.query(
      'SELECT delete_department($1) as result',
      [id]
    );
    return result.rows[0].result;
  }

  async getByName(name: string): Promise<Department | null> {
    const result = await pool.query(
      'SELECT * FROM departments WHERE LOWER(name) = LOWER($1) AND is_active = TRUE',
      [name]
    );
    return result.rows[0] || null;
  }
}
