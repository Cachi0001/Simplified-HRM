import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Simple PostgreSQL pool using Supabase credentials
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Handle errors
pool.on('error', (err: any) => {
  console.error('Database error:', err.message);
});

// Simple connection test
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    client.release();
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};
