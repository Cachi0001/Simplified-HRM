// Unit tests for purchase request type transformations

import { 
  transformToBackendFormat, 
  transformFromBackendFormat,
  transformLegacyFormat,
  PurchaseRequestFormData,
  PurchaseRequest,
  LegacyPurchaseRequest 
} from '../purchase';

describe('Purchase Request Type Transformations', () => {
  describe('transformToBackendFormat', () => {
    it('should transform form data to backend format correctly', () => {
      const formData: PurchaseRequestFormData = {
        itemName: 'Office Chair',
        description: 'Ergonomic office chair for better posture',
        quantity: 2,
        unitPrice: 150.00,
        vendor: 'Office Depot',
        category: 'Office Furniture',
        urgency: 'normal',
        justification: 'Current chairs are broken',
        notes: 'Prefer black color',
        budgetCode: 'OFFICE-2024',
        expectedDeliveryDate: '2024-02-15'
      };

      const result = transformToBackendFormat(formData);

      expect(result).toEqual({
        employee_id: '', // Will be set by service
        item_name: 'Office Chair',
        description: 'Ergonomic office chair for better posture',
        quantity: 2,
        unit_price: 150.00,
        vendor: 'Office Depot',
        category: 'Office Furniture',
        urgency: 'normal',
        justification: 'Current chairs are broken',
        notes: 'Prefer black color',
        budget_code: 'OFFICE-2024',
        expected_delivery_date: '2024-02-15'
      });
    });

    it('should handle missing optional fields', () => {
      const formData: PurchaseRequestFormData = {
        itemName: 'Laptop',
        description: 'Development laptop',
        quantity: 1,
        unitPrice: 1200.00,
        urgency: 'high'
      };

      const result = transformToBackendFormat(formData);

      expect(result).toEqual({
        employee_id: '',
        item_name: 'Laptop',
        description: 'Development laptop',
        quantity: 1,
        unit_price: 1200.00,
        urgency: 'high',
        vendor: undefined,
        category: undefined,
        justification: undefined,
        notes: undefined,
        budget_code: undefined,
        expected_delivery_date: undefined
      });
    });
  });

  describe('transformFromBackendFormat', () => {
    it('should transform backend data correctly', () => {
      const backendData: PurchaseRequest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '456e7890-e89b-12d3-a456-426614174001',
        item_name: 'Office Chair',
        description: 'Ergonomic office chair',
        quantity: 2,
        unit_price: 150.00,
        total_amount: 300.00,
        vendor: 'Office Depot',
        category: 'Office Furniture',
        urgency: 'normal',
        status: 'pending',
        justification: 'Current chairs are broken',
        notes: 'Prefer black color',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z',
        employee_name: 'John Doe',
        employee_email: 'john.doe@example.com',
        department: 'Engineering'
      };

      const result = transformFromBackendFormat(backendData);

      expect(result).toEqual(backendData);
      expect(result.employee_id).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(result.item_name).toBe('Office Chair');
      expect(result.unit_price).toBe(150.00);
      expect(result.total_amount).toBe(300.00);
      expect(result.created_at).toBe('2024-01-10T10:00:00Z');
      expect(result.updated_at).toBe('2024-01-10T10:00:00Z');
    });
  });

  describe('transformLegacyFormat', () => {
    it('should transform legacy format to new format correctly', () => {
      const legacyData: LegacyPurchaseRequest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '456e7890-e89b-12d3-a456-426614174001',
        itemName: 'Office Chair',
        description: 'Ergonomic office chair',
        quantity: 2,
        estimatedCost: 150.00,
        totalAmount: 300.00,
        urgency: 'medium',
        status: 'pending',
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z',
        employeeName: 'John Doe'
      };

      const result = transformLegacyFormat(legacyData);

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '456e7890-e89b-12d3-a456-426614174001',
        item_name: 'Office Chair',
        description: 'Ergonomic office chair',
        quantity: 2,
        unit_price: 150.00,
        total_amount: 300.00,
        urgency: 'normal', // medium -> normal
        status: 'pending',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z',
        employee_name: 'John Doe'
      });
    });

    it('should handle legacy status mapping', () => {
      const legacyData: LegacyPurchaseRequest = {
        id: '123',
        userId: '456',
        itemName: 'Item',
        description: 'Description',
        quantity: 1,
        estimatedCost: 100,
        urgency: 'high',
        status: 'purchased', // legacy status
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z'
      };

      const result = transformLegacyFormat(legacyData);

      expect(result.status).toBe('received'); // purchased -> received
      expect(result.urgency).toBe('high');
      expect(result.total_amount).toBe(100); // calculated from estimatedCost * quantity
    });

    it('should calculate total amount when not provided', () => {
      const legacyData: LegacyPurchaseRequest = {
        id: '123',
        userId: '456',
        itemName: 'Item',
        description: 'Description',
        quantity: 3,
        estimatedCost: 50,
        status: 'pending',
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z'
      };

      const result = transformLegacyFormat(legacyData);

      expect(result.total_amount).toBe(150); // 3 * 50
    });
  });
});