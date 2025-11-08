import { pool } from '../config/database';

export class ProfileRepository {
  async getProfile(employeeId: string) {
    const result = await pool.query(
      `SELECT 
        e.*,
        u.email as user_email,
        u.role as user_role,
        u.email_verified,
        tl.full_name as team_lead_name
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN employees tl ON e.team_lead_id = tl.id
      WHERE e.id = $1`,
      [employeeId]
    );
    return result.rows[0];
  }

  async getProfileByUserId(userId: string) {
    const result = await pool.query(
      `SELECT 
        e.*,
        u.email as user_email,
        u.role as user_role,
        u.email_verified,
        tl.full_name as team_lead_name
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN employees tl ON e.team_lead_id = tl.id
      WHERE e.user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async updateProfile(employeeId: string, data: {
    full_name?: string;
    phone?: string;
    address?: string;
    date_of_birth?: string;
    position?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    profile_picture?: string;
  }) {
    const result = await pool.query(
      `SELECT * FROM update_employee_profile($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        employeeId,
        data.full_name || null,
        data.phone || null,
        data.address || null,
        data.date_of_birth || null,
        data.position || null,
        data.emergency_contact_name || null,
        data.emergency_contact_phone || null,
        data.profile_picture || null
      ]
    );
    return result.rows[0];
  }

  async updateWorkingDays(employeeId: string, workingDays: string[]) {
    const result = await pool.query(
      `SELECT * FROM update_working_days($1, $2)`,
      [employeeId, JSON.stringify(workingDays)]
    );
    return result.rows[0];
  }

  async calculateProfileCompletion(employeeId: string): Promise<number> {
    const profile = await this.getProfile(employeeId);
    if (!profile) return 0;

    const fields = [
      profile.full_name,
      profile.phone,
      profile.address,
      profile.date_of_birth,
      profile.position,
      profile.emergency_contact_name,
      profile.emergency_contact_phone
    ];

    const completedFields = fields.filter(field => field !== null && field !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  }
}
