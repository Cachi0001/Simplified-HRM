import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
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
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: { 
    service: 'hr-management-backend',
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL ? 'vercel' : 'local'
  },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      format: fileFormat
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat
    }),
    // Create a special CORS debug log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'cors.log'),
      level: 'debug',
      format: fileFormat
    })
  ],
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
} else {
  // In production, still log to console but with less verbose output
  logger.add(new winston.transports.Console({
    level: 'info',
    format: consoleFormat
  }));
}

// Add special methods for CORS debugging
const corsLogger = {
  request: (origin: string, allowed: boolean) => {
    logger.debug(`CORS Request: Origin=${origin}, Allowed=${allowed}`, { 
      component: 'cors', 
      origin, 
      allowed 
    });
  },
  config: (config: any) => {
    logger.debug(`CORS Config: ${JSON.stringify(config)}`, { 
      component: 'cors', 
      config 
    });
  }
};

// Extend the logger with CORS-specific methods
const extendedLogger = {
  ...logger,
  cors: corsLogger
};

export default extendedLogger;
