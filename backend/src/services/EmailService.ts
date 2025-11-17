import { transporter, emailConfig } from '../config/email';

export class EmailService {
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  private readonly productionUrl = process.env.FRONTEND_URL_PROD || process.env.PRODUCTION_FRONTEND_URL || 'https://go3net.vercel.app';

  private getBaseUrl(): string {
    return process.env.NODE_ENV === 'production' ? this.productionUrl : this.frontendUrl;
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const maxRetries = 3;
    const retryDelays = [1000, 5000, 15000];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await transporter.sendMail({
          from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
          to,
          subject,
          html
        });
        console.log(`Email sent successfully to ${to}`);
        return;
      } catch (error) {
        console.error(`Email send attempt ${attempt + 1} failed:`, error);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        } else {
          throw error;
        }
      }
    }
  }

  private getEmailTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #E0E1DD; 
            background: #cbdbecff;
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #97acd2ff;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            overflow: hidden;
          }
          .header { 
            background: #00BFFF; 
            color: #ffffff; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
          }
          .content { 
            background: #ffffff; 
            padding: 40px 30px;
          }
          .content h2 {
            color: #1c1919ff;
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .content p {
            color: #333333;
            margin-bottom: 15px;
          }
          .content strong {
            color: #1c1919ff;
            font-weight: 600;
          }
          a[class="button"] { 
            display: inline-block; 
            padding: 14px 32px; 
            background-color: #00BFFF !important; 
            color: #ffffff !important; 
            text-decoration: none !important; 
            border-radius: 8px; 
            margin: 25px 0;
            font-weight: 600;
            mso-hide: none;
          }
          a[class="button"]:hover {
            background-color: #0099CC !important;
          }
          a[class="button"]:visited {
            color: #ffffff !important;
          }
          a[class="button"]:active {
            color: #ffffff !important;
          }
          .info-box {
            background: #415A77;
            border-left: 4px solid #00BFFF;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 0;
            color: #E0E1DD;
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #E0E1DD; 
            font-size: 13px;
            background: #0D1B2A;
            border-top: 1px solid #415A77;
          }
          .footer p {
            margin: 5px 0;
            color: #E0E1DD;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏢 Go3net HR System</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p><strong>Go3net HR Management System</strong></p>
            <p>&copy; ${new Date().getFullYear()} Go3net. All rights reserved.</p>
            <p style="margin-top: 10px;">This is an automated message, please do not reply to this email.</p>
            <p>Need help? Contact your HR department or system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWelcomeAndVerificationEmail(email: string, fullName: string, token: string): Promise<void> {
    const verificationUrl = `${this.getBaseUrl()}/verify-email?token=${token}`;
    
    const content = `
      <h2>Welcome to Go3net HR System!</h2>
      <p>Hello ${fullName},</p>
      <p>Thank you for registering with Go3net HR Management System.</p>
      <p>Your account has been created and is pending approval from our HR team.</p>
      
      <h3 style="margin-top: 24px;">Verify Your Email Address</h3>
      <p>To complete your registration, please verify your email address by clicking the button below:</p>
      <a href="${verificationUrl}" class="button" style="background-color: #00BFFF !important; color: #ffffff !important; text-decoration: none !important; display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 16px 0;">Verify Email</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px;">${verificationUrl}</p>
      <p style="margin-top: 16px;"><strong>Important:</strong> This verification link will expire in 24 hours.</p>
      
      <h3 style="margin-top: 24px;">What's Next?</h3>
      <p>Once your email is verified and your account is approved by our HR team, you will receive another email notification. After approval, you can log in and access all features of the HR system.</p>
      
      <p style="margin-top: 24px;">If you have any questions, please contact our support team.</p>
      <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
    `;
    
    await this.sendEmail(email, 'Welcome to Go3net HR - Verify Your Email', this.getEmailTemplate(content));
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const content = `
      <h2>Welcome to Go3net HR System!</h2>
      <p>Hello ${fullName},</p>
      <p>Thank you for registering with Go3net HR Management System.</p>
      <p>Your account has been created and is pending approval from our HR team.</p>
      <p>You will receive an email notification once your account is approved.</p>
      <p>If you have any questions, please contact our support team.</p>
    `;
    
    await this.sendEmail(email, 'Welcome to Go3net HR System', this.getEmailTemplate(content));
  }

  async sendVerificationEmail(email: string, fullName: string, token: string): Promise<void> {
    const verificationUrl = `${this.getBaseUrl()}/verify-email?token=${token}`;
    
    const content = `
      <h2>Verify Your Email Address</h2>
      <p>Hello ${fullName},</p>
      <p>Please verify your email address by clicking the button below:</p>
      <a href="${verificationUrl}" class="button" style="background-color: #00BFFF !important; color: #ffffff !important; text-decoration: none !important; display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Verify Email</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    `;
    
    await this.sendEmail(email, 'Verify Your Email - Go3net HR', this.getEmailTemplate(content));
  }

  async sendPasswordResetEmail(email: string, fullName: string, token: string): Promise<void> {
    const resetUrl = `${this.getBaseUrl()}/reset-password?token=${token}`;
    
    const content = `
      <h2>Password Reset Request</h2>
      <p>Hello ${fullName},</p>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      <a href="${resetUrl}" class="button" style="background-color: #00BFFF !important; color: #ffffff !important; text-decoration: none !important; display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Reset Password</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">${resetUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
    `;
    
    await this.sendEmail(email, 'Password Reset - Go3net HR', this.getEmailTemplate(content));
  }

  async sendApprovalEmail(email: string, fullName: string): Promise<void> {
    const loginUrl = `${this.getBaseUrl()}/auth`;
    
    const content = `
      <h2>Account Approved!</h2>
      <p>Hello ${fullName},</p>
      <p>Great news! Your account has been approved by our HR team.</p>
      <p>You can now log in and access the Go3net HR Management System.</p>
      <a href="${loginUrl}" class="button" style="background-color: #00BFFF !important; color: #ffffff !important; text-decoration: none !important; display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Login Now</a>
      <p>Welcome to the team!</p>
    `;
    
    await this.sendEmail(email, 'Account Approved - Go3net HR', this.getEmailTemplate(content));
  }

  async sendRejectionEmail(email: string, fullName: string, reason: string): Promise<void> {
    const content = `
      <h2>Account Registration Update</h2>
      <p>Hello ${fullName},</p>
      <p>We regret to inform you that your account registration has not been approved.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>If you believe this is an error or have questions, please contact our HR team.</p>
    `;
    
    await this.sendEmail(email, 'Account Registration Update - Go3net HR', this.getEmailTemplate(content));
  }

  async sendNewEmployeeNotification(adminEmail: string, employeeName: string, employeeEmail: string): Promise<void> {
    const approvalUrl = `${this.getBaseUrl()}/employee-management`;
    
    const content = `
      <h2>👤 New Employee Registration</h2>
      <p>A new employee has registered and is pending approval:</p>
      <p><strong>Name:</strong> ${employeeName}</p>
      <p><strong>Email:</strong> ${employeeEmail}</p>
      <a href="${approvalUrl}" class="button" style="background-color: #00BFFF !important; color: #ffffff !important; text-decoration: none !important; display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Review Application</a>
    `;
    
    await this.sendEmail(adminEmail, '👤 New Employee Registration - Go3net HR', this.getEmailTemplate(content));
  }

  async sendCheckoutReminderEmail(email: string, fullName: string): Promise<void> {
    const attendanceUrl = `${this.getBaseUrl()}/attendance`;
    
    const content = `
      <h2>Checkout Reminder</h2>
      <p>Hello ${fullName},</p>
      <p>This is a friendly reminder that you haven't clocked out yet today.</p>
      <p>Please remember to clock out before leaving the office.</p>
      <a href="${attendanceUrl}" class="button" style="background-color: #00BFFF !important; color: #ffffff !important; text-decoration: none !important; display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Clock Out Now</a>
    `;
    
    await this.sendEmail(email, 'Checkout Reminder - Go3net HR', this.getEmailTemplate(content));
  }

  async sendProfileUpdateNotification(employeeId: string, employeeName: string): Promise<void> {
    const pool = require('../config/database').default;
    await pool.query(
      `SELECT * FROM notify_supervisors_profile_update($1, $2)`,
      [employeeId, employeeName]
    );
  }

  async sendTaskAssignedEmail(email: string, fullName: string, taskTitle: string, dueDate?: string): Promise<void> {
    const tasksUrl = `${this.getBaseUrl()}/tasks`;
    
    const content = `
      <h2>New Task Assigned</h2>
      <p>Hello ${fullName},</p>
      <p>You have been assigned a new task:</p>
      <p><strong>Task:</strong> ${taskTitle}</p>
      ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
      <a href="${tasksUrl}" class="button" style="background-color: #00BFFF !important; color: #ffffff !important; text-decoration: none !important; display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600;">View Task</a>
    `;
    
    await this.sendEmail(email, 'New Task Assigned - Go3net HR', this.getEmailTemplate(content));
  }

  async sendLeaveApprovedEmail(email: string, fullName: string, leaveType: string, startDate: string, endDate: string): Promise<void> {
    const content = `
      <h2>Leave Request Approved</h2>
      <p>Hello ${fullName},</p>
      <p>Your leave request has been approved:</p>
      <p><strong>Type:</strong> ${leaveType}</p>
      <p><strong>From:</strong> ${new Date(startDate).toLocaleDateString()}</p>
      <p><strong>To:</strong> ${new Date(endDate).toLocaleDateString()}</p>
      <p>Enjoy your time off!</p>
    `;
    
    await this.sendEmail(email, 'Leave Request Approved - Go3net HR', this.getEmailTemplate(content));
  }

  async sendLeaveRejectedEmail(email: string, fullName: string, leaveType: string, reason: string): Promise<void> {
    const content = `
      <h2>Leave Request Update</h2>
      <p>Hello ${fullName},</p>
      <p>Your ${leaveType} leave request has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>If you have questions, please contact your supervisor.</p>
    `;
    
    await this.sendEmail(email, 'Leave Request Update - Go3net HR', this.getEmailTemplate(content));
  }

  async sendPurchaseApprovedEmail(email: string, fullName: string, itemName: string): Promise<void> {
    const content = `
      <h2>Purchase Request Approved</h2>
      <p>Hello ${fullName},</p>
      <p>Your purchase request has been approved:</p>
      <p><strong>Item:</strong> ${itemName}</p>
      <p>The procurement process will begin shortly.</p>
    `;
    
    await this.sendEmail(email, 'Purchase Request Approved - Go3net HR', this.getEmailTemplate(content));
  }

  async sendPurchaseRejectedEmail(email: string, fullName: string, itemName: string, reason: string): Promise<void> {
    const content = `
      <h2>Purchase Request Update</h2>
      <p>Hello ${fullName},</p>
      <p>Your purchase request for ${itemName} has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>If you have questions, please contact your supervisor.</p>
    `;
    
    await this.sendEmail(email, 'Purchase Request Update - Go3net HR', this.getEmailTemplate(content));
  }

  async sendAnnouncementEmail(email: string, fullName: string, title: string, content: string): Promise<void> {
    const announcementsUrl = `${this.getBaseUrl()}/announcements`;
    
    const emailContent = `
      <h2>New Announcement</h2>
      <p>Hello ${fullName},</p>
      <h3>${title}</h3>
      <p>${content}</p>
      <a href="${announcementsUrl}" class="button" style="background-color: #00BFFF !important; color: #ffffff !important; text-decoration: none !important; display: inline-block; padding: 14px 32px; border-radius: 8px; font-weight: 600;">View All Announcements</a>
    `;
    
    await this.sendEmail(email, `New Announcement: ${title} - Go3net HR`, this.getEmailTemplate(emailContent));
  }

  // Birthday email to celebrant
  async sendBirthdayEmail(email: string, fullName: string, age: number): Promise<void> {
    const emailContent = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 80px; margin-bottom: 20px;">🎉🎂🎈</div>
        <h1 style="color: #1e3a8a; font-size: 36px; margin-bottom: 20px;">
          Happy Birthday ${fullName}!
        </h1>
        <p style="font-size: 24px; color: #3b82f6; margin-bottom: 30px;">
          🎊 Celebrating ${age} amazing years! 🎊
        </p>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    padding: 30px; 
                    border-radius: 15px; 
                    margin: 30px 0;
                    color: white;">
          <p style="font-size: 18px; line-height: 1.8; margin: 0;">
            Wishing you a wonderful day filled with joy, laughter, and celebration! 🎉<br><br>
            May this year bring you success, happiness, and all the things you've been dreaming of. 🌟<br><br>
            Thank you for being an amazing part of our team! 💙
          </p>
        </div>
        <p style="font-size: 16px; color: #64748b; margin-top: 30px;">
          From all of us at Go3net HR Team 🎈
        </p>
      </div>
    `;

    await this.sendEmail(email, `🎉 Happy Birthday ${fullName}! 🎂`, this.getEmailTemplate(emailContent));
  }

  // Birthday announcement to other employees
  async sendBirthdayAnnouncementEmail(email: string, recipientName: string, celebrantName: string, birthDate?: string, age?: number): Promise<void> {
    const birthDateFormatted = birthDate ? new Date(birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
    const ageText = age ? ` turning ${age} years old` : '';
    
    const emailContent = `
      <div style="padding: 30px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 60px; margin-bottom: 15px;">🎂🎉</div>
          <h2 style="color: #1e3a8a; font-size: 28px; margin-bottom: 10px;">
            Birthday Celebration!
          </h2>
        </div>
        
        <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
          Hi ${recipientName},
        </p>
        
        <div style="background: #f0f9ff; 
                    border-left: 4px solid #3b82f6; 
                    padding: 20px; 
                    border-radius: 8px;
                    margin: 20px 0;">
          <p style="font-size: 18px; color: #1e40af; margin: 0; font-weight: 500;">
            🎈 It's <strong>${celebrantName}'s</strong> birthday today! 🎈
          </p>
          ${birthDateFormatted ? `<p style="font-size: 14px; color: #3b82f6; margin: 10px 0 0 0;">Born on ${birthDateFormatted}${ageText}</p>` : ''}
        </div>
        
        <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">
          Let's make their day special! Take a moment to wish them a happy birthday and celebrate this special occasion together. 🎊
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.getBaseUrl()}/employee-management" 
             style="display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px 40px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;">
            Send Birthday Wishes 🎉
          </a>
        </div>
        
        <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 30px;">
          Celebrating together makes us stronger! 💙
        </p>
      </div>
    `;

    await this.sendEmail(email, `🎂 ${celebrantName}'s Birthday Today!`, this.getEmailTemplate(emailContent));
  }
}
