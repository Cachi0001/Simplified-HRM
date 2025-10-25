"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const AuthService_1 = require("../services/AuthService");
const MongoAuthRepository_1 = require("../repositories/implementations/MongoAuthRepository");
const auth_middleware_1 = require("../middleware/auth.middleware");
const User_1 = require("../models/User");
const Employee_1 = require("../models/Employee");
const router = (0, express_1.Router)();
const authRepository = new MongoAuthRepository_1.MongoAuthRepository();
const authService = new AuthService_1.AuthService(authRepository);
const authController = new AuthController_1.AuthController(authService);

// Log auth route initialization and environment variables
console.log('🔐 Auth Routes Initialized');
console.log('🔍 Auth Environment Check:', {
  MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
  SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
});

// Middleware to log all auth requests
router.use((req, res, next) => {
  console.log('🔐 Auth Request:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  next();
});

router.post('/signup', (req, res) => authController.signUp(req, res));
router.post('/login', (req, res) => authController.signIn(req, res));
router.post('/resend-confirmation', (req, res) => authController.resendConfirmationEmail(req, res));
router.get('/confirm/:token', (req, res) => authController.confirmEmailByToken(req, res));
router.post('/confirm', (req, res) => authController.confirmEmail(req, res));
router.get('/me', auth_middleware_1.authenticateToken, (req, res) => authController.getCurrentUser(req, res));
router.post('/refresh', auth_middleware_1.authenticateToken, (req, res) => authController.refreshToken(req, res));
router.post('/signout', (req, res) => authController.signOut(req, res));
router.post('/forgot-password', (req, res) => authController.resetPassword(req, res));
router.post('/reset-password/:token', (req, res) => authController.resetPasswordWithToken(req, res));
router.put('/update-password', (req, res) => authController.updatePassword(req, res));
router.get('/debug/tokens', async (req, res) => {
    try {
        const usersWithTokens = await User_1.User.find({ emailVerificationToken: { $exists: true } })
            .select('email emailVerificationToken emailVerificationExpires emailVerified createdAt');
        const employeesWithTokens = await Employee_1.Employee.find({ emailVerificationToken: { $exists: true } })
            .select('email emailVerificationToken emailVerificationExpires emailVerified status');
        res.status(200).json({
            status: 'success',
            data: {
                users: usersWithTokens,
                employees: employeesWithTokens,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Debug query failed',
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map