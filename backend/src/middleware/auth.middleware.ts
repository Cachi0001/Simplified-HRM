import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        status: 'error',
        message: 'Server configuration error'
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error('Token verification failed', { error: (error as Error).message });
    res.status(403).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userRole = req.user.role;
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role check failed', { error: (error as Error).message });
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

export const requireAdmin = requireRole(['admin']);

export const requireAuth = requireRole(['admin', 'employee']);
