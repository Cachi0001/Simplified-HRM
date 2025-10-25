"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
const authenticateToken = async (req, res, next) => {
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
            logger_1.default.error('JWT_SECRET not configured');
            res.status(500).json({
                status: 'error',
                message: 'Server configuration error'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        logger_1.default.error('Token verification failed', { error: error.message });
        res.status(403).json({
            status: 'error',
            message: 'Invalid or expired token'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
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
        }
        catch (error) {
            logger_1.default.error('Role check failed', { error: error.message });
            res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        }
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['admin']);
exports.requireAuth = (0, exports.requireRole)(['admin', 'employee']);
//# sourceMappingURL=auth.middleware.js.map