import dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import logger from './utils/logger';
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import taskRoutes from './routes/task.routes';
import databaseConfig from './config/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database connection
async function initializeDatabase() {
  try {
    await databaseConfig.connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Security middleware (optimized for serverless)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API responses
}));

// CORS configuration (optimized for serverless)
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (mobile apps, serverless, etc.)
    if (!origin) return callback(null, true);

    // Always allow localhost origins for development/testing
    const localhostOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];

    // Production frontend URLs
    const productionOrigins = [
      process.env.FRONTEND_URL,
      process.env.VERCEL_URL,
      'https://go3nethrm.vercel.app', // Deployed frontend URL
      'https://go3nethrm.com' // Alternative domain
    ].filter(Boolean);

    // Combine all allowed origins
    const allowedOrigins = [...localhostOrigins, ...productionOrigins];

    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      // For security, only allow specific origins in production
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'), false);
      } else {
        callback(null, true); // Allow all in development
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  logger.info('Health check requested');
  res.status(200).json({
    status: 'ok',
    message: 'HR Management System Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL ? 'vercel' : 'local'
  });
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'HR Management System API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health',
    deployment: process.env.VERCEL ? 'vercel' : 'local'
  });
});

// Global error handler (optimized for serverless)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    status: 'error',
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, { ip: req.ip });
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Export for Vercel serverless
export default app;

// For local development
if (require.main === module) {
  initializeDatabase().then(() => {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Deployment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });
  });
}
