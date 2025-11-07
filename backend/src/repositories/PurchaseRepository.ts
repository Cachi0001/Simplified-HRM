import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
  approved_at?: Date;
  approval_notes?: string;
  rejection_reason?: string;
  budget_code?: string;
  expected_delivery_date?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePurchaseRequestData {
  employeeId: string;
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

export class PurchaseRepository {
  async createPurchaseRequest(data: CreatePurchaseRequestData): Promise<any> {
    const result = await pool.query(
      `SELECT create_purchase_request($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) as result`,
      [
        data.employeeId,
        data.itemName,
        data.description || null,
        data.quantity || 1,
        data.unitPrice,
        data.vendor || null,
        data.category || null,
        data.urgency || 'normal',
        data.justification || null,
        data.notes || null,
        data.budgetCode || null,
        data.expectedDeliveryDate || null
      ]
    );
    return result.rows[0].result;
  }

  async getPurchaseRequests(employeeId?: string, status?: string): Promise<PurchaseRequest[]> {
    const result = await pool.query(
      `SELECT * FROM get_purchase_requests($1, $2)`,
      [employeeId || null, status || null]
    );
    return result.rows;
  }

  async getPurchaseRequestById(id: string): Promise<PurchaseRequest | null> {
    const result = await pool.query(
      `SELECT * FROM get_purchase_requests(NULL, NULL) WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async cancelPurchaseRequest(purchaseRequestId: string, employeeId: string): Promise<any> {
    const result = await pool.query(
      `SELECT cancel_purchase_request($1, $2) as result`,
      [purchaseRequestId, employeeId]
    );
    return result.rows[0].result;
  }

  async deletePurchaseRequest(purchaseRequestId: string, userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT delete_purchase_request($1, $2) as result`,
      [purchaseRequestId, userId]
    );
    return result.rows[0].result;
  }

  async getPurchaseStatistics(employeeId: string, year?: number): Promise<any> {
    const result = await pool.query(
      `SELECT get_purchase_statistics($1, $2) as stats`,
      [employeeId, year || null]
    );
    return result.rows[0].stats;
  }

  async approvePurchaseRequest(purchaseRequestId: string, approvedById: string, notes?: string): Promise<any> {
    const result = await pool.query(
      `SELECT approve_purchase_request($1, $2, $3) as result`,
      [purchaseRequestId, approvedById, notes || null]
    );
    return result.rows[0].result;
  }

  async rejectPurchaseRequest(purchaseRequestId: string, rejectedById: string, reason: string): Promise<any> {
    const result = await pool.query(
      `SELECT reject_purchase_request($1, $2, $3) as result`,
      [purchaseRequestId, rejectedById, reason]
    );
    return result.rows[0].result;
  }

  async updatePurchaseStatus(purchaseRequestId: string, newStatus: string, notes?: string): Promise<any> {
    const result = await pool.query(
      `SELECT update_purchase_status($1, $2, $3) as result`,
      [purchaseRequestId, newStatus, notes || null]
    );
    return result.rows[0].result;
  }

  async getVendors(): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM get_vendors()`
    );
    return result.rows;
  }
}
