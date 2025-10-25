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
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/go3net-hrm';
            const dbName = process.env.MONGODB_DB_NAME || 'go3net-hrm';

            // Check if we're in serverless environment
            const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;

            logger_1.default.info('🔌 Attempting to connect to MongoDB...', { mongoUri: mongoUri.replace(/\/\/.*@/, '//***:***@') });
            await mongoose_1.default.connect(mongoUri, {
                dbName,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: !isServerless, // Allow buffering in serverless environments
            });
            this.isConnected = true;
            logger_1.default.info('✅ MongoDB connected successfully');
            // Handle connection events
            mongoose_1.default.connection.on('error', (error) => {
                logger_1.default.error('❌ MongoDB connection error:', { error });
            });
            mongoose_1.default.connection.on('disconnected', () => {
                logger_1.default.warn('⚠️ MongoDB disconnected');
                this.isConnected = false;
            });
            mongoose_1.default.connection.on('reconnected', () => {
                logger_1.default.info('🔄 MongoDB reconnected');
                this.isConnected = true;
            });
        }
        catch (error) {
            logger_1.default.error('❌ Failed to connect to MongoDB:', { error });
            throw error;
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