import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  email_verified: boolean;
  verification_token?: string;
  reset_token?: string;
  reset_token_expires?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  role?: string;
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateUserData): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, verification_token, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.email, passwordHash, data.role || 'employee', verificationToken, false]
    );
    
    return result.rows[0];
  }

  async updateRole(userId: string, role: string): Promise<User> {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [role, userId]
    );
    return result.rows[0];
  }

  async verifyEmail(token: string): Promise<User | null> {
    // Use the database function for consistency with auth_functions.sql
    const result = await pool.query(
      `SELECT verify_user_email($1) as result`,
      [token]
    );
    
    const verificationResult = result.rows[0]?.result;
    
    if (!verificationResult || !verificationResult.success) {
      return null;
    }
    
    // Fetch and return the updated user
    if (verificationResult.user_id) {
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [verificationResult.user_id]
      );
      return userResult.rows[0] || null;
    }
    
    return null;
  }

  async regenerateVerificationToken(userId: string): Promise<string> {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    await pool.query(
      `UPDATE users 
       SET verification_token = $1, updated_at = NOW()
       WHERE id = $2`,
      [verificationToken, userId]
    );
    
    return verificationToken;
  }

  async createResetToken(email: string): Promise<string> {
    // Use the database function for consistency
    const result = await pool.query(
      `SELECT generate_reset_token($1) as result`,
      [email]
    );
    
    const resetResult = result.rows[0]?.result;
    
    if (!resetResult || !resetResult.success) {
      throw new Error('Failed to generate reset token');
    }
    
    return resetResult.token;
  }

  async resetPassword(token: string, newPassword: string): Promise<User | null> {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Use the database function for consistency
    const result = await pool.query(
      `SELECT reset_user_password($1, $2) as result`,
      [token, passwordHash]
    );
    
    const resetResult = result.rows[0]?.result;
    
    if (!resetResult || !resetResult.success) {
      return null;
    }
    
    // Fetch and return the updated user
    if (resetResult.user_id) {
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [resetResult.user_id]
      );
      return userResult.rows[0] || null;
    }
    
    return null;
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }
    
    return user;
  }
}
