export declare class EmailService {
    private transporter;
    constructor();
    sendApprovalNotification(email: string, fullName: string, adminEmail?: string): Promise<void>;
    sendWelcomeEmail(email: string, fullName: string, approvalToken: string): Promise<void>;
    sendEmailConfirmation(email: string, fullName: string, confirmationUrl: string): Promise<void>;
    sendApprovalConfirmation(email: string, fullName: string): Promise<void>;
    sendTaskNotification(employeeEmail: string, employeeName: string, taskTitle: string, taskDescription: string, dueDate: string): Promise<void>;
    sendTaskCompletionNotification(adminEmail: string, adminName: string, employeeName: string, taskTitle: string): Promise<void>;
    sendPasswordResetEmail(email: string, fullName: string, resetUrl: string): Promise<void>;
    sendDepartmentAssignmentNotification(email: string, fullName: string, department: string): Promise<void>;
    private getSupabaseAdmin;
}
//# sourceMappingURL=EmailService.d.ts.map