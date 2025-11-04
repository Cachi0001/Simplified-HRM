import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;

// Only create logs directory if not in serverless environment and not in production
const logsDir = path.join(process.cwd(), 'logs');
if (!isServerless && process.env.NODE_ENV !== 'production' && !fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    console.warn('Failed to create logs directory:', error);
  }
}

// Custom format for better readability
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let metaStr = '';
  if (Object.keys(metadata).length > 0 && metadata.service) {
    const { service, ...rest } = metadata;
    if (Object.keys(rest).length > 0) {
      metaStr = JSON.stringify(rest);
    }
  }
  
  return `${timestamp} [${level.toUpperCase()}] [${metadata.service || 'hr-management-backend'}]: ${message} ${metaStr}`;
});

// Create a custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  customFormat
);

// Create a custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: { 
    service: 'hr-management-backend',
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL ? 'vercel' : 'local'
  },
  transports: [
    // Always use console transport
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
});

// Only add file transports if not in serverless environment
if (!isServerless && process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.File({ 
    filename: path.join(logsDir, 'error.log'), 
    level: 'error',
    format: fileFormat
  }));

  winstonLogger.add(new winston.transports.File({ 
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat
  }));

  winstonLogger.add(new winston.transports.File({ 
    filename: path.join(logsDir, 'cors.log'),
    level: 'debug',
    format: fileFormat
  }));
}

// Create a more robust logger that handles errors gracefully
const logger = {
  info: (message: string, meta?: any) => {
    try {
      winstonLogger.info(message, meta);
    } catch (error) {
      console.info(`[INFO] ${message}`, meta);
      console.error('Logger error:', error);
    }
  },
  
  error: (message: string, meta?: any) => {
    try {
      winstonLogger.error(message, meta);
    } catch (error) {
      console.error(`[ERROR] ${message}`, meta);
      console.error('Logger error:', error);
    }
  },
  
  warn: (message: string, meta?: any) => {
    try {
      winstonLogger.warn(message, meta);
    } catch (error) {
      console.warn(`[WARN] ${message}`, meta);
      console.error('Logger error:', error);
    }
  },
  
  debug: (message: string, meta?: any) => {
    try {
      winstonLogger.debug(message, meta);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[DEBUG] ${message}`, meta);
        console.error('Logger error:', error);
      }
    }
  },
  
  // Add special methods for CORS debugging
  cors: {
    request: (origin: string, allowed: boolean) => {
      try {
        winstonLogger.debug(`CORS Request: Origin=${origin}, Allowed=${allowed}`, { 
          component: 'cors', 
          origin, 
          allowed 
        });
      } catch (error) {
        console.debug(`[CORS] Request: Origin=${origin}, Allowed=${allowed}`);
        console.error('Logger error:', error);
      }
    },
    
    config: (config: any) => {
      try {
        winstonLogger.debug(`CORS Config: ${JSON.stringify(config)}`, { 
          component: 'cors', 
          config 
        });
      } catch (error) {
        console.debug(`[CORS] Config:`, config);
        console.error('Logger error:', error);
      }
    }
  }
};

export default logger;
