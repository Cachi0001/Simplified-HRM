import nodemailer from 'nodemailer';
import logger from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  async sendApprovalNotification(email: string, fullName: string, adminEmail?: string): Promise<void> {
    try {
      const adminEmailAddress = adminEmail || process.env.FROM_EMAIL || 'kayode@go3net.com.ng';

      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: adminEmailAddress,
        subject: 'New Employee Registration - Approval Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center;">New Employee Registration</h2>
              <p style="font-size: 16px; color: #555;">Hello Admin,</p>
              <p style="font-size: 16px; color: #555;">
                A new employee has registered and requires your approval:
              </p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p style="font-size: 16px; color: #555;">
                Please log in to the HR Management System to approve or reject this registration.
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:3000/admin/approvals"
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Review Applications
                </a>
              </div>
              <p style="font-size: 14px; color: #777; margin-top: 30px;">
                This is an automated message from the HR Management System.
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Approval notification email sent', { to: adminEmailAddress, forEmployee: email });
    } catch (error) {
      logger.error('Failed to send approval notification email', { error: (error as Error).message });
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, fullName: string, approvalToken: string): Promise<void> {
    try {
      const approvalUrl = `http://localhost:3000/auth/verify-approval?token=${approvalToken}`;

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
      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: 'Account Approved - Welcome to Go3net HR Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <h2 style="color: #28a745; text-align: center;">Account Approved! 🎉</h2>
              <p style="font-size: 16px; color: #555;">Hello ${fullName},</p>
              <p style="font-size: 16px; color: #555;">
                Great news! Your account has been approved by our administrators.
              </p>
              <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #155724;">
                  <strong>Your account is now active!</strong><br>
                  You can now log in to the HR Management System using your registered email and password.
                </p>
              </div>
              <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:3000/login"
                   style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Login to Your Account
                </a>
              </div>
              <p style="font-size: 16px; color: #555; margin-top: 30px;">
                Welcome to the team! We're excited to have you on board.
              </p>
              <p style="font-size: 14px; color: #777;">
                This is an automated message from the HR Management System.
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Approval confirmation email sent', { to: email });
    } catch (error) {
      logger.error('Failed to send approval confirmation email', { error: (error as Error).message });
      throw error;
    }
  }
}
