"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("../utils/logger"));
class EmailService {
    transporter;
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
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
        this.transporter.verify((error, success) => {
            if (error) {
                logger_1.default.error('Email transporter verification failed', { error: error.message });
            }
            else {
                logger_1.default.info('Email transporter verified successfully');
            }
        });
    }
    async sendApprovalNotification(email, fullName, adminEmail) {
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
            logger_1.default.info('📧 Sending admin approval notification email', {
                to: adminEmailAddress,
                from: process.env.FROM_EMAIL,
                forEmployee: email
            });
            const result = await this.transporter.sendMail(mailOptions);
            logger_1.default.info('✅ Admin approval notification email sent successfully', {
                messageId: result.messageId,
                to: adminEmailAddress
            });
        }
        catch (error) {
            logger_1.default.error('❌ Failed to send admin approval notification email', {
                error: error.message,
                stack: error.stack,
                to: adminEmail || process.env.FROM_EMAIL
            });
            throw error;
        }
    }
    async sendWelcomeEmail(email, fullName, approvalToken) {
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
            logger_1.default.info('Welcome email sent', { to: email });
        }
        catch (error) {
            logger_1.default.error('Failed to send welcome email', { error: error.message });
            throw error;
        }
    }
    async sendEmailConfirmation(email, fullName, confirmationUrl) {
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
            logger_1.default.info('Email confirmation sent', { to: email });
        }
        catch (error) {
            logger_1.default.error('Failed to send email confirmation', { error: error.message });
            throw error;
        }
    }
    async sendApprovalConfirmation(email, fullName) {
        try {
            const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth`;
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
            logger_1.default.info('Employee approval confirmation email sent', { to: email });
        }
        catch (error) {
            logger_1.default.error('Failed to send approval confirmation email', { error: error.message });
            throw error;
        }
    }
    async sendTaskNotification(employeeEmail, employeeName, taskTitle, taskDescription, dueDate) {
        try {
            const taskUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/tasks`;
            const mailOptions = {
                from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
                to: employeeEmail,
                subject: `🎯 New Task Assigned: ${taskTitle}`,
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
                  .header { background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 40px 30px; text-align: center; color: white; }
                  .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
                  .content { padding: 40px 30px; }
                  .task-card { background-color: #f8f9fa; border: 2px solid #0066cc; border-radius: 8px; padding: 20px; margin: 20px 0; }
                  .task-card h3 { margin: 0 0 15px 0; color: #0066cc; font-size: 18px; }
                  .task-field { margin: 10px 0; }
                  .task-field strong { color: #333; }
                  .task-field span { color: #555; }
                  .cta-button { display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(0, 102, 204, 0.3); transition: all 0.3s ease; text-transform: uppercase; }
                  .cta-button:hover { background: linear-gradient(135deg, #0052a3 0%, #003d7a 100%); box-shadow: 0 6px 20px rgba(0, 102, 204, 0.4); transform: translateY(-2px); }
                  .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                  .footer p { margin: 0; font-size: 14px; color: #6c757d; }
                  @media only screen and (max-width: 600px) { .email-container { margin: 0; border-radius: 0; } .header { padding: 30px 20px; } .content { padding: 30px 20px; } .cta-button { display: block; width: 100%; box-sizing: border-box; text-align: center; } }
              </style>
          </head>
          <body>
              <div class="email-container">
                  <div class="header">
                      <h1>🎯 New Task Assigned</h1>
                      <p>You have a new task to complete</p>
                  </div>
                  <div class="content">
                      <p style="font-size: 16px; color: #555;">Hello ${employeeName},</p>
                      <p style="font-size: 16px; color: #555;">A new task has been assigned to you by your administrator.</p>
                      
                      <div class="task-card">
                          <h3>📋 Task Details</h3>
                          <div class="task-field">
                              <strong>Task Title:</strong><br>
                              <span>${taskTitle}</span>
                          </div>
                          <div class="task-field">
                              <strong>Description:</strong><br>
                              <span>${taskDescription || 'No description provided'}</span>
                          </div>
                          <div class="task-field">
                              <strong>Due Date:</strong><br>
                              <span>${dueDate}</span>
                          </div>
                      </div>

                      <p style="font-size: 16px; color: #555;">Please review the task details and mark it as complete when you're done.</p>
                      
                      <div style="text-align: center; margin: 30px 0;">
                          <a href="${taskUrl}" class="cta-button">View Task</a>
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
            logger_1.default.info('📧 Sending task assignment notification', {
                to: employeeEmail,
                taskTitle,
                dueDate
            });
            const result = await this.transporter.sendMail(mailOptions);
            logger_1.default.info('✅ Task notification email sent successfully', {
                messageId: result.messageId,
                to: employeeEmail,
                taskTitle
            });
        }
        catch (error) {
            logger_1.default.error('Failed to send task notification email', { error: error.message });
            throw error;
        }
    }
    async sendTaskCompletionNotification(adminEmail, adminName, employeeName, taskTitle) {
        try {
            const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/tasks`;
            const mailOptions = {
                from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
                to: adminEmail,
                subject: `✅ Task Completed: ${taskTitle} - ${employeeName}`,
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
                  .completion-card { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0; }
                  .completion-card p { margin: 0; color: #155724; font-size: 16px; font-weight: 500; }
                  .task-info { background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
                  .task-info strong { color: #333; }
                  .task-info span { color: #555; }
                  .cta-button { display: inline-block; background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); transition: all 0.3s ease; text-transform: uppercase; }
                  .cta-button:hover { background: linear-gradient(135deg, #1e7e34 0%, #155724 100%); box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4); transform: translateY(-2px); }
                  .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                  .footer p { margin: 0; font-size: 14px; color: #6c757d; }
                  @media only screen and (max-width: 600px) { .email-container { margin: 0; border-radius: 0; } .header { padding: 30px 20px; } .content { padding: 30px 20px; } .cta-button { display: block; width: 100%; box-sizing: border-box; text-align: center; } }
              </style>
          </head>
          <body>
              <div class="email-container">
                  <div class="header">
                      <h1>✅ Task Completed</h1>
                      <p>An assigned task has been completed successfully</p>
                  </div>
                  <div class="content">
                      <p style="font-size: 16px; color: #555;">Hello ${adminName},</p>
                      <p style="font-size: 16px; color: #555;">Great news! A task you assigned has been completed.</p>
                      
                      <div class="completion-card">
                          <p>🎉 Task completed by ${employeeName}</p>
                      </div>

                      <div class="task-info">
                          <div style="margin: 10px 0;">
                              <strong>Task:</strong> ${taskTitle}
                          </div>
                          <div style="margin: 10px 0;">
                              <strong>Completed by:</strong> ${employeeName}
                          </div>
                          <div style="margin: 10px 0;">
                              <strong>Completion Date:</strong> ${new Date().toLocaleDateString()}
                          </div>
                      </div>

                      <p style="font-size: 16px; color: #555;">You can review the task details in your dashboard.</p>
                      
                      <div style="text-align: center; margin: 30px 0;">
                          <a href="${dashboardUrl}" class="cta-button">View Task</a>
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
            logger_1.default.info('📧 Sending task completion notification to admin', {
                to: adminEmail,
                taskTitle,
                completedBy: employeeName
            });
            const result = await this.transporter.sendMail(mailOptions);
            logger_1.default.info('✅ Task completion notification email sent successfully', {
                messageId: result.messageId,
                to: adminEmail,
                taskTitle
            });
        }
        catch (error) {
            logger_1.default.error('Failed to send task completion notification email', { error: error.message });
            throw error;
        }
    }
    async sendPasswordResetEmail(email, fullName, resetUrl) {
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
            logger_1.default.info('📧 Sending password reset email', {
                to: email,
                from: process.env.FROM_EMAIL,
                resetUrl: resetUrl.substring(0, 100) + '...' // Log partial URL for security
            });
            const result = await this.transporter.sendMail(mailOptions);
            logger_1.default.info('✅ Password reset email sent successfully', {
                messageId: result.messageId,
                to: email
            });
        }
        catch (error) {
            logger_1.default.error('❌ Failed to send password reset email', {
                error: error.message,
                stack: error.stack,
                to: email,
                from: process.env.FROM_EMAIL
            });
            throw error;
        }
    }
    async sendDepartmentAssignmentNotification(email, fullName, department) {
        try {
            const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
            const mailOptions = {
                from: `"Go3net HR Management System" <${process.env.FROM_EMAIL}>`,
                to: email,
                subject: `🏢 Department Assignment - Go3net HR Management System`,
                html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Department Assignment - Go3net HR Management System</title>
              <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f4; }
                  .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
                  .header { background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%); padding: 40px 30px; text-align: center; color: white; }
                  .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
                  .content { padding: 40px 30px; }
                  .dept-card { background: linear-gradient(135deg, #e7d4f5 0%, #d6c5e8 100%); border: 2px solid #6f42c1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
                  .dept-card h2 { margin: 0; color: #5a32a3; font-size: 24px; }
                  .dept-card p { margin: 10px 0 0 0; color: #5a32a3; font-weight: 500; }
                  .info-box { background-color: #f8f9fa; border-left: 4px solid #6f42c1; padding: 15px; margin: 20px 0; }
                  .info-box p { margin: 0; color: #555; }
                  .cta-button { display: inline-block; background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(111, 66, 193, 0.3); transition: all 0.3s ease; text-transform: uppercase; }
                  .cta-button:hover { background: linear-gradient(135deg, #5a32a3 0%, #463382 100%); box-shadow: 0 6px 20px rgba(111, 66, 193, 0.4); transform: translateY(-2px); }
                  .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
                  .footer p { margin: 0; font-size: 14px; color: #6c757d; }
                  @media only screen and (max-width: 600px) { .email-container { margin: 0; border-radius: 0; } .header { padding: 30px 20px; } .content { padding: 30px 20px; } .cta-button { display: block; width: 100%; box-sizing: border-box; text-align: center; } }
              </style>
          </head>
          <body>
              <div class="email-container">
                  <div class="header">
                      <h1>🏢 Department Assignment</h1>
                      <p>Your department has been assigned</p>
                  </div>
                  <div class="content">
                      <p style="font-size: 16px; color: #555;">Hello ${fullName},</p>
                      <p style="font-size: 16px; color: #555;">Welcome! Your administrator has assigned you to a department.</p>
                      
                      <div class="dept-card">
                          <h2>${department}</h2>
                          <p>Your assigned department</p>
                      </div>

                      <div class="info-box">
                          <p>You can now collaborate with your department team and access department-specific resources. Visit your dashboard to see your department information and connect with your colleagues.</p>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                          <a href="${dashboardUrl}" class="cta-button">View Your Dashboard</a>
                      </div>

                      <p style="font-size: 16px; color: #555;">If you have any questions about your department assignment, please contact your HR department.</p>
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
            logger_1.default.info('📧 Sending department assignment notification', {
                to: email,
                department
            });
            const result = await this.transporter.sendMail(mailOptions);
            logger_1.default.info('✅ Department assignment email sent successfully', {
                messageId: result.messageId,
                to: email,
                department
            });
        }
        catch (error) {
            logger_1.default.error('Failed to send department assignment email', { error: error.message });
            throw error;
        }
    }
    getSupabaseAdmin() {
        const { createClient } = require('@supabase/supabase-js');
        return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=EmailService.js.map