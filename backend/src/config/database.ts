import mongoose from 'mongoose';
import logger from '../utils/logger';

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('🔄 Database already connected');
      return;
    }

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/go3net-hrm';
        const dbName = process.env.MONGODB_DB_NAME || 'go3net-hrm';

        // Debug: Log the actual URI being used (without credentials)
        console.log('🔍 Database connection attempt:', {
          hasMongoUri: !!process.env.MONGODB_URI,
          mongoUriLength: mongoUri.length,
          dbName,
          nodeEnv: process.env.NODE_ENV,
          attempt,
          isServerless
        });

        logger.info('🔌 Attempting to connect to MongoDB...', {
          mongoUri: mongoUri.replace(/\/\/.*@/, '//***:***@'),
          attempt,
          maxRetries
        });

        await mongoose.connect(mongoUri, {
          dbName,
          maxPoolSize: isServerless ? 5 : 10, // Smaller pool for serverless
          minPoolSize: 1,
          serverSelectionTimeoutMS: isServerless ? 10000 : 5000, // Longer timeout for serverless cold starts
          socketTimeoutMS: 45000,
          bufferCommands: true, // Enable buffering for serverless environments
          maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
          heartbeatFrequencyMS: 10000, // Check connection every 10s
        });

        this.isConnected = true;
        logger.info('✅ MongoDB connected successfully', { attempt, maxRetries });

        // Handle connection events
        mongoose.connection.on('error', (error) => {
          logger.error('❌ MongoDB connection error:', { error });
          this.isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
          logger.warn('⚠️ MongoDB disconnected');
          this.isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
          logger.info('🔄 MongoDB reconnected');
          this.isConnected = true;
        });

        return; // Success, exit retry loop

      } catch (error) {
        logger.error('❌ Failed to connect to MongoDB:', {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          maxRetries,
          isServerless
        });

        this.isConnected = false;

        if (attempt === maxRetries) {
          throw error; // Last attempt failed, throw error
        }

        // Wait before retry (exponential backoff)
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.info(`🔄 Retrying database connection in ${delay}ms...`, { attempt: attempt + 1 });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('🔌 MongoDB disconnected');
    } catch (error) {
      logger.error('❌ Error disconnecting from MongoDB:', { error });
      throw error;
    }
  }

  public getConnection(): typeof mongoose {
    return mongoose;
  }

  public isDbConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export default DatabaseConfig.getInstance();
