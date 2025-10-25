"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
if (process.env.NODE_ENV !== 'production') {
    dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
}
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = __importDefault(require("./utils/logger"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const employee_routes_1 = __importDefault(require("./routes/employee.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const database_1 = __importDefault(require("./config/database"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((req, res, next) => {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    req.requestId = requestId;
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
    logger_1.default.info('Incoming request', {
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
        logger_1.default.info('Request completed', {
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
        await database_1.default.connect();
        console.log('✅ Database connected successfully');
        logger_1.default.info('✅ Database connected successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        logger_1.default.error('❌ Database connection failed:', { error });
        process.exit(1);
    }
}
// Security middleware (optimized for serverless)
app.use((0, helmet_1.default)({
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
app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    if (origin !== '*') {
        res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});
// Body parsing middleware
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/employees', employee_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('Health check requested', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin || 'No origin'
    });
    logger_1.default.info('Health check requested', {
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
app.get('/api/cors-test', (req, res) => {
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
    logger_1.default.info('CORS test requested', {
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
    logger_1.default.debug('CORS configuration', { corsConfig });
    logger_1.default.debug('Request headers', { headers });
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
app.options('/api/preflight-test', (req, res) => {
    console.log('Preflight test requested', {
        origin: req.headers.origin || 'No origin',
        method: req.method
    });
    logger_1.default.info('Preflight test requested', {
        origin: req.headers.origin || 'No origin',
        method: req.method
    });
    res.status(200).end();
});
app.get('/api/preflight-test', (req, res) => {
    const origin = req.headers.origin || 'No origin';
    console.log('Preflight test GET requested', {
        origin,
        method: req.method
    });
    logger_1.default.info('Preflight test GET requested', {
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
app.get('/api', (req, res) => {
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
app.use((err, req, res, next) => {
    console.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });
    logger_1.default.error('Unhandled error', {
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
app.use((req, res) => {
    console.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, { ip: req.ip });
    logger_1.default.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, { ip: req.ip });
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});
// Export for Vercel serverless
exports.default = app;
// For local development
if (require.main === module) {
    initializeDatabase().then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Deployment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
            console.log(`Health check available at http://localhost:${PORT}/api/health`);
            logger_1.default.info(`Server is running on port ${PORT}`);
            logger_1.default.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger_1.default.info(`Deployment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
            logger_1.default.info(`Health check available at http://localhost:${PORT}/api/health`);
        });
    });
}
//# sourceMappingURL=server.js.map