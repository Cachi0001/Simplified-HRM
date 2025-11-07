import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../config/jwt';
import { UserRepository } from '../repositories/UserRepository';
import { AuthenticationError, AuthorizationError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);

    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }

    const userRepo = new UserRepository();
    const user = await userRepo.findById(payload.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.email_verified) {
      throw new AuthenticationError('Email not verified');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireSupervisor = requireRole('hr', 'admin', 'superadmin', 'teamlead');
export const requireAdmin = requireRole('admin', 'superadmin');
export const requireSuperAdmin = requireRole('superadmin');
