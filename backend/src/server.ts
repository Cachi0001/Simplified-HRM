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

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  (req as any).requestId = requestId;
  const origin = req.headers.origin || 'No origin';
  const forwardedFor = req.headers['x-forwarded-for'] || 'Not set';
  const userAgent = req.headers['user-agent'] || 'Not set';
  console.log('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    origin,
    host: req.headers.host || 'No host',
    ip: req.ip,
    forwardedFor,
    userAgent
  });
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    origin,
    host: req.headers.host || 'No host',
    ip: req.ip,
    forwardedFor,
    userAgent
  });
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const contentLength = res.getHeader('content-length') || 'Not set';
    console.log('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      contentLength
    });
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      contentLength
    });
  });
  next();
});

// Initialize database connection
async function initializeDatabase() {
  try {
    await databaseConfig.connect();
    console.log('✅ Database connected successfully');
    logger.info('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    logger.error('❌ Database connection failed:', { error });
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
    console.log(`CORS request from origin: ${origin || 'No origin'}`);
    logger.info(`CORS request from origin: ${origin || 'No origin'}`);
    
    // Allow requests with no origin (mobile apps, serverless, etc.)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
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
    console.log(`CORS config - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS config - FRONTEND_URL: ${frontendUrl}`);
    console.log(`CORS config - FRONTEND_URL_PROD: ${frontendUrlProd}`);
    console.log(`CORS config - VERCEL_URL: ${vercelUrl || 'Not set'}`);
    console.log(`CORS config - Additional Origins: ${additionalOrigins.join(', ') || 'None'}`);
    
    logger.info(`CORS config - Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS config - FRONTEND_URL: ${frontendUrl}`);
    logger.info(`CORS config - FRONTEND_URL_PROD: ${frontendUrlProd}`);
    logger.info(`CORS config - VERCEL_URL: ${vercelUrl || 'Not set'}`);
    logger.info(`CORS config - Additional Origins: ${additionalOrigins.join(', ') || 'None'}`);
    
    // Add all possible variations of the frontend URL
    const productionOrigins = [
      frontendUrl,
      frontendUrlProd,
      vercelUrl,
      'https://go3nethrm.vercel.app',
      'https://www.go3nethrm.vercel.app',
      'https://go3nethrm.com',
      'https://www.go3nethrm.com',
      // Remove wildcard patterns from the direct list - they'll be handled in the isAllowed check
      ...additionalOrigins
    ].filter(Boolean);
    
    // Define wildcard patterns separately
    const wildcardPatterns = [
      'https://*.go3nethrm.vercel.app',  // Wildcard for all Vercel preview deployments
      'https://*.go3nethrm.com'          // Wildcard for all subdomains
    ];

    // Combine all allowed origins
    const allowedOrigins = [...localhostOrigins, ...productionOrigins];
    
    // Log all allowed origins for debugging
    console.log(`CORS allowed origins: ${JSON.stringify(allowedOrigins)}`);
    console.log(`CORS wildcard patterns: ${JSON.stringify(wildcardPatterns)}`);
    
    logger.debug(`CORS allowed origins: ${JSON.stringify(allowedOrigins)}`);
    logger.debug(`CORS wildcard patterns: ${JSON.stringify(wildcardPatterns)}`);

    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      
      // Exact match
      return origin === allowed || origin.startsWith(allowed);
    }) || wildcardPatterns.some(pattern => {
      // Handle wildcard subdomains separately
      // Convert the wildcard pattern to a proper regex pattern
      // e.g., https://*.example.com becomes ^https://.*\.example\.com$
      const regexPattern = new RegExp('^' + pattern.replace(/\./g, '\\.').replace('*', '.*') + '$');
      return regexPattern.test(origin);
    });

    if (isAllowed) {
      console.log(`CORS: Allowing origin: ${origin}`);
      logger.info(`CORS: Allowing origin: ${origin}`);
      // Return the actual origin instead of true to ensure proper CORS headers
      callback(null, origin);
    } else {
      // For security, only allow specific origins in production
      if (process.env.NODE_ENV === 'production') {
        const allowedOriginsSnapshot = [...allowedOrigins].filter(Boolean);
        console.warn(`CORS: Blocking origin in production: ${origin}`, {
          allowedOrigins: allowedOriginsSnapshot,
          wildcardPatterns
        });
        logger.warn('CORS: Blocking origin in production', {
          origin,
          allowedOrigins: allowedOriginsSnapshot,
          wildcardPatterns
        });
        callback(new Error(`Not allowed by CORS: ${origin}`), false);
      } else {
        console.log(`CORS: Allowing non-listed origin in development: ${origin}`);
        logger.info(`CORS: Allowing non-listed origin in development: ${origin}`);
        callback(null, origin); // Allow all in development but return the actual origin
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add OPTIONS response for preflight requests
// Handle specific API routes instead of using a wildcard
// We'll use a middleware approach instead of individual routes
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    console.log(`Handling OPTIONS request for: ${req.path}`, {
      origin: req.headers.origin || 'No origin'
    });
    logger.info(`Handling OPTIONS request for: ${req.path}`, {
      origin: req.headers.origin || 'No origin'
    });
    return cors(corsOptions)(req, res, next);
  }
  next();
});

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
  console.log('Health check requested', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin || 'No origin'
  });
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
  const host = req.headers.host || 'No host';
  
  console.log('CORS test requested', {
    ip: req.ip,
    origin,
    referer,
    userAgent,
    host
  });
  logger.info('CORS test requested', {
    ip: req.ip,
    origin,
    referer,
    userAgent,
    host
  });
  
  // Log environment variables for debugging
  const corsConfig = {
    frontendUrl: process.env.FRONTEND_URL,
    frontendUrlProd: process.env.FRONTEND_URL_PROD,
    vercelUrl: process.env.VERCEL_URL,
    nodeEnv: process.env.NODE_ENV,
    additionalOrigins: process.env.ADDITIONAL_CORS_ORIGINS
  };
  
  // Get all request headers for debugging
  const headers = { ...req.headers };
  
  // Remove sensitive information
  delete headers.authorization;
  delete headers.cookie;
  
  console.log('CORS configuration', { corsConfig });
  console.log('Request headers', { headers });
  
  logger.debug('CORS configuration', { corsConfig });
  logger.debug('Request headers', { headers });
  
  res.status(200).json({
    status: 'ok',
    message: 'CORS test successful',
    timestamp: new Date().toISOString(),
    requestInfo: {
      origin,
      referer,
      userAgent,
      host,
      ip: req.ip,
      headers
    },
    corsConfig,
    serverInfo: {
      environment: process.env.NODE_ENV || 'development',
      deployment: process.env.VERCEL ? 'vercel' : 'local',
      vercelUrl: process.env.VERCEL_URL || 'Not set'
    }
  });
});

// Add a simple preflight test endpoint
app.options('/api/preflight-test', cors(corsOptions), (req: Request, res: Response) => {
  console.log('Preflight test requested', {
    origin: req.headers.origin || 'No origin',
    method: req.method
  });
  logger.info('Preflight test requested', {
    origin: req.headers.origin || 'No origin',
    method: req.method
  });
  
  res.status(200).end();
});

app.get('/api/preflight-test', (req: Request, res: Response) => {
  const origin = req.headers.origin || 'No origin';
  
  console.log('Preflight test GET requested', {
    origin,
    method: req.method
  });
  logger.info('Preflight test GET requested', {
    origin,
    method: req.method
  });
  
  res.status(200).json({
    status: 'ok',
    message: 'Preflight test successful',
    origin
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
  console.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
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
  console.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, { ip: req.ip });
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
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Deployment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
      console.log(`Health check available at http://localhost:${PORT}/api/health`);
      
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Deployment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });
  });
}
