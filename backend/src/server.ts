import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
} else {
  // .env file loaded successfully (reduced logging)
}

// Validate critical environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot start server without required environment variables');
    // Don't exit in production, let Vercel handle it
  }
}

if (process.env.NODE_ENV !== 'production') {
  // Loading .env file for development (reduced logging)
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}




import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import logger from './utils/logger';
import DomainValidator from './utils/domainValidator';
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
import departmentRoutes from './routes/department.routes';
import approvalRoutes from './routes/approval.routes';
import requestNotificationRoutes from './routes/request-notifications.routes';
import performanceRoutes from './routes/performance.routes';
import settingsRoutes from './routes/settings.routes';

import checkoutMonitoringRoutes from './routes/checkout-monitoring.routes';
import jobsRoutes from './routes/jobs.routes';
import messageIndicatorRoutes from './routes/messageIndicators';
import roleManagementRoutes from './routes/roleManagement';
import typingIndicatorRoutes from './routes/typingIndicators';
import conversationHistoryRoutes from './routes/conversationHistory.routes';
import roleRoutes from './routes/roleRoutes';
import dashboardRoutes from './routes/dashboard.routes';
import domainRoutes from './routes/domain.routes';
import CheckoutMonitoringService from './services/CheckoutMonitoringService';
import JobScheduler from './services/JobScheduler';
import SchedulerService from './services/SchedulerService';
import supabaseConfig from './config/supabase';
import { initializeWebSocketService } from './services/WebSocketService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  (req as any).requestId = requestId;
  const origin = req.headers.origin || 'No origin';
  const forwardedFor = req.headers['x-forwarded-for'] || 'Not set';
  const userAgent = req.headers['user-agent'] || 'Not set';
  // Only log chat-related requests
  if (req.originalUrl.includes('/chat') || req.originalUrl.includes('/message')) {
    logger.info('Chat request', {
      requestId,
      method: req.method,
      url: req.originalUrl
    });
  }
  
  res.on('finish', () => {
    // Only log chat-related request completions
    if (req.originalUrl.includes('/chat') || req.originalUrl.includes('/message')) {
      const duration = Date.now() - startTime;
      logger.info('Chat request completed', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration
      });
    }
  });
  next();
});

