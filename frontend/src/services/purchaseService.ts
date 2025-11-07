import api from '../lib/api';

export interface PurchaseRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_email?: string;
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
  approver_name?: string;
  approved_at?: string;
  approval_notes?: string;
  rejection_reason?: string;
  budget_code?: string;
  expected_delivery_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseRequestData {
  itemName: string;
  description?: string;
  quantity?: number;
  unitPrice: number;
  vendor?: string;
  category?: string;
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  justification?: string;
  notes?: string;
  budgetCode?: string;
  expectedDeliveryDate?: string;
}

export interface PurchaseStatistics {
  year: number;
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  ordered: number;
  received: number;
  total_amount: number;
  approved_amount: number;
  pending_amount: number;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

class PurchaseService {
  async createPurchaseRequest(data: CreatePurchaseRequestData): Promise<{
    success: boolean;
    message: string;
    data?: {
      purchase_request_id: string;
      total_amount: number;
    };
  }> {
    try {
      const response = await api.post('/purchase/request', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create purchase request:', error);
      throw new Error(error.response?.data?.message || 'Failed to create purchase request');
    }
  }

  async getMyPurchaseRequests(status?: string): Promise<PurchaseRequest[]> {
    try {
      const params = status ? { status } : {};
      const response = await api.get('/purchase/my-requests', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch my purchase requests:', error);
      throw new Error('Failed to fetch purchase requests');
    }
  }

  async getAllPurchaseRequests(status?: string): Promise<PurchaseRequest[]> {
    try {
      const params = status ? { status } : {};
      const response = await api.get('/purchase/requests', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch all purchase requests:', error);
      throw new Error('Failed to fetch purchase requests');
    }
  }

  async getPurchaseRequestById(id: string): Promise<PurchaseRequest> {
    try {
      const response = await api.get(`/purchase/requests/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch purchase request ${id}:`, error);
      throw new Error('Failed to fetch purchase request');
    }
  }

  async approvePurchaseRequest(id: string, notes?: string): Promise<{
    success: boolean;
    message: string;
    data: PurchaseRequest;
  }> {
    try {
      const response = await api.put(`/purchase/requests/${id}/approve`, { notes });
      return response.data;
    } catch (error: any) {
      console.error(`Failed to approve purchase request ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to approve purchase request');
    }
  }

  async rejectPurchaseRequest(id: string, reason: string): Promise<{
    success: boolean;
    message: string;
    data: PurchaseRequest;
  }> {
    try {
      const response = await api.put(`/purchase/requests/${id}/reject`, { reason });
      return response.data;
    } catch (error: any) {
      console.error(`Failed to reject purchase request ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to reject purchase request');
    }
  }

  async cancelPurchaseRequest(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await api.put(`/purchase/requests/${id}/cancel`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to cancel purchase request ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to cancel purchase request');
    }
  }

  async updatePurchaseStatus(id: string, status: string, notes?: string): Promise<{
    success: boolean;
    message: string;
    data: PurchaseRequest;
  }> {
    try {
      const response = await api.put(`/purchase/requests/${id}/status`, { status, notes });
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update purchase status ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to update purchase status');
    }
  }

  async deletePurchaseRequest(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await api.delete(`/purchase/requests/${id}`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to delete purchase request ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to delete purchase request');
    }
  }

  async getMyPurchaseStatistics(year?: number): Promise<PurchaseStatistics> {
    try {
      const params = year ? { year } : {};
      const response = await api.get('/purchase/my-statistics', { params });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch purchase statistics:', error);
      throw new Error('Failed to fetch purchase statistics');
    }
  }

  async getVendors(): Promise<Vendor[]> {
    try {
      const response = await api.get('/purchase/vendors');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      throw new Error('Failed to fetch vendors');
    }
  }
}

export const purchaseService = new PurchaseService();
