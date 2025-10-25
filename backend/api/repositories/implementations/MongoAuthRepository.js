"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoAuthRepository = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Employee_1 = require("../../models/Employee");
const User_1 = require("../../models/User");
const logger_1 = __importDefault(require("../../utils/logger"));
class MongoAuthRepository {
    jwtSecret;
    jwtRefreshSecret;
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key';
        if (!process.env.JWT_SECRET) {
            logger_1.default.warn('JWT_SECRET not set, using fallback secret');
        }
    }
    async signUp(userData) {
        try {
            logger_1.default.info('🔍 [MongoAuthRepository] Starting signup process', {
                email: userData.email,
                fullName: userData.fullName,
                role: userData.role || 'employee'
            });
            // Check if user already exists
            const existingUser = await User_1.User.findOne({ email: userData.email });
            if (existingUser) {
                logger_1.default.warn('❌ [MongoAuthRepository] User already exists', { email: userData.email });
                throw new Error('This email is already registered. Please try signing in instead.');
            }
            // Create user
            const user = new User_1.User({
                email: userData.email,
                password: userData.password,
                fullName: userData.fullName,
                role: userData.role || 'employee',
                emailVerified: false,
            });
            await user.save();
            // Generate verification token BEFORE creating employee record
            const verificationToken = user.generateEmailVerificationToken();
            logger_1.default.info('🔑 [MongoAuthRepository] Generated verification token', {
                userId: user._id,
                email: user.email,
                token: verificationToken.substring(0, 10) + '...',
                expires: user.emailVerificationExpires
            });
            await user.save(); // Save user with token first
            logger_1.default.info('💾 [MongoAuthRepository] User saved with token', {
                userId: user._id,
                email: user.email,
                token: user.emailVerificationToken?.substring(0, 10) + '...',
                expires: user.emailVerificationExpires
            });
            // Create employee record with the same token
            const employeeStatus = userData.role === 'admin' ? 'active' : 'pending';
            const employee = new Employee_1.Employee({
                userId: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                status: employeeStatus,
                emailVerified: false,
                emailVerificationToken: verificationToken,
                emailVerificationExpires: user.emailVerificationExpires,
            });
            await employee.save();
            logger_1.default.info('💾 [MongoAuthRepository] Employee saved with token', {
                employeeId: employee._id,
                userId: employee.userId,
                email: employee.email,
                token: employee.emailVerificationToken?.substring(0, 10) + '...',
                expires: employee.emailVerificationExpires
            });
            // Send confirmation email with verification token (non-blocking)
            const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm?token=${verificationToken}`;
            logger_1.default.info('📧 [MongoAuthRepository] Queuing confirmation email', {
                email: user.email,
                confirmationUrl: confirmationUrl.substring(0, 100) + '...',
                token: verificationToken.substring(0, 10) + '...'
            });
            const emailService = new (require('../../services/EmailService').EmailService)();
            // Send email in background without blocking signup response
            emailService.sendEmailConfirmation(user.email, user.fullName, confirmationUrl)
                .then(() => {
                logger_1.default.info('✅ Confirmation email sent successfully', { email: user.email });
            })
                .catch((emailError) => {
                logger_1.default.error('⚠️ Failed to send confirmation email (non-blocking)', {
                    email: user.email,
                    error: emailError.message
                });
            });
            // Send notification to admins about new employee signup (non-blocking)
            this.notifyAdminsOfNewSignup(user, employee)
                .then(() => {
                logger_1.default.info('✅ Admin notification sent successfully', { email: user.email });
            })
                .catch((notificationError) => {
                logger_1.default.warn('⚠️ Failed to send admin notification (non-blocking):', notificationError);
            });
            logger_1.default.info('✅ [MongoAuthRepository] User created successfully', {
                userId: user._id,
                email: user.email,
                role: user.role,
                status: employeeStatus
            });
            return {
                user: user.toObject(),
                accessToken: '',
                requiresEmailVerification: true,
                message: 'Please check your email to verify your account. You will be able to login after email verification and admin approval.',
            };
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Signup failed:', error);
            throw error;
        }
    }
    async signIn(credentials) {
        try {
            logger_1.default.info('🔍 [MongoAuthRepository] Starting signin process', {
                email: credentials.email
            });
            // Find user by email
            const user = await User_1.User.findOne({ email: credentials.email });
            if (!user) {
                logger_1.default.warn('❌ [MongoAuthRepository] User not found', { email: credentials.email });
                throw new Error('Invalid email or password');
            }
            // Check password
            const isPasswordValid = await user.comparePassword(credentials.password);
            if (!isPasswordValid) {
                logger_1.default.warn('❌ [MongoAuthRepository] Invalid password', { email: credentials.email });
                throw new Error('Invalid email or password');
            }
            // Get employee record to check status
            const employee = await Employee_1.Employee.findOne({ userId: user._id });
            if (!employee) {
                logger_1.default.error('❌ [MongoAuthRepository] Employee record not found', {
                    userId: user._id,
                    email: user.email
                });
                throw new Error('Employee record not found');
            }

            logger_1.default.info('🔍 [MongoAuthRepository] Signin validation check:', {
                userId: user._id,
                email: user.email,
                userEmailVerified: user.emailVerified,
                employeeEmailVerified: employee.emailVerified,
                employeeStatus: employee.status,
                role: user.role
            });

            // Check if email is verified
            if (!user.emailVerified) {
                logger_1.default.warn('❌ [MongoAuthRepository] Email not verified', {
                    email: credentials.email,
                    userEmailVerified: user.emailVerified,
                    employeeEmailVerified: employee.emailVerified
                });
                throw new Error('Please verify your email before logging in');
            }

            // Check if employee is approved
            if (employee.status !== 'active') {
                logger_1.default.warn('❌ [MongoAuthRepository] Employee not approved', {
                    email: credentials.email,
                    status: employee.status,
                    userEmailVerified: user.emailVerified,
                    employeeEmailVerified: employee.emailVerified
                });
                // Return a special response for pending approval instead of throwing
                const error = new Error('Your account is pending approval. Please wait for admin approval before logging in.');
                error.code = 'PENDING_APPROVAL';
                error.status = employee.status;
                throw error;
            }
            // Generate JWT tokens
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);
            // Add refresh token to user
            user.addRefreshToken(refreshToken);
            await user.save();
            logger_1.default.info('✅ [MongoAuthRepository] User signed in successfully', {
                userId: user._id,
                email: user.email,
                role: user.role,
                employeeStatus: employee.status
            });
            return {
                user: user.toObject(),
                accessToken,
                refreshToken,
                message: 'Sign in successful',
            };
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Signin failed:', error);
            throw error;
        }
    }
    async signInWithOAuth(provider, idToken) {
        // Not implementing OAuth for now, will return error
        throw new Error('OAuth not implemented for MongoDB');
    }
    async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jsonwebtoken_1.default.verify(refreshToken, this.jwtRefreshSecret);
            // Find user
            const user = await User_1.User.findById(decoded.sub);
            if (!user) {
                throw new Error('User not found');
            }
            // Check if refresh token exists in user's tokens
            if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
                throw new Error('Invalid refresh token');
            }
            // Generate new tokens
            const newAccessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            // Remove old refresh token and add new one
            user.removeRefreshToken(refreshToken);
            user.addRefreshToken(newRefreshToken);
            await user.save();
            return {
                user: user.toObject(),
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Token refresh failed:', error);
            throw error;
        }
    }
    async getCurrentUser(accessToken) {
        try {
            // Verify access token
            const decoded = jsonwebtoken_1.default.verify(accessToken, this.jwtSecret);
            // Find user
            const user = await User_1.User.findById(decoded.sub);
            if (!user) {
                throw new Error('User not found');
            }
            // Get the employee record to include approval status
            const employee = await Employee_1.Employee.findOne({ userId: user._id });
            // Convert user to object
            const userObject = user.toObject();
            // Add status from employee record if it exists
            if (employee) {
                userObject.status = employee.status;
                logger_1.default.debug('✅ [MongoAuthRepository] Included employee status in user response', {
                    userId: user._id,
                    status: employee.status
                });
            }
            else {
                logger_1.default.warn('⚠️ [MongoAuthRepository] No employee record found for user', {
                    userId: user._id
                });
                // Default to pending if no employee record
                userObject.status = 'pending';
            }
            return userObject;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Get current user failed:', error);
            throw error;
        }
    }
    async signOut(accessToken) {
        try {
            // Verify access token
            const decoded = jsonwebtoken_1.default.verify(accessToken, this.jwtSecret);
            // Find user and remove all refresh tokens
            const user = await User_1.User.findById(decoded.sub);
            if (user) {
                user.refreshTokens = [];
                await user.save();
            }
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Sign out failed:', error);
            throw error;
        }
    }
    async resetPassword(email) {
        try {
            const user = await User_1.User.findOne({ email });
            if (!user) {
                logger_1.default.warn('❌ [MongoAuthRepository] User not found for password reset', { email });
                return; // Don't reveal if email exists
            }
            // Generate reset token
            const resetToken = user.generatePasswordResetToken();
            await user.save();
            // Update employee record
            const employee = await Employee_1.Employee.findOne({ userId: user._id });
            if (employee) {
                employee.passwordResetToken = resetToken;
                employee.passwordResetExpires = user.passwordResetExpires;
                await employee.save();
            }
            // Send password reset email with token
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
            logger_1.default.info('📧 [MongoAuthRepository] Sending password reset email', {
                email: user.email,
                resetUrl: resetUrl.substring(0, 100) + '...',
                token: resetToken.substring(0, 10) + '...'
            });
            const emailService = new (require('../../services/EmailService').EmailService)();
            await emailService.sendPasswordResetEmail(user.email, user.fullName, resetUrl);
            logger_1.default.info('✅ [MongoAuthRepository] Password reset email sent', {
                userId: user._id,
                email: user.email
            });
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Password reset failed:', error);
            throw error;
        }
    }
    async updatePassword(accessToken, newPassword) {
        try {
            // Verify access token
            const decoded = jsonwebtoken_1.default.verify(accessToken, this.jwtSecret);
            // Find user
            const user = await User_1.User.findById(decoded.sub);
            if (!user) {
                throw new Error('User not found');
            }
            // Update password
            user.password = newPassword;
            await user.save();
            // Clear all refresh tokens for security
            user.refreshTokens = [];
            await user.save();
            logger_1.default.info('✅ [MongoAuthRepository] Password updated successfully', {
                userId: user._id,
                email: user.email
            });
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Update password failed:', error);
            throw error;
        }
    }
    async updatePasswordByEmail(email, newPassword) {
        try {
            // Find user by email
            const user = await User_1.User.findOne({ email });
            if (!user) {
                throw new Error('User not found');
            }
            // Update password
            user.password = newPassword;
            await user.save();
            // Clear all refresh tokens for security
            user.refreshTokens = [];
            await user.save();
            logger_1.default.info('✅ [MongoAuthRepository] Password updated by email successfully', {
                email: user.email
            });
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Update password by email failed:', error);
            throw error;
        }
    }
    async resetPasswordWithToken(token, newPassword) {
        try {
            logger_1.default.info('🔑 [MongoAuthRepository] Resetting password with token', { token });
            // Find user by password reset token
            const user = await User_1.User.findOne({ passwordResetToken: token });
            if (!user) {
                logger_1.default.warn('❌ [MongoAuthRepository] User not found with reset token', { token });
                throw new Error('Invalid or expired reset token');
            }
            // Check if token is still valid (not expired)
            if (!user.isValidPasswordResetToken(token)) {
                logger_1.default.warn('❌ [MongoAuthRepository] Reset token expired', {
                    token,
                    expires: user.passwordResetExpires,
                    now: new Date()
                });
                throw new Error('Reset token has expired. Please request a new password reset.');
            }
            // Update password (set plain text, pre-save hook will hash it)
            user.password = newPassword;
            user.markModified('password'); // Ensure the pre-save hook runs
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            // Clear all refresh tokens for security
            user.refreshTokens = [];
            await user.save();
            // Update employee record if exists
            const employee = await Employee_1.Employee.findOne({ userId: user._id });
            if (employee) {
                employee.passwordResetToken = undefined;
                employee.passwordResetExpires = undefined;
                await employee.save();
            }
            logger_1.default.info('✅ [MongoAuthRepository] Password reset successfully', {
                userId: user._id,
                email: user.email
            });
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Reset password with token failed:', error);
            throw error;
        }
    }
    async confirmEmailByToken(token) {
        try {
            logger_1.default.info('🔗 [MongoAuthRepository] Confirming email by token', { token });
            // Find user by verification token
            const user = await User_1.User.findOne({ emailVerificationToken: token });
            if (!user) {
                logger_1.default.warn('❌ [MongoAuthRepository] User not found with token', { token });
                logger_1.default.info('🔍 [MongoAuthRepository] Checking all users with verification tokens...');
                const usersWithTokens = await User_1.User.find({ emailVerificationToken: { $exists: true } }).select('email emailVerificationToken emailVerificationExpires');
                logger_1.default.info('📋 [MongoAuthRepository] Users with tokens:', usersWithTokens.map(u => ({
                    email: u.email,
                    token: u.emailVerificationToken?.substring(0, 10) + '...',
                    expires: u.emailVerificationExpires
                })));
                // Check if any user with this email is already verified
                const emailFromToken = this.extractEmailFromToken(token);
                logger_1.default.info('🔍 [MongoAuthRepository] Extracted email from token:', emailFromToken);
                if (emailFromToken) {
                    const verifiedUser = await User_1.User.findOne({ email: emailFromToken, emailVerified: true });
                    if (verifiedUser) {
                        logger_1.default.info('✅ [MongoAuthRepository] Email already verified', { email: emailFromToken });
                        throw new Error('Email has already been verified. Please log in to continue.');
                    }
                }
                throw new Error('Invalid or expired verification token');
            }
            // Check if token is still valid (not expired)
            if (!user.isValidEmailVerificationToken(token)) {
                logger_1.default.warn('❌ [MongoAuthRepository] Token expired', {
                    token,
                    expires: user.emailVerificationExpires,
                    now: new Date()
                });
                throw new Error('Verification token has expired. Please request a new confirmation email.');
            }
            // Check if email is already verified
            if (user.emailVerified) {
                logger_1.default.info('✅ [MongoAuthRepository] Email already verified', { email: user.email });
                throw new Error('Email has already been verified. Please log in to continue.');
            }
            // Find employee record
            const employee = await Employee_1.Employee.findOne({ userId: user._id });
            if (!employee) {
                logger_1.default.error('❌ [MongoAuthRepository] Employee record not found', { userId: user._id });
                throw new Error('Employee record not found');
            }
            logger_1.default.info('✅ [MongoAuthRepository] Token validation successful', {
                userId: user._id,
                email: user.email,
                employeeStatus: employee.status
            });
            // Mark email as verified
            logger_1.default.info('🔄 [MongoAuthRepository] Marking email as verified', {
                userId: user._id,
                email: user.email,
                currentEmailVerified: user.emailVerified
            });
            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();
            logger_1.default.info('✅ [MongoAuthRepository] Email verified in database', {
                userId: user._id,
                email: user.email,
                emailVerified: user.emailVerified
            });
            // Update employee record
            employee.emailVerified = true;
            employee.emailVerificationToken = undefined;
            employee.emailVerificationExpires = undefined;
            await employee.save();
            // Generate JWT tokens (only if employee is active)
            let accessToken = '';
            let refreshToken = '';
            if (employee.status === 'active') {
                accessToken = this.generateAccessToken(user);
                refreshToken = this.generateRefreshToken(user);
                user.addRefreshToken(refreshToken);
                await user.save();
            }
            logger_1.default.info('✅ [MongoAuthRepository] Email confirmed successfully', {
                userId: user._id,
                email: user.email,
                employeeStatus: employee.status
            });
            return {
                user: user.toObject(),
                accessToken,
                refreshToken,
                requiresEmailVerification: false,
                message: employee.status === 'active'
                    ? 'Email verified successfully! You can now log in.'
                    : 'Email verified successfully! Please wait for admin approval before logging in.',
            };
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Confirm email by token failed:', error);
            throw error;
        }
    }
    async setSession(accessToken, refreshToken) {
        // Not needed for MongoDB implementation
        return { accessToken, refreshToken };
    }
    async getEmployeeByUserId(userId) {
        try {
            const employee = await Employee_1.Employee.findOne({ userId }).populate('userId');
            return employee ? employee.toObject() : null;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Get employee by user ID failed:', error);
            throw error;
        }
    }
    async createEmployeeRecord(employeeData) {
        try {
            logger_1.default.info('➕ [MongoAuthRepository] Creating employee record', {
                userId: employeeData.userId,
                email: employeeData.email,
                role: employeeData.role
            });
            const employee = new Employee_1.Employee(employeeData);
            await employee.save();
            logger_1.default.info('✅ [MongoAuthRepository] Employee record created', {
                employeeId: employee._id,
                userId: employee.userId,
                status: employee.status
            });
            return employee.toObject();
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Create employee record failed:', error);
            throw error;
        }
    }
    async resendConfirmationEmail(email) {
        try {
            logger_1.default.info('📧 [MongoAuthRepository] Resending confirmation email', { email });
            const user = await User_1.User.findOne({ email });
            if (!user) {
                logger_1.default.warn('❌ [MongoAuthRepository] User not found', { email });
                throw new Error('User not found');
            }
            if (user.emailVerified) {
                logger_1.default.info('✅ [MongoAuthRepository] Email already verified', { email });
                return {
                    message: 'Email is already verified'
                };
            }
            // Generate new verification token
            const verificationToken = user.generateEmailVerificationToken();
            await user.save();
            // Update employee record
            const employee = await Employee_1.Employee.findOne({ userId: user._id });
            if (employee) {
                employee.emailVerificationToken = verificationToken;
                employee.emailVerificationExpires = user.emailVerificationExpires;
                await employee.save();
            }
            // Send confirmation email with new verification token
            const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm?token=${verificationToken}`;
            const emailService = new (require('../../services/EmailService').EmailService)();
            await emailService.sendEmailConfirmation(user.email, user.fullName, confirmationUrl);
            return {
                message: 'Confirmation email resent successfully. Please check your inbox.'
            };
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Resend confirmation email failed:', error);
            throw error;
        }
    }
    async notifyAdminsOfNewSignup(user, employee) {
        try {
            // Find all admin users
            const adminUsers = await User_1.User.find({ role: 'admin' });
            if (adminUsers.length === 0) {
                logger_1.default.info('ℹ️ [MongoAuthRepository] No admin users found for notification');
                return;
            }
            logger_1.default.info('📢 [MongoAuthRepository] Notifying admins of new signup', {
                newUserId: user._id,
                newUserEmail: user.email,
                adminCount: adminUsers.length
            });
            // Send email notification to each admin
            const emailService = new (require('../../services/EmailService').EmailService)();
            for (const admin of adminUsers) {
                try {
                    await emailService.sendApprovalNotification(user.email, user.fullName, admin.email);
                }
                catch (emailError) {
                    logger_1.default.warn('⚠️ [MongoAuthRepository] Failed to send notification email to admin:', {
                        adminEmail: admin.email,
                        error: emailError
                    });
                }
            }
            logger_1.default.info('✅ [MongoAuthRepository] Admin notifications sent successfully');
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Failed to notify admins of new signup:', error);
            throw error;
        }
    }
    extractEmailFromToken(token) {
        try {
            // Basic JWT decode (without verification) to extract email
            const parts = token.split('.');
            if (parts.length !== 3)
                return null;
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            return payload.email || null;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAuthRepository] Failed to extract email from token:', error);
            return null;
        }
    }
    generateRefreshToken(user) {
        return jsonwebtoken_1.default.sign({
            sub: user._id,
            email: user.email,
        }, this.jwtRefreshSecret, { expiresIn: '7d' });
    }
    generateAccessToken(user) {
        return jsonwebtoken_1.default.sign({
            sub: user._id,
            email: user.email,
            role: user.role,
        }, this.jwtSecret, { expiresIn: '15m' });
    }
}
exports.MongoAuthRepository = MongoAuthRepository;
//# sourceMappingURL=MongoAuthRepository.js.map