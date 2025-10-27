// Supabase-compatible PurchaseRequest interface
export interface IPurchaseRequest {
  id: string;
  employee_id: string;
  item_name: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string | Date;
  updated_at: string | Date;
}

// Request/Response interfaces
export interface CreatePurchaseRequestRequest {
  employeeId?: string;
  employee_id?: string;
  itemName?: string;
  item_name?: string;
  amount: number;
  notes?: string;
}

export interface UpdatePurchaseRequestRequest {
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
  itemName?: string;
  item_name?: string;
  amount?: number;
}

export interface PurchaseRequestQuery {
  employeeId?: string;
  employee_id?: string;
  status?: 'pending' | 'approved' | 'rejected';
  page?: number;
  limit?: number;
}

// Response interface (camelCase for frontend)
export interface PurchaseRequestResponse {
  id: string;
  employeeId: string;
  itemName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}