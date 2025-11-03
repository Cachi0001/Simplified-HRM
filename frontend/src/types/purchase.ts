// Purchase Request Types - Aligned with Backend API

export interface PurchaseRequest {
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
  // Additional fields from joins
  employee_name?: string;
  employee_email?: string;
  department?: string;
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

export interface UpdatePurchaseRequestData {
  item_name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
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

export interface PurchaseRequestStats {
  totalRequests: number;
  totalAmount: number;
  approvedAmount: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byUrgency: Record<string, number>;
  year: number;
}

// API Response Types
export interface PurchaseRequestResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    purchaseRequest?: PurchaseRequest;
    purchaseRequests?: PurchaseRequest[];
    count?: number;
    stats?: PurchaseRequestStats;
  };
}

// Form Data Type (for frontend forms)
export interface PurchaseRequestFormData {
  itemName: string; // camelCase for form binding
  description: string;
  quantity: number;
  unitPrice: number; // camelCase for form binding
  vendor?: string;
  category?: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  justification?: string;
  notes?: string;
  budgetCode?: string;
  expectedDeliveryDate?: string;
}

// Transform functions to convert between frontend and backend formats
export const transformToBackendFormat = (formData: PurchaseRequestFormData): CreatePurchaseRequestData => ({
  employee_id: '', // Will be set by the service
  item_name: formData.itemName,
  description: formData.description,
  quantity: formData.quantity,
  unit_price: formData.unitPrice,
  vendor: formData.vendor,
  category: formData.category,
  urgency: formData.urgency,
  justification: formData.justification,
  notes: formData.notes,
  budget_code: formData.budgetCode,
  expected_delivery_date: formData.expectedDeliveryDate
});

export const transformFromBackendFormat = (backendData: PurchaseRequest): PurchaseRequest => ({
  ...backendData,
  // Ensure consistent field names
  employee_id: backendData.employee_id,
  item_name: backendData.item_name,
  unit_price: backendData.unit_price,
  total_amount: backendData.total_amount,
  created_at: backendData.created_at,
  updated_at: backendData.updated_at
});

// Legacy interface for backward compatibility (maps to new format)
export interface LegacyPurchaseRequest {
  id: string;
  userId: string;
  itemName: string;
  description: string;
  quantity: number;
  estimatedCost: number;
  totalAmount?: number;
  urgency?: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'purchased';
  createdAt: string;
  updatedAt: string;
  employeeName?: string;
}

// Transform legacy format to new format
export const transformLegacyFormat = (legacyData: LegacyPurchaseRequest): PurchaseRequest => ({
  id: legacyData.id,
  employee_id: legacyData.userId,
  item_name: legacyData.itemName,
  description: legacyData.description,
  quantity: legacyData.quantity,
  unit_price: legacyData.estimatedCost,
  total_amount: legacyData.totalAmount || (legacyData.estimatedCost * legacyData.quantity),
  urgency: legacyData.urgency === 'medium' ? 'normal' : (legacyData.urgency as 'low' | 'high') || 'normal',
  status: legacyData.status === 'purchased' ? 'received' : legacyData.status as PurchaseRequest['status'],
  created_at: legacyData.createdAt,
  updated_at: legacyData.updatedAt,
  employee_name: legacyData.employeeName
});