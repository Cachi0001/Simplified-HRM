import nodemailer from 'nodemailer';
import logger from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // Gmail SMTP uses TLS (not SSL) on port 587
      requireTLS: true, // Require TLS encryption
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('Email transporter verification failed', { error: error.message });
      } else {
        logger.info('Email transporter verified successfully');
      }
    });
  }

  async sendApprovalNotification(email: string, fullName: string, adminEmail?: string): Promise<void> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP credentials not configured');
      }

      const adminEmailAddress = adminEmail || process.env.FROM_EMAIL || 'admin@go3net.com.ng';

      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: adminEmailAddress,
        subject: 'New Employee Registration - Review Required',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Employee Registration - Go3net HR Management System</title>
              <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f4; }
                  .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
                  .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); padding: 40px 30px; text-align: center; color: white; }
                  .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
                  .content { padding: 40px 30px; }
                  .employee-card { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
                  .employee-card h3 { margin: 0 0 15px 0; color: #17a2b8; font-size: 18px; }
                  .review-button { display: inline-block; background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3); transition: all 0.3s ease; }
                  .review-button:hover { background: linear-gradient(135deg, #138496 0%, #117a8b 100%); box-shadow: 0 6px 20px rgba(23, 162, 184, 0.4); transform: translateY(-2px); }
                  .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                  @media only screen and (max-width: 600px) { .email-container { margin: 0; border-radius: 0; } .header { padding: 30px 20px; } .content { padding: 30px 20px; } .review-button { display: block; width: 100%; box-sizing: border-box; } }
              </style>
          </head>
          <body>
              <div class="email-container">
                  <div class="header">
                      <h1>📋 New Registration</h1>
                      <p>Employee Account Review Required</p>
                  </div>
                  <div class="content">
                      <p style="font-size: 16px; color: #555;">Hello Administrator,</p>
                      <p style="font-size: 16px; color: #555;">A new employee account has been registered and requires your review before activation.</p>
                      <div class="employee-card">
                          <h3>📋 Registration Details</h3>
                          <p><strong>👤 Employee Name:</strong> ${fullName}</p>
                          <p><strong>📧 Email Address:</strong> ${email}</p>
                          <p><strong>📅 Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
                          <p><strong>⏰ Registration Time:</strong> ${new Date().toLocaleTimeString()}</p>
                      </div>
                      <p style="font-size: 16px; color: #555;">Please review this registration and approve or decline as appropriate.</p>
                      <div style="text-align: center; margin: 30px 0;">
                          <a href="${process.env.FRONTEND_URL}/dashboard#pending-approvals" class="review-button">Review Registration</a>
                      </div>
                  </div>
                  <div class="footer">
                      <p>This is an automated message from Go3net HR Management System.</p>
                      <p style="margin-top: 15px;">© Go3net HR Management System. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
        `
      };

      logger.info('📧 Sending admin approval notification email', {
        to: adminEmailAddress,
        from: process.env.FROM_EMAIL,
        forEmployee: email
      });

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('✅ Admin approval notification email sent successfully', {
        messageId: result.messageId,
        to: adminEmailAddress
      });
    } catch (error) {
      logger.error('❌ Failed to send admin approval notification email', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        to: adminEmail || process.env.FROM_EMAIL
      });
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, fullName: string, approvalToken: string): Promise<void> {
    try {
      const approvalUrl = `${process.env.FRONTEND_URL}/auth/verify-approval?token=${approvalToken}`;

      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: 'Welcome to HR Management System - Registration Received',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center;">Welcome to HR Management System!</h2>
              <p style="font-size: 16px; color: #555;">Hello ${fullName},</p>
              <p style="font-size: 16px; color: #555;">
                Thank you for registering with our HR Management System. Your registration has been received and is currently under review.
              </p>
              <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #495057;">
                  <strong>What happens next?</strong><br>
                  Our administrators will review your application. Once approved, you'll receive another email with login instructions.
                </p>
              </div>
              <p style="font-size: 16px; color: #555;">
                If you have any questions, please contact your HR department.
              </p>
              <p style="font-size: 14px; color: #777; margin-top: 30px;">
                This is an automated message from the HR Management System.
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Welcome email sent', { to: email });
    } catch (error) {
      logger.error('Failed to send welcome email', { error: (error as Error).message });
      throw error;
    }
  }

    async sendEmailConfirmation(email: string, fullName: string, confirmationUrl: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: 'Confirm Your Email - HR Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <h2 style="color: #007bff; text-align: center;">Confirm Your Email</h2>
              <p style="font-size: 16px; color: #555;">Hello ${fullName},</p>
              <p style="font-size: 16px; color: #555;">
                Please, please click the button below to confirm your email and activate your account.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}"
                   style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Confirm Email
                </a>
              </div>
              <p style="font-size: 14px; color: #777;">
                If you didn't register, please ignore this email.
              </p>
              <p style="font-size: 14px; color: #777; margin-top: 30px;">
                This is an automated message from the HR Management System.
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Email confirmation sent', { to: email });
    } catch (error) {
      logger.error('Failed to send email confirmation', { error: (error as Error).message });
      throw error;
    }
  }
  
  async sendApprovalConfirmation(email: string, fullName: string): Promise<void> {
    try {
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000/auth';

      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: 'Account Approved - Go3net HR Management System',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Account Approved - Go3net HR Management System</title>
              <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f4; }
                  .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
                  .header { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); padding: 40px 30px; text-align: center; color: white; }
                  .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
                  .content { padding: 40px 30px; }
                  .greeting { font-size: 18px; margin-bottom: 20px; color: #333333; }
                  .message { font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #555555; }
                  .success-box { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center; }
                  .success-box h3 { margin: 0 0 15px 0; color: #155724; font-size: 20px; }
                  .success-box p { margin: 0; color: #155724; font-size: 16px; font-weight: 500; }
                  .login-button { display: inline-block; background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); transition: all 0.3s ease; text-transform: uppercase; }
                  .login-button:hover { background: linear-gradient(135deg, #1e7e34 0%, #155724 100%); box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); transform: translateY(-2px); }
                  .welcome-message { background-color: #e8f5e8; border-left: 4px solid #28a745; padding: 20px; margin: 30px 0; }
                  .welcome-message p { margin: 0; color: #2d5a2d; font-size: 15px; }
                  .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                  .footer p { margin: 0; font-size: 14px; color: #6c757d; }
                  @media only screen and (max-width: 600px) { .email-container { margin: 0; border-radius: 0; } .header { padding: 30px 20px; } .content { padding: 30px 20px; } .login-button { display: block; width: 100%; box-sizing: border-box; text-align: center; } }
              </style>
          </head>
          <body>
              <div class="email-container">
                  <div class="header">
                      <h1>🎉 Welcome to Go3net!</h1>
                      <p>Account Approved Successfully</p>
                  </div>
                  <div class="content">
                      <p class="greeting">Hello ${fullName},</p>
                      <p class="message">Your account registration has been approved by our administrators. You now have full access to the Go3net HR Management System.</p>
                      <div class="success-box">
                          <h3>✅ Account Activated Successfully!</h3>
                          <p>Your employee account is now ready to use. Welcome to the team!</p>
                      </div>
                      <div class="welcome-message">
                          <p><strong>Getting Started:</strong> Log in to the system using your registered email address and password. You'll have access to your personalized dashboard, task management, and attendance tracking.</p>
                      </div>
                      <div style="text-align: center; margin: 40px 0;">
                          <a href="${loginUrl}" class="login-button">Access Your Account</a>
                      </div>
                      <p class="message">If you need assistance getting started, please contact your HR department.</p>
                  </div>
                  <div class="footer">
                      <p>This is an automated message from Go3net HR Management System.</p>
                      <p style="margin-top: 15px;">© Go3net HR Management System. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Employee approval confirmation email sent', { to: email });
    } catch (error) {
      logger.error('Failed to send approval confirmation email', { error: (error as Error).message });
      throw error;
    }
  }
  async sendTaskNotification(employeeId: string, taskTitle: string, taskDescription: string, dueDate: string): Promise<void> {
    try {
      // For MongoDB, we'll need to get employee email from the database
      // This would need to be implemented based on your MongoDB employee model
      logger.info('📧 Task notification requested', {
        employeeId,
        taskTitle,
        taskDescription,
        dueDate
      });

      // TODO: Implement MongoDB employee lookup
      // const employee = await Employee.findById(employeeId);
      // if (!employee) {
      //   logger.warn('Employee not found for task notification', { employeeId });
      //   return;
      // }

      logger.info('📧 Task notification email would be sent', {
        employeeId,
        taskTitle,
        dueDate
      });

    } catch (error) {
      logger.error('Failed to send task notification email', { error: (error as Error).message });
      throw error;
    }
  }

  async sendTaskCompletionNotification(employeeId: string, taskTitle: string, completionMessage: string): Promise<void> {
    try {
      // For MongoDB, we'll need to get employee email from the database
      // This would need to be implemented based on your MongoDB employee model
      logger.info('📧 Task completion notification requested', {
        employeeId,
        taskTitle,
        completionMessage
      });

      // TODO: Implement MongoDB employee lookup
      // const employee = await Employee.findById(employeeId);
      // if (!employee) {
      //   logger.warn('Employee not found for task completion notification', { employeeId });
      //   return;
      // }

      logger.info('📧 Task completion notification email would be sent', {
        employeeId,
        taskTitle
      });

    } catch (error) {
      logger.error('Failed to send task completion notification email', { error: (error as Error).message });
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, fullName: string, resetUrl: string): Promise<void> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP credentials not configured');
      }

      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: 'Reset Your Password - Go3net HR Management System',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password - Go3net HR Management System</title>
              <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f4; }
                  .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
                  .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px 30px; text-align: center; color: white; }
                  .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
                  .content { padding: 40px 30px; }
                  .greeting { font-size: 18px; margin-bottom: 20px; color: #333333; }
                  .message { font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #555555; }
                  .warning-box { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
                  .warning-box p { margin: 0; color: #856404; font-size: 14px; font-weight: 500; }
                  .reset-button { display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); transition: all 0.3s ease; text-transform: uppercase; }
                  .reset-button:hover { background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%); box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4); transform: translateY(-2px); }
                  .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                  .footer p { margin: 0; font-size: 14px; color: #6c757d; }
                  .fallback { margin-top: 20px; font-size: 13px; color: #555; word-break: break-all; }
                  @media only screen and (max-width: 600px) { .email-container { margin: 0; border-radius: 0; } .header { padding: 30px 20px; } .content { padding: 30px 20px; } .reset-button { display: block; width: 100%; box-sizing: border-box; text-align: center; } }
              </style>
          </head>
          <body>
              <div class="email-container">
                  <div class="header">
                      <h1>🔒 Password Reset</h1>
                      <p>Reset Your Account Password</p>
                  </div>
                  <div class="content">
                      <p class="greeting">Hello ${fullName},</p>
                      <p class="message">We received a request to reset your password for your Go3net HR Management System account. If you made this request, click the button below to create a new password.</p>
                      <div class="warning-box">
                          <p><strong>⚠️ Security Notice:</strong> This password reset link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email.</p>
                      </div>
                      <div style="text-align: center; margin: 40px 0;">
                          <a href="${resetUrl}" class="reset-button">Reset Password</a>
                      </div>
                      <div class="fallback">
                          <p><strong>If the button doesn't work, copy & paste this URL into your browser:</strong></p>
                          <p><a href="${resetUrl}">${resetUrl}</a></p>
                      </div>
                      <p class="message">After resetting your password, you'll be able to sign in to your account normally. If you need assistance, please contact your HR department.</p>
                  </div>
                  <div class="footer">
                      <p>This is an automated message from Go3net HR Management System.</p>
                      <p style="margin-top: 15px;">© Go3net HR Management System. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
        `
      };

      logger.info('📧 Sending password reset email', {
        to: email,
        from: process.env.FROM_EMAIL,
        resetUrl: resetUrl.substring(0, 100) + '...' // Log partial URL for security
      });

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('✅ Password reset email sent successfully', {
        messageId: result.messageId,
        to: email
      });
    } catch (error) {
      logger.error('❌ Failed to send password reset email', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        to: email,
        from: process.env.FROM_EMAIL
      });
      throw error;
    }
  }

  private getSupabaseAdmin() {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
}
