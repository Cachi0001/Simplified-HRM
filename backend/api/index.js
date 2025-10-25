const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import route handlers
const authRoutes = require('./routes/auth.routes').default;
const employeeRoutes = require('./routes/employee.routes').default;
const attendanceRoutes = require('./routes/attendance.routes').default;
const taskRoutes = require('./routes/task.routes').default;

// Import database configuration
const databaseConfig = require('./config/database').default;

const app = express();

// Debug: Log environment variables in serverless
console.log('🔍 Vercel Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
  FRONTEND_URL: process.env.FRONTEND_URL
});

// Initialize database connection
async function initializeDatabase() {
  try {
    console.log('🔌 Starting database connection...');
    await databaseConfig.connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Don't throw error in serverless - let the app start and handle DB errors per request
  }
}

// Wrap initialization in async IIFE to handle top-level await in CommonJS
(async () => {
  await initializeDatabase();
})();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = databaseConfig.getConnection().connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    message: 'HR Management System Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL ? 'vercel' : 'local',
    database: {
      status: dbStatus,
      connection: databaseConfig.getConnection().connection.readyState === 1,
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
      dbName: process.env.MONGODB_DB_NAME,
      readyState: databaseConfig.getConnection().connection.readyState
    }
  });
});

// CORS diagnostic endpoint
app.get('/api/cors-test', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'CORS test successful',
    timestamp: new Date().toISOString(),
    corsConfig: {
      frontendUrl: process.env.FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'HR Management System API',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

module.exports = app;
