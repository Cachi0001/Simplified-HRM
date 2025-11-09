import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(401, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.statusCode
      }
    });
  }

  // Handle database connection errors gracefully
  if ((err as any).code === 'ENOENT' || (err as any).code === 'ENOTFOUND') {
    console.error('❌ Database connection error:', err.message);
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database connection unavailable. Please try again in a moment.',
        code: 503
      }
    });
  }

  // Handle database query errors
  if ((err as any).code === 'ECONNREFUSED') {
    console.error('❌ Database connection refused:', err.message);
    return res.status(503).json({
      success: false,
      error: {
        message: 'Unable to connect to database. Please contact support.',
        code: 503
      }
    });
  }

  // Handle PostgreSQL errors
  if ((err as any).code && (err as any).code.startsWith('23')) {
    console.error('❌ Database constraint error:', err.message);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database constraint violation. Please check your input.',
        code: 400
      }
    });
  }

  console.error('Unhandled error:', err);
  
  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error. Please try again later.' 
        : err.message,
      code: 500
    }
  });
};
