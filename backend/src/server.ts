import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
  console.log('🔍 Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
    PORT: process.env.PORT
  });
}

if (process.env.NODE_ENV !== 'production') {
  console.log('🔄 Loading .env file for development...');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}




import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import logger from './utils/logger';
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import taskRoutes from './routes/task.routes';
import notificationRoutes from './routes/notification.routes';
import leaveRoutes from './routes/leave.routes';
import purchaseRoutes from './routes/purchase.routes';
import chatRoutes from './routes/chat.routes';
import typingRoutes from './routes/typing.routes';
import announcementRoutes from './routes/announcement.routes';
import supabaseConfig from './config/supabase';

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
    await supabaseConfig.connect();
    console.log('✅ Supabase connected successfully');
    logger.info('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    logger.error('❌ Supabase connection failed:', { error });
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
  crossOriginEmbedderPolicy: false, // CORS configuration - MUST come first before any other middleware
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Define allowed origins - be more permissive for debugging
  const allowedOrigins = [
    'https://go3nethrm.vercel.app',
    'https://go3nethrm.com',
    'https://www.go3nethrm.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ];

  // Check if origin is allowed (more permissive matching)
  const isAllowedOrigin = !origin || allowedOrigins.some(allowed => {
    const cleanOrigin = origin.replace(/^https?:\/\//, '').toLowerCase();
    const cleanAllowed = allowed.replace(/^https?:\/\//, '').toLowerCase();
    return cleanOrigin === cleanAllowed || cleanOrigin.endsWith('.' + cleanAllowed);
  });

  if (isAllowedOrigin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
  } else {
    // Log rejected origins for debugging
    console.log('❌ CORS: Rejected origin', {
      origin,
      allowedOrigins,
      timestamp: new Date().toISOString()
    });
    logger.warn('❌ CORS: Rejected origin', {
      origin,
      allowedOrigins,
      timestamp: new Date().toISOString()
    });
  }

  // Enhanced CORS headers for password reset and other requests
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-Forwarded-For, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

  // Handle preflight requests - must come before any other middleware
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS: Handling preflight request', {
      origin,
      method: req.headers['access-control-request-method'],
      headers: req.headers['access-control-request-headers'],
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    });
    logger.info('🔄 CORS: Handling preflight request', {
      origin,
      method: req.headers['access-control-request-method'],
      headers: req.headers['access-control-request-headers'],
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });

    // Immediately respond to preflight without calling next()
    res.status(200).end();
    return;
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/typing', typingRoutes);
app.use('/api/announcements', announcementRoutes);

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
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

  try {
    const dbStatus = await supabaseConfig.healthCheck();

    res.status(200).json({
      status: 'ok',
      message: 'HR Management System Backend is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      deployment: process.env.VERCEL ? 'vercel' : 'local',
      database: dbStatus,
      config: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
      }
    });
  } catch (error) {
    logger.error('❌ Health check failed:', { error });
    res.status(200).json({
      status: 'ok',
      message: 'HR Management System Backend is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      deployment: process.env.VERCEL ? 'vercel' : 'local',
      database: {
        status: 'error',
        connection: false,
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
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
app.options('/api/preflight-test', (req: Request, res: Response) => {
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

// Specific test for password reset CORS
app.options('/api/auth/reset-password/:token', (req: Request, res: Response) => {
  console.log('🔑 Password reset preflight requested', {
    origin: req.headers.origin || 'No origin',
    token: req.params.token ? 'PRESENT' : 'MISSING',
    method: req.method
  });
  logger.info('🔑 Password reset preflight requested', {
    origin: req.headers.origin || 'No origin',
    token: req.params.token ? 'PRESENT' : 'MISSING',
    method: req.method
  });

  res.status(200).end();
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
  (async () => {
    await initializeDatabase();
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
  })();
}
