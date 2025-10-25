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
    // Enhanced CORS logging for debugging
    logger.info(`CORS request from origin: ${origin || 'No origin'}`);
    
    // Allow requests with no origin (mobile apps, serverless, etc.)
    if (!origin) {
      logger.info('CORS: Allowing request with no origin');
      return callback(null, true);
    }

    // Always allow localhost origins for development/testing
    const localhostOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://localhost:8080'
    ];

    // Production frontend URLs - ensure we have all possible variations
    const frontendUrl = process.env.FRONTEND_URL || 'https://go3nethrm.vercel.app';
    const frontendUrlProd = process.env.FRONTEND_URL_PROD || 'https://go3nethrm.vercel.app';
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    
    // Parse additional origins from environment variable if available
    const additionalOriginsStr = process.env.ADDITIONAL_CORS_ORIGINS || '';
    const additionalOrigins = additionalOriginsStr
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
    
    // Log environment variables for debugging
    logger.info(`CORS config - Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS config - FRONTEND_URL: ${frontendUrl}`);
    logger.info(`CORS config - FRONTEND_URL_PROD: ${frontendUrlProd}`);
    logger.info(`CORS config - VERCEL_URL: ${vercelUrl || 'Not set'}`);
    logger.info(`CORS config - Additional Origins: ${additionalOrigins.join(', ') || 'None'}`);
    
    const productionOrigins = [
      frontendUrl,
      frontendUrlProd,
      vercelUrl,
      'https://go3nethrm.vercel.app',
      'https://www.go3nethrm.vercel.app',
      'https://go3nethrm.com',
      'https://www.go3nethrm.com',
      ...additionalOrigins
    ].filter(Boolean);

    // Combine all allowed origins
    const allowedOrigins = [...localhostOrigins, ...productionOrigins];
    
    // Log all allowed origins for debugging
    logger.debug(`CORS allowed origins: ${JSON.stringify(allowedOrigins)}`);

    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      // Handle wildcard subdomains
      if (allowed.includes('*')) {
        const pattern = new RegExp('^' + allowed.replace('*', '.*') + '$');
        return pattern.test(origin);
      }
      return origin.startsWith(allowed);
    });

    if (isAllowed) {
      logger.info(`CORS: Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      // For security, only allow specific origins in production
      if (process.env.NODE_ENV === 'production') {
        logger.warn(`CORS: Blocking origin in production: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`), false);
      } else {
        logger.info(`CORS: Allowing non-listed origin in development: ${origin}`);
        callback(null, true); // Allow all in development
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add OPTIONS response for preflight requests
app.options('*', cors(corsOptions));

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
  logger.info('Health check requested', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin || 'No origin'
  });
  
  res.status(200).json({
    status: 'ok',
    message: 'HR Management System Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL ? 'vercel' : 'local'
  });
});

// CORS diagnostic endpoint
app.get('/api/cors-test', (req: Request, res: Response) => {
  const origin = req.headers.origin || 'No origin';
  const referer = req.headers.referer || 'No referer';
  const userAgent = req.headers['user-agent'] || 'No user-agent';
  
  logger.info('CORS test requested', {
    ip: req.ip,
    origin,
    referer,
    userAgent
  });
  
  // Log environment variables for debugging
  const corsConfig = {
    frontendUrl: process.env.FRONTEND_URL,
    frontendUrlProd: process.env.FRONTEND_URL_PROD,
    vercelUrl: process.env.VERCEL_URL,
    nodeEnv: process.env.NODE_ENV,
    additionalOrigins: process.env.ADDITIONAL_CORS_ORIGINS
  };
  
  logger.debug('CORS configuration', { corsConfig });
  
  res.status(200).json({
    status: 'ok',
    message: 'CORS test successful',
    timestamp: new Date().toISOString(),
    requestInfo: {
      origin,
      referer,
      userAgent,
      ip: req.ip
    },
    corsConfig
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
