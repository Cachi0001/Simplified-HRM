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
      // Get employee email from database
      const { data: employee } = await this.getSupabaseAdmin()
        .from('employees')
        .select('email, full_name')
        .eq('id', employeeId)
        .single();

      if (!employee) {
        logger.warn('Employee not found for task notification', { employeeId });
        return;
      }

      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: employee.email,
        subject: 'New Task Assigned - Go3net HR Management System',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Task Assigned - Go3net HR Management System</title>
              <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f4; }
                  .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
                  .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 40px 30px; text-align: center; color: white; }
                  .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
                  .content { padding: 40px 30px; }
                  .task-card { background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #007bff; }
                  .task-card h3 { margin: 0 0 15px 0; color: #007bff; font-size: 20px; }
                  .task-details { background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 15px 0; }
                  .task-details p { margin: 8px 0; color: #495057; }
                  .dashboard-button { display: inline-block; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3); transition: all 0.3s ease; }
                  .dashboard-button:hover { background: linear-gradient(135deg, #0056b3 0%, #004085 100%); box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4); transform: translateY(-2px); }
                  .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                  @media only screen and (max-width: 600px) { .email-container { margin: 0; border-radius: 0; } .header { padding: 30px 20px; } .content { padding: 30px 20px; } .dashboard-button { display: block; width: 100%; box-sizing: border-box; } }
              </style>
          </head>
          <body>
              <div class="email-container">
                  <div class="header">
                      <h1>📋 New Task Assigned</h1>
                      <p>You have been assigned a new task</p>
                  </div>
                  <div class="content">
                      <p style="font-size: 16px; color: #555;">Hello ${employee.full_name},</p>
                      <p style="font-size: 16px; color: #555;">A new task has been assigned to you by your administrator.</p>

                      <div class="task-card">
                          <h3>📋 Task Details</h3>
                          <div class="task-details">
                              <p><strong>📝 Task Title:</strong> ${taskTitle}</p>
                              ${taskDescription ? `<p><strong>📄 Description:</strong> ${taskDescription}</p>` : ''}
                              <p><strong>📅 Due Date:</strong> ${dueDate}</p>
                              <p><strong>⏰ Assigned:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                          </div>
                      </div>

                      <p style="font-size: 16px; color: #555;">Please review the task details and take appropriate action. You can mark tasks as complete or update their status through your dashboard.</p>

                      <div style="text-align: center; margin: 40px 0;">
                          <a href="${process.env.FRONTEND_URL}/dashboard" class="dashboard-button">View in Dashboard</a>
                      </div>

                      <p style="font-size: 16px; color: #555;">If you have any questions about this task, please contact your supervisor or administrator.</p>
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
      logger.info('Task notification email sent', { to: employee.email, taskTitle });
    } catch (error) {
      logger.error('Failed to send task notification email', { error: (error as Error).message });
      throw error;
    }
  }

  async sendTaskCompletionNotification(employeeId: string, taskTitle: string, completionMessage: string): Promise<void> {
    try {
      // Get employee email from database
      const { data: employee } = await this.getSupabaseAdmin()
        .from('employees')
        .select('email, full_name')
        .eq('id', employeeId)
        .single();

      if (!employee) {
        logger.warn('Employee not found for task completion notification', { employeeId });
        return;
      }

      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: employee.email,
        subject: 'Task Completed - Go3net HR Management System',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Task Completed - Go3net HR Management System</title>
              <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f4; }
                  .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
                  .header { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); padding: 40px 30px; text-align: center; color: white; }
                  .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
                  .content { padding: 40px 30px; }
                  .completion-card { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center; border: 2px solid #28a745; }
                  .completion-card h3 { margin: 0 0 15px 0; color: #155724; font-size: 22px; }
                  .completion-card p { margin: 0; color: #155724; font-size: 16px; font-weight: 500; }
                  .task-details { background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
                  .task-details p { margin: 8px 0; color: #495057; }
                  .dashboard-button { display: inline-block; background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); transition: all 0.3s ease; }
                  .dashboard-button:hover { background: linear-gradient(135deg, #1e7e34 0%, #155724 100%); box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); transform: translateY(-2px); }
                  .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                  @media only screen and (max-width: 600px) { .email-container { margin: 0; border-radius: 0; } .header { padding: 30px 20px; } .content { padding: 30px 20px; } .dashboard-button { display: block; width: 100%; box-sizing: border-box; } }
              </style>
          </head>
          <body>
              <div class="email-container">
                  <div class="header">
                      <h1>✅ Task Completed!</h1>
                      <p>Great work on completing your task</p>
                  </div>
                  <div class="content">
                      <p style="font-size: 16px; color: #555;">Hello ${employee.full_name},</p>
                      <p style="font-size: 16px; color: #555;">Congratulations! Your task has been marked as completed.</p>

                      <div class="completion-card">
                          <h3>🎉 Task Completed Successfully!</h3>
                          <p>${completionMessage}</p>
                      </div>

                      <div class="task-details">
                          <p><strong>📝 Task Title:</strong> ${taskTitle}</p>
                          <p><strong>✅ Completed:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                      </div>

                      <p style="font-size: 16px; color: #555;">Thank you for your hard work! Your completed tasks help us track progress and maintain productivity.</p>

                      <div style="text-align: center; margin: 40px 0;">
                          <a href="${process.env.FRONTEND_URL}/dashboard" class="dashboard-button">View Dashboard</a>
                      </div>

                      <p style="font-size: 16px; color: #555;">Keep up the excellent work! If you have any questions or need assistance, please contact your supervisor.</p>
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
      logger.info('Task completion notification email sent', { to: employee.email, taskTitle });
    } catch (error) {
      logger.error('Failed to send task completion notification email', { error: (error as Error).message });
      throw error;
    }
  }

  async sendConfirmationEmail(email: string, fullName: string, confirmationUrl: string): Promise<void> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP credentials not configured');
      }

      const mailOptions = {
        from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: 'Confirm Your Go3net Account',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Confirm Your Go3net Account</title>
            <style>
              body {font-family: Arial, Helvetica, sans-serif; background:#f4f4f4; padding:20px;}
              .container {max-width:600px; margin:auto; background:#fff; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,.1);}
              .button {display:inline-block; background:#007bff; color:#fff; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:15px;}
              .fallback {margin-top:20px; font-size:13px; color:#555; word-break:break-all;}
              .footer {margin-top:30px; font-size:12px; color:#777;}
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Welcome to Go3net!</h2>
              <p>Click below to confirm your account and log in instantly:</p>

              <p style="text-align:center;">
                <a href="${confirmationUrl}" class="button">
                  Confirm & Log In
                </a>
              </p>

              <p><strong>No password needed.</strong> This link expires in 1 hour.</p>

              <div class="fallback">
                <p>If the button doesn't work, copy & paste this URL into your browser:</p>
                <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
              </div>

              <div class="footer">
                <p>© Go3net. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      logger.info('📧 Sending confirmation email', {
        to: email,
        from: process.env.FROM_EMAIL,
        confirmationUrl: confirmationUrl.substring(0, 100) + '...' // Log partial URL for security
      });

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('✅ Confirmation email sent successfully', {
        messageId: result.messageId,
        to: email
      });
    } catch (error) {
      logger.error('❌ Failed to send confirmation email', {
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
