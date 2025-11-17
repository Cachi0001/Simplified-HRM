import { UserRepository } from '../repositories/UserRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { EmailService } from './EmailService';
import { generateToken } from '../config/jwt';
import { RegisterData, LoginData, AuthResponse, PasswordResetRequest, PasswordResetConfirm } from '../types/auth.types';
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';

export class AuthService {
  private userRepo: UserRepository;
  private employeeRepo: EmployeeRepository;
  private emailService: EmailService;

  constructor() {
    this.userRepo = new UserRepository();
    this.employeeRepo = new EmployeeRepository();
    this.emailService = new EmailService();
  }

  async register(data: RegisterData): Promise<{ message: string }> {
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const user = await this.userRepo.create({
      email: data.email,
      password: data.password,
      role: 'employee'
    });

    const employee = await this.employeeRepo.create({
      userId: user.id,
      email: data.email,
      fullName: data.fullName,
      phone: data.phoneNumber,
      dateOfBirth: data.dateOfBirth,
      address: data.address,
      departmentId: data.departmentId
    });

    // Optimized: Send emails asynchronously without blocking the response
    // This makes signup much faster for the user
    if (user.verification_token) {
      this.emailService.sendWelcomeAndVerificationEmail(data.email, data.fullName, user.verification_token)
        .catch(err => console.error('Failed to send verification email:', err));
    }

    // Notification is handled by database trigger (notify_admins_on_employee_signup)
    // No need to send duplicate notification here

    return { message: 'Registration successful. Please check your email for verification link.' };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    // Optimized: Single query to get both user and employee data using JOIN
    const user = await this.userRepo.validatePasswordWithEmployee(data.email, data.password);
    
    if (!user || !user.employee) {
      throw new AuthenticationError('Invalid email or password');
    }

    const employee = user.employee;

    // Check employee status BEFORE email verification
    if (employee.status === 'pending') {
      throw new AuthenticationError('Your account is pending admin approval. You will receive an email once approved.');
    }

    if (employee.status === 'rejected') {
      throw new AuthenticationError('Your account has been rejected. Please contact support for more information.');
    }

    if (employee.status === 'inactive') {
      throw new AuthenticationError('Your account is inactive. Please contact support.');
    }

    // Only check email verification if account is active
    if (!user.email_verified) {
      throw new AuthenticationError('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: employee.full_name,
        employeeId: employee.id  // Add employee ID for task filtering
      }
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userRepo.verifyEmail(token);
    
    if (!user) {
      const userByToken = await this.userRepo.findByVerificationToken(token);
      
      if (userByToken) {
        const employee = await this.employeeRepo.findByUserId(userByToken.id);
        if (employee) {
          const newToken = await this.userRepo.regenerateVerificationToken(userByToken.id);
          await this.emailService.sendVerificationEmail(userByToken.email, employee.full_name, newToken);
          throw new ValidationError('Verification token expired. A new verification email has been sent to your inbox.');
        }
      }
      
      throw new ValidationError('Invalid or expired verification token');
    }

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendConfirmationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(email);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.email_verified) {
      throw new ValidationError('Email is already verified');
    }

    const employee = await this.employeeRepo.findByUserId(user.id);
    
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    // Generate a new verification token
    const newToken = await this.userRepo.regenerateVerificationToken(user.id);
    
    // Send the verification email
    await this.emailService.sendVerificationEmail(email, employee.full_name, newToken);

    return { message: 'Verification email sent successfully. Please check your inbox.' };
  }

  async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(data.email);
    
    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const employee = await this.employeeRepo.findByUserId(user.id);
    
    if (!employee) {
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const resetToken = await this.userRepo.createResetToken(data.email);
    
    await this.emailService.sendPasswordResetEmail(data.email, employee.full_name, resetToken);

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(data: PasswordResetConfirm): Promise<{ message: string }> {
    if (data.newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const user = await this.userRepo.resetPassword(data.token, data.newPassword);
    
    if (!user) {
      throw new ValidationError('Invalid or expired reset token');
    }

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  async getUserById(userId: string): Promise<any> {
    const user = await this.userRepo.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const employee = await this.employeeRepo.findByUserId(userId);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
      fullName: employee?.full_name,
      employee_id: employee?.id,
      status: employee?.status
    };
  }


}
