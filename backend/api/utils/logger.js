"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;

// Ensure logs directory exists (only if not in serverless)
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!isServerless && !fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Custom format for better readability
const customFormat = winston_1.default.format.printf(({ level, message, timestamp, ...metadata }) => {
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
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat);
// Create a custom format for file output
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Create the logger
const winstonLogger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    defaultMeta: {
        service: 'hr-management-backend',
        environment: process.env.NODE_ENV || 'development',
        deployment: process.env.VERCEL ? 'vercel' : 'local'
    },
    transports: [
        // Always use console transport
        new winston_1.default.transports.Console({
            format: consoleFormat
        })
    ],
});

// Only add file transports if not in serverless environment
if (!isServerless && process.env.NODE_ENV !== 'production') {
    winstonLogger.add(new winston_1.default.transports.File({
        filename: path_1.default.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat
    }));
    winstonLogger.add(new winston_1.default.transports.File({
        filename: path_1.default.join(logsDir, 'combined.log'),
        format: fileFormat
    }));
    winstonLogger.add(new winston_1.default.transports.File({
        filename: path_1.default.join(logsDir, 'cors.log'),
        level: 'debug',
        format: fileFormat
    }));
}
// Create a more robust logger that handles errors gracefully
const logger = {
    info: (message, meta) => {
        try {
            winstonLogger.info(message, meta);
        }
        catch (error) {
            console.info(`[INFO] ${message}`, meta);
            console.error('Logger error:', error);
        }
    },
    error: (message, meta) => {
        try {
            winstonLogger.error(message, meta);
        }
        catch (error) {
            console.error(`[ERROR] ${message}`, meta);
            console.error('Logger error:', error);
        }
    },
    warn: (message, meta) => {
        try {
            winstonLogger.warn(message, meta);
        }
        catch (error) {
            console.warn(`[WARN] ${message}`, meta);
            console.error('Logger error:', error);
        }
    },
    debug: (message, meta) => {
        try {
            winstonLogger.debug(message, meta);
        }
        catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                console.debug(`[DEBUG] ${message}`, meta);
                console.error('Logger error:', error);
            }
        }
    },
    // Add special methods for CORS debugging
    cors: {
        request: (origin, allowed) => {
            try {
                winstonLogger.debug(`CORS Request: Origin=${origin}, Allowed=${allowed}`, {
                    component: 'cors',
                    origin,
                    allowed
                });
            }
            catch (error) {
                console.debug(`[CORS] Request: Origin=${origin}, Allowed=${allowed}`);
                console.error('Logger error:', error);
            }
        },
        config: (config) => {
            try {
                winstonLogger.debug(`CORS Config: ${JSON.stringify(config)}`, {
                    component: 'cors',
                    config
                });
            }
            catch (error) {
                console.debug(`[CORS] Config:`, config);
                console.error('Logger error:', error);
            }
        }
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map