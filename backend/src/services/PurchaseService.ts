import { PurchaseRepository, CreatePurchaseRequestData, PurchaseRequest } from '../repositories/PurchaseRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { EmailService } from './EmailService';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class PurchaseService {
  private purchaseRepo: PurchaseRepository;
  private employeeRepo: EmployeeRepository;
  private emailService: EmailService;

  constructor() {
    this.purchaseRepo = new PurchaseRepository();
    this.employeeRepo = new EmployeeRepository();
    this.emailService = new EmailService();
  }

  async createPurchaseRequest(userId: string, data: Omit<CreatePurchaseRequestData, 'employeeId'>): Promise<any> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    if (employee.status !== 'active') {
      throw new ValidationError('Only active employees can create purchase requests');
    }

    const requestData: CreatePurchaseRequestData = {
      employeeId: employee.id,
      itemName: data.itemName,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      vendor: data.vendor,
      category: data.category,
      urgency: data.urgency,
      justification: data.justification,
      notes: data.notes,
      budgetCode: data.budgetCode,
      expectedDeliveryDate: data.expectedDeliveryDate
    };

    const result = await this.purchaseRepo.createPurchaseRequest(requestData);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return result;
  }

  async getMyPurchaseRequests(userId: string, status?: string): Promise<PurchaseRequest[]> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    return await this.purchaseRepo.getPurchaseRequests(employee.id, status);
  }

  async getAllPurchaseRequests(status?: string): Promise<PurchaseRequest[]> {
    return await this.purchaseRepo.getPurchaseRequests(undefined, status);
  }

  async getPurchaseRequestById(id: string): Promise<PurchaseRequest> {
    const purchaseRequest = await this.purchaseRepo.getPurchaseRequestById(id);
    if (!purchaseRequest) {
      throw new NotFoundError('Purchase request not found');
    }
    return purchaseRequest;
  }

  async approvePurchaseRequest(purchaseRequestId: string, approvedByUserId: string, notes?: string): Promise<{ message: string; purchaseRequest: PurchaseRequest }> {
    console.log('[PurchaseService] Approving purchase request:', purchaseRequestId);
    console.log('[PurchaseService] Approver userId from JWT:', approvedByUserId);
    
    const purchaseRequest = await this.purchaseRepo.getPurchaseRequestById(purchaseRequestId);
    if (!purchaseRequest) {
      throw new NotFoundError('Purchase request not found');
    }

    if (purchaseRequest.status !== 'pending') {
      throw new ValidationError(`Cannot approve purchase request with status: ${purchaseRequest.status}`);
    }

    console.log('[PurchaseService] Looking for employee with user_id:', approvedByUserId);
    const approver = await this.employeeRepo.findByUserId(approvedByUserId);
    console.log('[PurchaseService] Found approver:', approver ? `Yes (id: ${approver.id}, role: ${approver.role})` : 'NO - THIS IS THE PROBLEM');
    
    if (!approver) {
      // Log all employees to debug
      const allEmployees = await this.employeeRepo.findAll({});
      console.log('[PurchaseService] All employees in database:', allEmployees.map(e => ({ id: e.id, user_id: e.user_id, email: e.email, role: e.role })));
      throw new NotFoundError('Approver not found');
    }

    if (!['superadmin', 'admin', 'hr'].includes(approver.role)) {
      throw new ValidationError('You do not have permission to approve purchase requests');
    }

    // Prevent self-approval
    if (purchaseRequest.employee_id === approver.id) {
      throw new ValidationError('You cannot approve your own purchase request');
    }

    const result = await this.purchaseRepo.approvePurchaseRequest(purchaseRequestId, approver.id, notes);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    await this.emailService.sendPurchaseApprovedEmail(
      purchaseRequest.employee_email!,
      purchaseRequest.employee_name!,
      purchaseRequest.item_name
    );

    const updatedPurchaseRequest = await this.purchaseRepo.getPurchaseRequestById(purchaseRequestId);

    return {
      message: result.message,
      purchaseRequest: updatedPurchaseRequest!
    };
  }

  async rejectPurchaseRequest(purchaseRequestId: string, rejectedByUserId: string, reason: string): Promise<{ message: string; purchaseRequest: PurchaseRequest }> {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    console.log('[PurchaseService] Rejecting purchase request:', purchaseRequestId);
    console.log('[PurchaseService] Rejector userId from JWT:', rejectedByUserId);

    const purchaseRequest = await this.purchaseRepo.getPurchaseRequestById(purchaseRequestId);
    if (!purchaseRequest) {
      throw new NotFoundError('Purchase request not found');
    }

    if (purchaseRequest.status !== 'pending') {
      throw new ValidationError(`Cannot reject purchase request with status: ${purchaseRequest.status}`);
    }

    console.log('[PurchaseService] Looking for employee with user_id:', rejectedByUserId);
    const rejector = await this.employeeRepo.findByUserId(rejectedByUserId);
    console.log('[PurchaseService] Found rejector:', rejector ? `Yes (id: ${rejector.id}, role: ${rejector.role})` : 'NO - THIS IS THE PROBLEM');
    
    if (!rejector) {
      // Log all employees to debug
      const allEmployees = await this.employeeRepo.findAll({});
      console.log('[PurchaseService] All employees in database:', allEmployees.map(e => ({ id: e.id, user_id: e.user_id, email: e.email, role: e.role })));
      throw new NotFoundError('Rejector not found');
    }

    if (!['superadmin', 'admin', 'hr'].includes(rejector.role)) {
      throw new ValidationError('You do not have permission to reject purchase requests');
    }

    const result = await this.purchaseRepo.rejectPurchaseRequest(purchaseRequestId, rejector.id, reason);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    await this.emailService.sendPurchaseRejectedEmail(
      purchaseRequest.employee_email!,
      purchaseRequest.employee_name!,
      purchaseRequest.item_name,
      reason
    );

    const updatedPurchaseRequest = await this.purchaseRepo.getPurchaseRequestById(purchaseRequestId);

    return {
      message: result.message,
      purchaseRequest: updatedPurchaseRequest!
    };
  }

  async cancelPurchaseRequest(purchaseRequestId: string, userId: string): Promise<{ message: string }> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    const result = await this.purchaseRepo.cancelPurchaseRequest(purchaseRequestId, employee.id);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return { message: result.message };
  }

  async updatePurchaseStatus(purchaseRequestId: string, newStatus: string, notes?: string): Promise<{ message: string; purchaseRequest: PurchaseRequest }> {
    const validStatuses = ['pending', 'approved', 'rejected', 'ordered', 'received', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new ValidationError(`Invalid status: ${newStatus}`);
    }

    const result = await this.purchaseRepo.updatePurchaseStatus(purchaseRequestId, newStatus, notes);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    const updatedPurchaseRequest = await this.purchaseRepo.getPurchaseRequestById(purchaseRequestId);

    return {
      message: result.message,
      purchaseRequest: updatedPurchaseRequest!
    };
  }

  async getMyPurchaseStatistics(userId: string, year?: number): Promise<any> {
    const employee = await this.employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }

    return await this.purchaseRepo.getPurchaseStatistics(employee.id, year);
  }

  async getVendors(): Promise<any[]> {
    return await this.purchaseRepo.getVendors();
  }

  async deletePurchaseRequest(purchaseRequestId: string, userId: string): Promise<{ message: string }> {
    const result = await this.purchaseRepo.deletePurchaseRequest(purchaseRequestId, userId);

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    return { message: result.message };
  }
}
