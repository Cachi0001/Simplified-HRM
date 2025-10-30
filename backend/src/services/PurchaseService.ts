import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { NotificationService } from './NotificationService';

export interface IPurchaseRequest {
    id: string;
    employee_id: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    vendor?: string;
    category?: string;
    urgency: 'low' | 'normal' | 'high' | 'urgent';
    status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'received' | 'cancelled';
    justification?: string;
    notes?: string;
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    budget_code?: string;
    expected_delivery_date?: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePurchaseRequestData {
    employee_id: string;
    item_name: string;
    description?: string;
    quantity?: number;
    unit_price: number;
    vendor?: string;
    category?: string;
    urgency?: 'low' | 'normal' | 'high' | 'urgent';
    justification?: string;
    notes?: string;
    budget_code?: string;
    expected_delivery_date?: string;
}

export interface ApprovePurchaseRequestData {
    approved_by: string;
    notes?: string;
    budget_code?: string;
}

export interface RejectPurchaseRequestData {
    approved_by: string;
    rejection_reason: string;
}

export class PurchaseService {
    private supabase: SupabaseClient;
    private notificationService: NotificationService;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = new NotificationService();
    }

    /**
     * Create a new purchase request
     */
    async createPurchaseRequest(data: CreatePurchaseRequestData): Promise<IPurchaseRequest> {
        try {
            logger.info('PurchaseService: Creating purchase request', { 
                employeeId: data.employee_id, 
                itemName: data.item_name,
                unitPrice: data.unit_price
            });

            const quantity = data.quantity || 1;
            const totalAmount = data.unit_price * quantity;

            const { data: purchaseRequest, error } = await this.supabase
                .from('purchase_requests')
                .insert({
                    employee_id: data.employee_id,
                    item_name: data.item_name,
                    description: data.description,
                    quantity,
                    unit_price: data.unit_price,
                    total_amount: totalAmount,
                    vendor: data.vendor,
                    category: data.category,
                    urgency: data.urgency || 'normal',
                    justification: data.justification,
                    notes: data.notes,
                    budget_code: data.budget_code,
                    expected_delivery_date: data.expected_delivery_date,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                logger.error('PurchaseService: Failed to create purchase request', { error: error.message });
                throw error;
            }

            // Send notifications to all approvers
            await this.notifyApprovers(purchaseRequest, 'new_purchase_request');

            logger.info('PurchaseService: Purchase request created successfully', { purchaseRequestId: purchaseRequest.id });
            return purchaseRequest;
        } catch (error) {
            logger.error('PurchaseService: Create purchase request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get purchase request by ID
     */
    async getPurchaseRequestById(id: string): Promise<IPurchaseRequest | null> {
        try {
            const { data, error } = await this.supabase
                .from('purchase_requests')
                .select(`
                    *,
                    employee:employees!purchase_requests_employee_id_fkey(id, full_name, email),
                    approver:employees!purchase_requests_approved_by_fkey(id, full_name, email)
                `)
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') {
                logger.error('PurchaseService: Failed to get purchase request', { error: error.message });
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('PurchaseService: Get purchase request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get all purchase requests for an employee
     */
    async getEmployeePurchaseRequests(employeeId: string): Promise<IPurchaseRequest[]> {
        try {
            const { data, error } = await this.supabase
                .from('purchase_requests')
                .select(`
                    *,
                    approver:employees!purchase_requests_approved_by_fkey(id, full_name, email)
                `)
                .eq('employee_id', employeeId)
                .order('created_at', { ascending: false });

            if (error) {
                logger.error('PurchaseService: Failed to get employee purchase requests', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('PurchaseService: Get employee purchase requests failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get all pending purchase requests (for approvers)
     */
    async getPendingPurchaseRequests(): Promise<IPurchaseRequest[]> {
        try {
            const { data, error } = await this.supabase
                .from('purchase_requests')
                .select(`
                    *,
                    employee:employees!purchase_requests_employee_id_fkey(id, full_name, email, department)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) {
                logger.error('PurchaseService: Failed to get pending purchase requests', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('PurchaseService: Get pending purchase requests failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get all purchase requests (for admin view)
     */
    async getAllPurchaseRequests(status?: string): Promise<IPurchaseRequest[]> {
        try {
            let query = this.supabase
                .from('purchase_requests')
                .select(`
                    *,
                    employee:employees!purchase_requests_employee_id_fkey(id, full_name, email, department),
                    approver:employees!purchase_requests_approved_by_fkey(id, full_name, email)
                `);

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                logger.error('PurchaseService: Failed to get all purchase requests', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('PurchaseService: Get all purchase requests failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Approve a purchase request
     */
    async approvePurchaseRequest(purchaseRequestId: string, data: ApprovePurchaseRequestData): Promise<IPurchaseRequest> {
        try {
            logger.info('PurchaseService: Approving purchase request', { purchaseRequestId, approvedBy: data.approved_by });

            const { data: updatedRequest, error } = await this.supabase
                .from('purchase_requests')
                .update({
                    status: 'approved',
                    approved_by: data.approved_by,
                    approved_at: new Date().toISOString(),
                    notes: data.notes,
                    budget_code: data.budget_code,
                    updated_at: new Date().toISOString()
                })
                .eq('id', purchaseRequestId)
                .select(`
                    *,
                    employee:employees!purchase_requests_employee_id_fkey(id, full_name, email),
                    approver:employees!purchase_requests_approved_by_fkey(id, full_name, email)
                `)
                .single();

            if (error) {
                logger.error('PurchaseService: Failed to approve purchase request', { error: error.message });
                throw error;
            }

            // Notify the employee about approval
            await this.notificationService.createNotification({
                userId: updatedRequest.employee.id,
                type: 'purchase',
                title: 'Purchase Request Approved',
                message: `Your purchase request for "${updatedRequest.item_name}" (${updatedRequest.total_amount}) has been approved.`,
                relatedId: updatedRequest.id,
                actionUrl: '/purchase-requests'
            });

            logger.info('PurchaseService: Purchase request approved successfully', { purchaseRequestId });
            return updatedRequest;
        } catch (error) {
            logger.error('PurchaseService: Approve purchase request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Reject a purchase request
     */
    async rejectPurchaseRequest(purchaseRequestId: string, data: RejectPurchaseRequestData): Promise<IPurchaseRequest> {
        try {
            logger.info('PurchaseService: Rejecting purchase request', { purchaseRequestId, approvedBy: data.approved_by });

            const { data: updatedRequest, error } = await this.supabase
                .from('purchase_requests')
                .update({
                    status: 'rejected',
                    approved_by: data.approved_by,
                    approved_at: new Date().toISOString(),
                    rejection_reason: data.rejection_reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', purchaseRequestId)
                .select(`
                    *,
                    employee:employees!purchase_requests_employee_id_fkey(id, full_name, email),
                    approver:employees!purchase_requests_approved_by_fkey(id, full_name, email)
                `)
                .single();

            if (error) {
                logger.error('PurchaseService: Failed to reject purchase request', { error: error.message });
                throw error;
            }

            // Notify the employee about rejection
            await this.notificationService.createNotification({
                userId: updatedRequest.employee.id,
                type: 'purchase',
                title: 'Purchase Request Rejected',
                message: `Your purchase request for "${updatedRequest.item_name}" has been rejected. Reason: ${data.rejection_reason}`,
                relatedId: updatedRequest.id,
                actionUrl: '/purchase-requests'
            });

            logger.info('PurchaseService: Purchase request rejected successfully', { purchaseRequestId });
            return updatedRequest;
        } catch (error) {
            logger.error('PurchaseService: Reject purchase request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Cancel a purchase request (by employee)
     */
    async cancelPurchaseRequest(purchaseRequestId: string, employeeId: string): Promise<IPurchaseRequest> {
        try {
            logger.info('PurchaseService: Cancelling purchase request', { purchaseRequestId, employeeId });

            const { data: updatedRequest, error } = await this.supabase
                .from('purchase_requests')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', purchaseRequestId)
                .eq('employee_id', employeeId)
                .eq('status', 'pending') // Only allow cancelling pending requests
                .select()
                .single();

            if (error) {
                logger.error('PurchaseService: Failed to cancel purchase request', { error: error.message });
                throw error;
            }

            logger.info('PurchaseService: Purchase request cancelled successfully', { purchaseRequestId });
            return updatedRequest;
        } catch (error) {
            logger.error('PurchaseService: Cancel purchase request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Update a purchase request (only if pending)
     */
    async updatePurchaseRequest(purchaseRequestId: string, employeeId: string, updateData: Partial<CreatePurchaseRequestData>): Promise<IPurchaseRequest> {
        try {
            logger.info('PurchaseService: Updating purchase request', { purchaseRequestId, employeeId });

            const updatePayload: any = {
                updated_at: new Date().toISOString()
            };

            if (updateData.item_name) updatePayload.item_name = updateData.item_name;
            if (updateData.description) updatePayload.description = updateData.description;
            if (updateData.quantity) updatePayload.quantity = updateData.quantity;
            if (updateData.unit_price) updatePayload.unit_price = updateData.unit_price;
            if (updateData.vendor) updatePayload.vendor = updateData.vendor;
            if (updateData.category) updatePayload.category = updateData.category;
            if (updateData.urgency) updatePayload.urgency = updateData.urgency;
            if (updateData.justification) updatePayload.justification = updateData.justification;
            if (updateData.notes) updatePayload.notes = updateData.notes;
            if (updateData.budget_code) updatePayload.budget_code = updateData.budget_code;
            if (updateData.expected_delivery_date) updatePayload.expected_delivery_date = updateData.expected_delivery_date;

            // Recalculate total amount if quantity or unit price changed
            if (updateData.quantity || updateData.unit_price) {
                const currentRequest = await this.getPurchaseRequestById(purchaseRequestId);
                if (currentRequest) {
                    const quantity = updateData.quantity || currentRequest.quantity;
                    const unitPrice = updateData.unit_price || currentRequest.unit_price;
                    updatePayload.total_amount = quantity * unitPrice;
                }
            }

            const { data: updatedRequest, error } = await this.supabase
                .from('purchase_requests')
                .update(updatePayload)
                .eq('id', purchaseRequestId)
                .eq('employee_id', employeeId)
                .eq('status', 'pending') // Only allow updating pending requests
                .select()
                .single();

            if (error) {
                logger.error('PurchaseService: Failed to update purchase request', { error: error.message });
                throw error;
            }

            logger.info('PurchaseService: Purchase request updated successfully', { purchaseRequestId });
            return updatedRequest;
        } catch (error) {
            logger.error('PurchaseService: Update purchase request failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get purchase statistics for an employee
     */
    async getEmployeePurchaseStats(employeeId: string, year?: number): Promise<any> {
        try {
            const currentYear = year || new Date().getFullYear();
            const startDate = `${currentYear}-01-01`;
            const endDate = `${currentYear}-12-31`;

            const { data, error } = await this.supabase
                .from('purchase_requests')
                .select('category, total_amount, status, urgency')
                .eq('employee_id', employeeId)
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (error) {
                logger.error('PurchaseService: Failed to get purchase stats', { error: error.message });
                throw error;
            }

            const stats = {
                totalRequests: data?.length || 0,
                totalAmount: 0,
                approvedAmount: 0,
                byStatus: {} as Record<string, number>,
                byCategory: {} as Record<string, number>,
                byUrgency: {} as Record<string, number>,
                year: currentYear
            };

            data?.forEach(request => {
                stats.totalAmount += request.total_amount;
                if (request.status === 'approved') {
                    stats.approvedAmount += request.total_amount;
                }
                
                stats.byStatus[request.status] = (stats.byStatus[request.status] || 0) + 1;
                stats.byCategory[request.category || 'uncategorized'] = (stats.byCategory[request.category || 'uncategorized'] || 0) + 1;
                stats.byUrgency[request.urgency] = (stats.byUrgency[request.urgency] || 0) + 1;
            });

            return stats;
        } catch (error) {
            logger.error('PurchaseService: Get purchase stats failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Send notifications to all approvers (super-admin, admin, hr)
     */
    private async notifyApprovers(purchaseRequest: IPurchaseRequest, type: string): Promise<void> {
        try {
            // Get all users with approval roles
            const { data: approvers, error } = await this.supabase
                .from('employees')
                .select('id, full_name, email')
                .in('role', ['super-admin', 'admin', 'hr']);

            if (error) {
                logger.error('PurchaseService: Failed to get approvers', { error: error.message });
                return;
            }

            // Get employee details
            const { data: employee } = await this.supabase
                .from('employees')
                .select('full_name, email')
                .eq('id', purchaseRequest.employee_id)
                .single();

            if (!employee) return;

            // Send notifications to all approvers
            if (approvers && approvers.length > 0) {
                for (const approver of approvers) {
                    await this.notificationService.createNotification({
                        userId: approver.id,
                        type: 'purchase',
                        title: 'New Purchase Request',
                        message: `${employee.full_name} has submitted a purchase request for "${purchaseRequest.item_name}" (${purchaseRequest.total_amount}). Urgency: ${purchaseRequest.urgency}`,
                        relatedId: purchaseRequest.id,
                        actionUrl: '/admin/purchase-requests'
                    });
                }
            }

            logger.info('PurchaseService: Approver notifications sent', { count: approvers.length });
        } catch (error) {
            logger.error('PurchaseService: Failed to notify approvers', { error: (error as Error).message });
        }
    }
}

export default new PurchaseService();