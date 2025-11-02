import { Pool } from 'pg';
import logger from '../utils/logger';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hr_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create database connection pool
const db = new Pool(dbConfig);

// Test database connection
db.on('connect', () => {
  logger.info('✅ [Database] Connected to PostgreSQL database');
});

db.on('error', (err) => {
  logger.error('❌ [Database] Unexpected error on idle client', err);
});

// Test initial connection
db.query('SELECT NOW()', (err, result) => {
  if (err) {
    logger.error('❌ [Database] Initial connection test failed:', err);
  } else {
    logger.info('✅ [Database] Initial connection test successful');
  }
});

export default db;