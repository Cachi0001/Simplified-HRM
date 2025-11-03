// Unit tests for leave request type transformations

import { 
  transformToBackendFormat, 
  transformFromBackendFormat,
  LeaveRequestFormData,
  LeaveRequest 
} from '../leave';

describe('Leave Request Type Transformations', () => {
  describe('transformToBackendFormat', () => {
    it('should transform form data to backend format correctly', () => {
      const formData: LeaveRequestFormData = {
        type: 'annual',
        startDate: '2024-01-15',
        endDate: '2024-01-20',
        reason: 'Family vacation',
        notes: 'Will be available by phone if needed'
      };

      const result = transformToBackendFormat(formData);

      expect(result).toEqual({
        employee_id: '', // Will be set by service
        type: 'annual',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        reason: 'Family vacation',
        notes: 'Will be available by phone if needed'
      });
    });

    it('should handle missing optional fields', () => {
      const formData: LeaveRequestFormData = {
        type: 'sick',
        startDate: '2024-01-15',
        endDate: '2024-01-16',
        reason: 'Flu symptoms'
      };

      const result = transformToBackendFormat(formData);

      expect(result).toEqual({
        employee_id: '',
        type: 'sick',
        start_date: '2024-01-15',
        end_date: '2024-01-16',
        reason: 'Flu symptoms',
        notes: undefined
      });
    });
  });

  describe('transformFromBackendFormat', () => {
    it('should transform backend data correctly', () => {
      const backendData: LeaveRequest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '456e7890-e89b-12d3-a456-426614174001',
        type: 'annual',
        start_date: '2024-01-15',
        end_date: '2024-01-20',
        reason: 'Family vacation',
        notes: 'Will be available by phone',
        status: 'pending',
        days_requested: 5,
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z',
        employee_name: 'John Doe',
        employee_email: 'john.doe@example.com',
        department: 'Engineering'
      };

      const result = transformFromBackendFormat(backendData);

      expect(result).toEqual(backendData);
      expect(result.employee_id).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(result.start_date).toBe('2024-01-15');
      expect(result.end_date).toBe('2024-01-20');
      expect(result.created_at).toBe('2024-01-10T10:00:00Z');
      expect(result.updated_at).toBe('2024-01-10T10:00:00Z');
    });

    it('should preserve all fields including optional ones', () => {
      const backendData: LeaveRequest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '456e7890-e89b-12d3-a456-426614174001',
        type: 'sick',
        start_date: '2024-01-15',
        end_date: '2024-01-16',
        reason: 'Flu symptoms',
        status: 'approved',
        approved_by: '789e0123-e89b-12d3-a456-426614174002',
        approved_at: '2024-01-12T14:30:00Z',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-12T14:30:00Z'
      };

      const result = transformFromBackendFormat(backendData);

      expect(result.approved_by).toBe('789e0123-e89b-12d3-a456-426614174002');
      expect(result.approved_at).toBe('2024-01-12T14:30:00Z');
      expect(result.status).toBe('approved');
    });
  });
});