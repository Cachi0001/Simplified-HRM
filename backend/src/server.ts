import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { testConnection } from './config/database';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import employeeRoutes from './routes/employee.routes';
import departmentRoutes from './routes/department.routes';
import leaveRoutes from './routes/leave.routes';
import purchaseRoutes from './routes/purchase.routes';
import attendanceRoutes from './routes/attendance.routes';
import taskRoutes from './routes/task.routes';
import dashboardRoutes from './routes/dashboard.routes';
import notificationRoutes from './routes/notification.routes';
import cronService from './services/CronService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://go3net.vercel.app',
  'https://go3nethrm.vercel.app',
  'https://go3nethrm-backend.vercel.app',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_PROD,
  process.env.FRONTEND_URL_CUSTOM,
  'https://go3net.com',
  'https://www.go3net.com',
  'https://admin.go3net.com',
  'https://app.go3net.com',
  'https://hr.go3net.com',
  'https://hrm.go3net.com'
].filter(Boolean);

// Enhanced CORS configuration with logging
app.use(cors({
  origin: (origin, callback) => {
    console.log('🌐 CORS Request from origin:', origin || 'no-origin');
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS: Origin blocked:', origin);
      console.log('📋 Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

// CORS preflight is handled by the cors middleware above
// No need for manual OPTIONS handler

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check endpoint with database status
app.get('/api/health', async (req, res) => {
  console.log('🏥 Health check requested');
  
  // Check database connection
  let dbStatus = 'unknown';
  let dbError = null;
  try {
    await testConnection();
    dbStatus = 'connected';
  } catch (error: any) {
    dbStatus = 'disconnected';
    dbError = error.message;
  }
  
  res.json({ 
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      status: dbStatus,
      error: dbError,
      hasUrl: !!process.env.DATABASE_URL,
      urlPreview: process.env.DATABASE_URL ? 
        `${process.env.DATABASE_URL.substring(0, 20)}...${process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 10)}` : 
        'NOT_SET'
    },
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    cors: {
      origin: req.headers.origin,
      allowed: allowedOrigins
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Go3Net HRM API',
    version: '1.0.0',
    status: 'running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

// Initialize database connection
testConnection().then((connected) => {
  if (!connected) {
    console.warn('⚠️ Database not connected, but server will start anyway');
  } else {
    console.log('✅ Database connected successfully');
    // Start cron jobs only if database is connected and not in serverless
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      cronService.start();
    }
  }
});

// Only start server if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔒 CORS enabled for:`, allowedOrigins);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  cronService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  cronService.stop();
  process.exit(0);
});

export default app;
