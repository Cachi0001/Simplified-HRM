"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class AuthService {
    authRepository;
    constructor(authRepository) {
        this.authRepository = authRepository;
    }
    async signUp(userData) {
        try {
            logger_1.default.info('🔍 [AuthService] Starting signup process', {
                email: userData.email,
                fullName: userData.fullName,
                role: userData.role || 'employee',
                hasPassword: !!userData.password
            });
            if (!userData.email || !userData.fullName || !userData.password) {
                logger_1.default.error('❌ [AuthService] Missing required fields', {
                    hasEmail: !!userData.email,
                    hasFullName: !!userData.fullName,
                    hasPassword: !!userData.password
                });
                throw new Error('Email, full name, and password are required');
            }
            logger_1.default.info('🔄 [AuthService] Calling repository signup...');
            const result = await this.authRepository.signUp(userData);
            // Check if email confirmation is required
            if (result.requiresEmailVerification) {
                logger_1.default.info('📧 [AuthService] Email verification required - returning confirmation response', {
                    userId: result.user.id,
                    email: userData.email
                });
                return {
                    user: result.user,
                    accessToken: '',
                    refreshToken: '',
                    requiresEmailVerification: true,
                    message: result.message || 'Account created! Please check your email to verify your account before logging in.'
                };
            }
            logger_1.default.info('✅ [AuthService] User signed up successfully', {
                userId: result.user.id,
                email: userData.email,
                role: result.user.role
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('❌ [AuthService] Signup failed', {
                error: error.message,
                stack: error.stack,
                email: userData.email
            });
            throw error;
        }
    }
    async signIn(credentials) {
        try {
            logger_1.default.info('🔐 [AuthService] Password signin request', { email: credentials.email });
            if (!credentials.email || !credentials.password) {
                throw new Error('Email and password are required');
            }
            const result = await this.authRepository.signIn(credentials);
            logger_1.default.info('✅ [AuthService] User signed in successfully', { email: credentials.email });
            return result;
        }
        catch (error) {
            logger_1.default.error('❌ [AuthService] Signin failed', { error: error.message });
            throw error;
        }
    }
    async signInWithGoogle(provider, idToken) {
        try {
            logger_1.default.info('AuthService: Google OAuth signin', { provider });
            const result = await this.authRepository.signInWithOAuth(provider, idToken);
            logger_1.default.info('AuthService: Google OAuth successful');
            return result;
        }
        catch (error) {
            logger_1.default.error('AuthService: Google OAuth failed', { error: error.message });
            throw error;
        }
    }
    async refreshToken(refreshToken) {
        try {
            if (!refreshToken) {
                throw new Error('Refresh token is required');
            }
            return await this.authRepository.refreshToken(refreshToken);
        }
        catch (error) {
            logger_1.default.error('AuthService: Token refresh failed', { error: error.message });
            throw error;
        }
    }
    async updatePassword(email, currentPassword, newPassword) {
        try {
            if (!email || !currentPassword || !newPassword) {
                throw new Error('Email, current password, and new password are required');
            }
            const user = await this.authRepository.getCurrentUser(email);
            if (!user) {
                throw new Error('User not found');
            }
            const isValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
            if (!isValid) {
                throw new Error('Current password is incorrect');
            }
            user.passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
            await user.save();
        }
        catch (error) {
            logger_1.default.error('AuthService: Update password failed', { error: error.message });
            throw error;
        }
    }
    async getCurrentUser(accessToken) {
        try {
            if (!accessToken) {
                throw new Error('Access token is required');
            }
            const user = await this.authRepository.getCurrentUser(accessToken);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        }
        catch (error) {
            logger_1.default.error('AuthService: Get current user failed', { error: error.message });
            throw error;
        }
    }
    async signOut(accessToken) {
        try {
            if (!accessToken) {
                throw new Error('Access token is required');
            }
            await this.authRepository.signOut(accessToken);
            logger_1.default.info('AuthService: User signed out');
        }
        catch (error) {
            logger_1.default.error('AuthService: Signout failed', { error: error.message });
            throw error;
        }
    }
    async resetPassword(email) {
        try {
            if (!email) {
                throw new Error('Email is required');
            }
            await this.authRepository.resetPassword(email);
            logger_1.default.info('AuthService: Password reset email sent', { email });
        }
        catch (error) {
            logger_1.default.error('AuthService: Password reset failed', { error: error.message });
            throw error;
        }
    }
    async resendConfirmationEmail(email) {
        try {
            if (!email) {
                throw new Error('Email is required');
            }
            const result = await this.authRepository.resendConfirmationEmail(email);
            logger_1.default.info('AuthService: Confirmation email resent', { email });
            return result; // Return the repository response directly
        }
        catch (error) {
            logger_1.default.error('AuthService: Resend confirmation failed', { error: error.message });
            throw error;
        }
    }
    async confirmEmail(accessToken, refreshToken) {
        try {
            logger_1.default.info('🔗 [AuthService] Confirming email with tokens');
            // For MongoDB, email verification is handled via refresh token
            // This method can be used for email verification token confirmation
            if (!accessToken || !refreshToken) {
                throw new Error('Both access token and refresh token are required');
            }
            // Use the repository's refresh token method to verify and get new tokens
            const result = await this.authRepository.refreshToken(refreshToken);
            // Mark email as verified
            if (result.user) {
                result.user.emailVerified = true;
                result.user.emailVerificationToken = undefined;
                await result.user.save();
            }
            logger_1.default.info('✅ [AuthService] Email confirmed successfully', {
                userId: result.user._id,
                email: result.user.email
            });
            return {
                ...result,
                message: 'Email verified successfully',
            };
        }
        catch (error) {
            logger_1.default.error('❌ [AuthService] Confirm email failed', { error: error.message });
            throw error;
        }
    }
    async getEmployeeByUserId(userId) {
        try {
            return await this.authRepository.getEmployeeByUserId(userId);
        }
        catch (error) {
            logger_1.default.error('AuthService: Get employee by user ID failed', { error: error.message });
            throw error;
        }
    }
    async createEmployeeRecord(employeeData) {
        try {
            return await this.authRepository.createEmployeeRecord(employeeData);
        }
        catch (error) {
            logger_1.default.error('AuthService: Create employee record failed', { error: error.message });
            throw error;
        }
    }
    async confirmEmailByToken(token) {
        try {
            logger_1.default.info('🔗 [AuthService] Confirming email by token', { token });
            const result = await this.authRepository.confirmEmailByToken(token);
            logger_1.default.info('✅ [AuthService] Email confirmed by token successfully', {
                userId: result.user._id,
                email: result.user.email
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('❌ [AuthService] Confirm email by token failed', { error: error.message });
            throw error;
        }
    }
    async resetPasswordWithToken(token, newPassword) {
        try {
            if (!token || !newPassword) {
                throw new Error('Token and new password are required');
            }
            await this.authRepository.resetPasswordWithToken(token, newPassword);
            logger_1.default.info('AuthService: Password reset with token successful');
        }
        catch (error) {
            logger_1.default.error('AuthService: Password reset with token failed', { error: error.message });
            throw error;
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map