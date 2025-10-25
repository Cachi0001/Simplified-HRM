"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConfig = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
class DatabaseConfig {
    static instance;
    isConnected = false;
    constructor() { }
    static getInstance() {
        if (!DatabaseConfig.instance) {
            DatabaseConfig.instance = new DatabaseConfig();
        }
        return DatabaseConfig.instance;
    }
    async connect() {
        if (this.isConnected) {
            logger_1.default.info('🔄 Database already connected');
            return;
        }
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second
        const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/go3net-hrm';
                const dbName = process.env.MONGODB_DB_NAME || 'go3net-hrm';

                // Check if the URI already contains a database name (MongoDB Atlas format)
                const isAtlasUri = mongoUri.includes('mongodb+srv://');

                // Debug: Log the actual URI being used (without credentials)
                console.log('🔍 Database connection attempt:', {
                    hasMongoUri: !!process.env.MONGODB_URI,
                    mongoUriLength: mongoUri.length,
                    dbName,
                    isAtlasUri,
                    nodeEnv: process.env.NODE_ENV,
                    attempt,
                    isServerless
                });

                // For Atlas, use URI only (database name in URI)
                // For local, use URI + dbName parameter
                const connectOptions = {
                    maxPoolSize: isServerless ? 5 : 10,
                    minPoolSize: 1,
                    serverSelectionTimeoutMS: isServerless ? 10000 : 5000,
                    socketTimeoutMS: 45000,
                    bufferCommands: true,
                    maxIdleTimeMS: 30000,
                    heartbeatFrequencyMS: 10000,
                };

                // Only add dbName for local development (not Atlas)
                if (!isAtlasUri) {
                    connectOptions.dbName = dbName;
                }

                await mongoose_1.default.connect(mongoUri, connectOptions);
                this.isConnected = true;
                logger_1.default.info('✅ MongoDB connected successfully', { attempt, maxRetries });
                mongoose_1.default.connection.on('error', (error) => {
                    logger_1.default.error('❌ MongoDB connection error:', { error });
                    this.isConnected = false;
                });
                mongoose_1.default.connection.on('disconnected', () => {
                    logger_1.default.warn('⚠️ MongoDB disconnected');
                    this.isConnected = false;
                });
                mongoose_1.default.connection.on('reconnected', () => {
                    logger_1.default.info('🔄 MongoDB reconnected');
                    this.isConnected = true;
                });
                return;
            }
            catch (error) {
                logger_1.default.error('❌ Failed to connect to MongoDB:', {
                    error: error instanceof Error ? error.message : String(error),
                    attempt,
                    maxRetries,
                    isServerless
                });
                this.isConnected = false;
                if (attempt === maxRetries) {
                    throw error;
                }
                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger_1.default.info(`🔄 Retrying database connection in ${delay}ms...`, { attempt: attempt + 1 });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    async disconnect() {
        try {
            await mongoose_1.default.disconnect();
            this.isConnected = false;
            logger_1.default.info('🔌 MongoDB disconnected');
        }
        catch (error) {
            logger_1.default.error('❌ Error disconnecting from MongoDB:', { error });
            throw error;
        }
    }
    getConnection() {
        return mongoose_1.default;
    }
    isDbConnected() {
        return this.isConnected && mongoose_1.default.connection.readyState === 1;
    }
}
exports.DatabaseConfig = DatabaseConfig;
exports.default = DatabaseConfig.getInstance();
//# sourceMappingURL=database.js.map