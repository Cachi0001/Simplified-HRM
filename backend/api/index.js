const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import route handlers
const authRoutes = require('./routes/auth.routes');
const employeeRoutes = require('./routes/employee.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const taskRoutes = require('./routes/task.routes');

const app = express();

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
