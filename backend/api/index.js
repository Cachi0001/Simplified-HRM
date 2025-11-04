// Minimal Vercel serverless function for the main API
const express = require('express');

const app = express();

// Simple CORS middleware - only localhost and production
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Only allow these two origins
  const allowedOrigins = [
    'http://localhost:5173',
    'https://go3nethrm.vercel.app'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Minimal API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Environment check
app.get('/env-check', (req, res) => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'JWT_SECRET'
  ];

  const envStatus = {};
  requiredVars.forEach(varName => {
    envStatus[varName] = !!process.env[varName];
  });

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    variables: envStatus,
    timestamp: new Date().toISOString()
  });
});

// Basic auth test
app.post('/auth/test', (req, res) => {
  try {
    res.json({
      status: 'ok',
      message: 'Auth endpoint reachable',
      body: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    // Check if we have Supabase credentials
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'Database configuration missing'
      });
    }

    // For now, return a test response
    res.json({
      status: 'ok',
      message: 'Login endpoint working',
      email: email,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasJWT: !!process.env.JWT_SECRET,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

module.exports = app;