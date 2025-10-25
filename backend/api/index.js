const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import route handlers
const authRoutes = require('./routes/auth.routes').default;
const employeeRoutes = require('./routes/employee.routes').default;
const attendanceRoutes = require('./routes/attendance.routes').default;
const taskRoutes = require('./routes/task.routes').default;

// Import database configuration
const supabaseConfig = require('./config/supabase');

const app = express();

// Debug: Log environment variables in serverless
console.log('🔍 Vercel Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
  FRONTEND_URL: process.env.FRONTEND_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT SET',
  FROM_EMAIL: process.env.FROM_EMAIL,
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  VAPID_EMAIL: process.env.VAPID_EMAIL
});

// Initialize database connection
async function initializeDatabase() {
  try {
    console.log('🔌 Starting Supabase connection...');
    await supabaseConfig.connect();
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
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
//
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'x-request-id',
    'x-client-version',
    'x-api-key'
  ]
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
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await supabaseConfig.healthCheck();

    // Detailed environment variable status
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT SET',
      FROM_EMAIL: process.env.FROM_EMAIL,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      VAPID_EMAIL: process.env.VAPID_EMAIL,
      FRONTEND_URL: process.env.FRONTEND_URL
    };

    console.log('🏥 Health Check Request:', {
      timestamp: new Date().toISOString(),
      dbStatus,
      envStatus
    });

    res.status(200).json({
      status: 'ok',
      message: 'HR Management System Backend is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      deployment: process.env.VERCEL ? 'vercel' : 'local',
      database: dbStatus,
      config: envStatus,
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(200).json({
      status: 'ok',
      message: 'HR Management System Backend is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      deployment: process.env.VERCEL ? 'vercel' : 'local',
      database: {
        status: 'error',
        connection: false,
        error: error.message
      }
    });
  }
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