// Initialize database connection
async function initializeDatabase() {
  try {
    await supabaseConfig.connect();
    // Supabase connected successfully (reduced logging)
    logger.info('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    logger.error('❌ Supabase connection failed:', { error });
    process.exit(1);
  }
}

// Security middleware (optimized for serverless with go3net.com support)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https://go3net.com", "https://*.go3net.com", "https://go3nethrm.com", "https://*.go3nethrm.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://go3net.com", "https://*.go3net.com"],
      scriptSrc: ["'self'", "https://go3net.com", "https://*.go3net.com"],
      imgSrc: ["'self'", "data:", "https:", "https://go3net.com", "https://*.go3net.com"],
      connectSrc: ["'self'", "https://go3net.com", "https://*.go3net.com", "https://go3nethrm-backend.vercel.app", "wss://go3net.com", "wss://*.go3net.com"],
      fontSrc: ["'self'", "https://go3net.com", "https://*.go3net.com"],
      frameSrc: ["'self'", "https://go3net.com", "https://*.go3net.com"],
      frameAncestors: ["'self'", "https://go3net.com", "https://*.go3net.com"]
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Define allowed origins explicitly
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://go3nethrm.vercel.app',
    'https://go3net.com',
    'https://www.go3net.com',
    'https://app.go3net.com',
    'https://admin.go3net.com',
    'https://hr.go3net.com',
    'https://hrm.go3net.com',
    'https://go3nethrm.com',
    'https://www.go3nethrm.com'
  ];

  // Check if origin is allowed
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // Always allow localhost for development, regardless of NODE_ENV
  const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));

  // Also use domain validator as fallback
  const validationResult = DomainValidator.getValidationDetails(origin || '');
  const isDomainValid = validationResult.isValid;

  // Allow if any method approves OR if no origin (same-origin requests)
  const shouldAllow = !origin || isAllowedOrigin || isLocalhost || isDomainValid;

  if (shouldAllow && origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    
    // Log successful CORS validation
    const method = isAllowedOrigin ? 'explicit-list' : 
                   isLocalhost ? 'localhost-override' : 'domain-validator';
    
    logger.info('✅ CORS: Origin allowed', {
      origin,
      method,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } else if (!origin) {
    // Same-origin request, no CORS headers needed
    logger.debug('Same-origin request, no CORS headers needed');
  } else {
    // Enhanced logging for rejected origins
    logger.warn('❌ CORS: Rejected origin', {
      origin,
      reason: 'Not in allowed origins list and failed domain validation',
      validationResult,
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
    // CORS: Handling preflight request (reduced logging)
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
app.use('/api/leave-requests', leaveRoutes); // Alias for frontend compatibility
app.use('/api/purchase', purchaseRoutes);
app.use('/api/purchase-requests', purchaseRoutes); // Alias for frontend compatibility
app.use('/api/chat', chatRoutes);
app.use('/api/typing', typingRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/approval-workflow', approvalRoutes);
app.use('/api/request-notifications', requestNotificationRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api/checkout-monitoring', checkoutMonitoringRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/message-indicators', messageIndicatorRoutes);
app.use('/api/role-management', roleManagementRoutes);
app.use('/api/typing-indicators', typingIndicatorRoutes);
app.use('/api/conversation-history', conversationHistoryRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/domain', domainRoutes);

// Debug endpoint to check current user
app.get('/api/debug/user', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }

    const decoded = jwt.verify(token, secret) as any;
    
    // Check if user exists in employees table
    const supabase = supabaseConfig.getClient();
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, email, full_name, role, active')
      .eq('id', decoded.sub)
      .single();

    res.json({
      jwt_payload: decoded,
      employee_found: !error,
      employee_data: employee,
      error: error?.message
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// WebSocket health check endpoint
app.get('/api/websocket/health', async (req: Request, res: Response) => {
  try {
    const { getWebSocketService } = await import('./services/WebSocketService');
    const webSocketService = getWebSocketService();
    
    if (webSocketService) {
      const health = webSocketService.getHealthStatus();
      res.status(200).json({
        status: 'ok',
        message: 'WebSocket service is running',
        timestamp: new Date().toISOString(),
        websocket: health
      });
    } else {
      res.status(503).json({
        status: 'error',
        message: 'WebSocket service not initialized',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check WebSocket health',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  // Health check requested (reduced logging)
  logger.info('Health check requested', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin || 'No origin'
  });

  // Basic health check without database dependency
  const basicHealth = {
    status: 'ok',
    message: 'HR Management System Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL ? 'vercel' : 'local',
    config: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
    }
  };

  // Try database check but don't fail if it doesn't work
  try {
    const dbStatus = await supabaseConfig.healthCheck();
    res.status(200).json({
      ...basicHealth,
      database: dbStatus
    });
  } catch (error) {
    logger.error('❌ Health check database failed:', { error });
    res.status(200).json({
      ...basicHealth,
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

  // CORS test requested (reduced logging)
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

  // CORS configuration (reduced logging)

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
  // Preflight test requested (reduced logging)
  logger.info('Preflight test requested', {
    origin: req.headers.origin || 'No origin',
    method: req.method
  });

  res.status(200).end();
});

app.get('/api/preflight-test', (req: Request, res: Response) => {
  const origin = req.headers.origin || 'No origin';

  // Preflight test GET requested (reduced logging)
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
  // Password reset preflight requested (reduced logging)
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
    // Initialize services
    logger.info('🔄 Initializing services...');
    
    // Initialize checkout monitoring service (this will set up CRON jobs)
    CheckoutMonitoringService;
    logger.info('✅ Checkout monitoring service initialized');
    
    // Initialize job scheduler (this will set up all CRON jobs)
    JobScheduler;
    logger.info('✅ Job scheduler initialized with all CRON jobs');
    
    // Initialize attendance scheduler service
    const schedulerService = SchedulerService.getInstance();
    schedulerService.initializeJobs();
    logger.info('✅ Attendance scheduler service initialized');
    
    // Create HTTP server
    const server = createServer(app);
    
    // Initialize WebSocket service
    const webSocketService = initializeWebSocketService(server);
    logger.info('✅ WebSocket service initialized with Redis');
    
    server.listen(PORT, () => {
      console.log(`💬 Chat server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 WebSocket ready for real-time chat`);

      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Deployment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
      logger.info(`WebSocket server ready for real-time chat`);
    });
  })();
}
