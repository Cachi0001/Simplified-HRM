import logger from '../utils/logger';

export interface ProfileUpdateEmailData {
  employeeName: string;
  updatedFields: string[];
  adminName?: string;
  employeeId: string;
}

export class ProfileUpdateEmailTemplateService {
  /**
   * Generate HTML email template for profile update notifications
   */
  static generateProfileUpdateEmailTemplate(data: ProfileUpdateEmailData): string {
    const { employeeName, updatedFields, adminName = 'Administrator', employeeId } = data;
    const fieldsText = updatedFields.join(', ');
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/employee-management?highlight=${employeeId}`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Staff Profile Update - Go3net HR Management System</title>
          <style>
              body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  line-height: 1.6; 
                  color: #333333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f4f4f4; 
              }
              .email-container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background-color: #ffffff; 
                  border-radius: 10px; 
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
                  overflow: hidden; 
              }
              .header { 
                  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); 
                  padding: 40px 30px; 
                  text-align: center; 
                  color: white; 
              }
              .header h1 { 
                  margin: 0; 
                  font-size: 28px; 
                  font-weight: 600; 
                  letter-spacing: 0.5px; 
              }
              .content { 
                  padding: 40px 30px; 
              }
              .employee-card { 
                  background-color: #f8f9fa; 
                  border: 1px solid #dee2e6; 
                  border-radius: 8px; 
                  padding: 20px; 
                  margin: 20px 0; 
              }
              .employee-card h3 { 
                  margin: 0 0 15px 0; 
                  color: #17a2b8; 
                  font-size: 18px; 
              }
              .field-list {
                  background-color: #e9ecef;
                  border-left: 4px solid #17a2b8;
                  padding: 15px;
                  margin: 15px 0;
              }
              .field-list strong {
                  color: #495057;
              }
              .review-button { 
                  display: inline-block; 
                  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); 
                  color: #ffffff; 
                  text-decoration: none; 
                  padding: 14px 28px; 
                  border-radius: 8px; 
                  font-weight: 600; 
                  letter-spacing: 0.5px; 
                  box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3); 
                  transition: all 0.3s ease; 
                  text-transform: uppercase;
              }
              .review-button:hover { 
                  background: linear-gradient(135deg, #138496 0%, #117a8b 100%); 
                  box-shadow: 0 6px 20px rgba(23, 162, 184, 0.4); 
                  transform: translateY(-2px); 
              }
              .footer { 
                  background-color: #f8f9fa; 
                  padding: 30px; 
                  text-align: center; 
                  border-top: 1px solid #e9ecef; 
              }
              .footer p {
                  margin: 0;
                  font-size: 14px;
                  color: #6c757d;
              }
              .timestamp {
                  font-size: 14px;
                  color: #6c757d;
                  margin-top: 10px;
              }
              @media only screen and (max-width: 600px) { 
                  .email-container { 
                      margin: 0; 
                      border-radius: 0; 
                  } 
                  .header { 
                      padding: 30px 20px; 
                  } 
                  .content { 
                      padding: 30px 20px; 
                  } 
                  .review-button { 
                      display: block; 
                      width: 100%; 
                      box-sizing: border-box; 
                      text-align: center;
                  } 
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <h1>👤 Profile Updated</h1>
                  <p>Staff Profile Change Notification</p>
              </div>
              <div class="content">
                  <p style="font-size: 16px; color: #555;">Hello ${adminName},</p>
                  <p style="font-size: 16px; color: #555;">
                      A staff member has updated their profile information and requires your review.
                  </p>
                  
                  <div class="employee-card">
                      <h3>📋 Profile Update Details</h3>
                      <p><strong>👤 Employee Name:</strong> ${employeeName}</p>
                      <p><strong>📅 Update Date:</strong> ${new Date().toLocaleDateString()}</p>
                      <p><strong>⏰ Update Time:</strong> ${new Date().toLocaleTimeString()}</p>
                      
                      <div class="field-list">
                          <strong>📝 Updated Fields:</strong><br>
                          ${fieldsText}
                      </div>
                  </div>
                  
                  <p style="font-size: 16px; color: #555;">
                      Please review these changes in the Employee Management section of the HR system.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${dashboardUrl}" class="review-button">Review Changes</a>
                  </div>
                  
                  <div class="timestamp">
                      <p><strong>Note:</strong> The employee card will be highlighted in the Employee Management page for easy identification.</p>
                  </div>
              </div>
              <div class="footer">
                  <p>This is an automated notification from Go3net HR Management System.</p>
                  <p style="margin-top: 15px;">© Go3net HR Management System. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email template for profile update notifications
   */
  static generateProfileUpdateTextTemplate(data: ProfileUpdateEmailData): string {
    const { employeeName, updatedFields, adminName = 'Administrator' } = data;
    const fieldsText = updatedFields.join(', ');

    return `
Staff Profile Update Notification

Hello ${adminName},

A staff member has updated their profile information:

Staff Member: ${employeeName}
Updated Fields: ${fieldsText}
Update Date: ${new Date().toLocaleDateString()}
Update Time: ${new Date().toLocaleTimeString()}

Please review these changes in the Employee Management section of the HR system.

This is an automated notification from Go3net HR Management System.
    `.trim();
  }

  /**
   * Generate subject line for profile update emails
   */
  static generateProfileUpdateSubject(employeeName: string, updatedFields: string[]): string {
    const fieldCount = updatedFields.length;
    const fieldText = fieldCount === 1 ? 'field' : 'fields';
    
    return `Profile Update: ${employeeName} updated ${fieldCount} ${fieldText}`;
  }

  /**
   * Generate email data for profile update notification
   */
  static generateProfileUpdateEmailData(
    employeeName: string,
    updatedFields: string[],
    employeeId: string,
    adminName?: string
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    const data: ProfileUpdateEmailData = {
      employeeName,
      updatedFields,
      employeeId,
      adminName
    };

    return {
      subject: this.generateProfileUpdateSubject(employeeName, updatedFields),
      html: this.generateProfileUpdateEmailTemplate(data),
      text: this.generateProfileUpdateTextTemplate(data)
    };
  }

  /**
   * Log email template generation
   */
  static logEmailGeneration(employeeName: string, updatedFields: string[], recipientCount: number): void {
    logger.info('ProfileUpdateEmailTemplateService: Email template generated', {
      employeeName,
      updatedFields,
      recipientCount,
      fieldsCount: updatedFields.length
    });
  }
}

export default ProfileUpdateEmailTemplateService;