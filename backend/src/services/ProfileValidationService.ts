import { UpdateEmployeeRequest } from '../models/SupabaseEmployee';
import logger from '../utils/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldRestrictions {
  allowedFields: string[];
  restrictedFields: string[];
  requiresApproval: string[];
}

export class ProfileValidationService {
  
  /**
   * Get field restrictions based on user role
   */
  static getFieldRestrictions(userRole: string, isUpdatingSelf: boolean): FieldRestrictions {
    if (userRole === 'admin' || userRole === 'superadmin') {
      return {
        allowedFields: ['fullName', 'phone', 'address', 'dateOfBirth', 'hireDate', 'profilePicture', 'department', 'position', 'role', 'status'],
        restrictedFields: [],
        requiresApproval: []
      };
    }

    if (userRole === 'hr') {
      if (isUpdatingSelf) {
        return {
          allowedFields: ['fullName', 'phone', 'address', 'dateOfBirth', 'profilePicture', 'position'],
          restrictedFields: ['department', 'role', 'status'],
          requiresApproval: ['department']
        };
      } else {
        return {
          allowedFields: ['fullName', 'phone', 'address', 'dateOfBirth', 'hireDate', 'profilePicture', 'department', 'position', 'role', 'status'],
          restrictedFields: [],
          requiresApproval: ['role']
        };
      }
    }

    // Employee role
    return {
      allowedFields: ['fullName', 'phone', 'address', 'dateOfBirth', 'profilePicture', 'position'],
      restrictedFields: ['department', 'role', 'status', 'hireDate'],
      requiresApproval: ['department', 'position']
    };
  }

  /**
   * Validate profile update data
   */
  static validateProfileUpdate(
    data: UpdateEmployeeRequest,
    userRole: string,
    isUpdatingSelf: boolean
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const restrictions = this.getFieldRestrictions(userRole, isUpdatingSelf);
    const updatedFields = Object.keys(data).filter(field => 
      data[field as keyof UpdateEmployeeRequest] !== undefined
    );

    // Check for restricted fields
    const restrictedFieldsUsed = updatedFields.filter(field => 
      restrictions.restrictedFields.includes(field)
    );

    if (restrictedFieldsUsed.length > 0) {
      result.errors.push(
        `You don't have permission to update: ${restrictedFieldsUsed.join(', ')}`
      );
      result.isValid = false;
    }

    // Check for fields that require approval
    const approvalRequiredFields = updatedFields.filter(field => 
      restrictions.requiresApproval.includes(field)
    );

    if (approvalRequiredFields.length > 0) {
      result.warnings.push(
        `The following fields require supervisor approval: ${approvalRequiredFields.join(', ')}`
      );
    }

    // Validate specific field formats
    if (data.phone && !this.isValidPhone(data.phone)) {
      result.errors.push('Invalid phone number format');
      result.isValid = false;
    }

    if (data.dateOfBirth && !this.isValidDateObject(data.dateOfBirth)) {
      result.errors.push('Invalid date of birth');
      result.isValid = false;
    }

    // Validate required fields
    if (data.fullName !== undefined && (!data.fullName || data.fullName.trim().length < 2)) {
      result.errors.push('Full name must be at least 2 characters long');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Filter allowed fields based on user role
   */
  static filterAllowedFields(
    data: UpdateEmployeeRequest,
    userRole: string,
    isUpdatingSelf: boolean
  ): UpdateEmployeeRequest {
    const restrictions = this.getFieldRestrictions(userRole, isUpdatingSelf);
    const filteredData: UpdateEmployeeRequest = {};

    restrictions.allowedFields.forEach(field => {
      if (data[field as keyof UpdateEmployeeRequest] !== undefined) {
        (filteredData as any)[field] = data[field as keyof UpdateEmployeeRequest];
      }
    });

    // Log filtered fields for audit
    const originalFields = Object.keys(data);
    const filteredFields = Object.keys(filteredData);
    const removedFields = originalFields.filter(field => !filteredFields.includes(field));

    if (removedFields.length > 0) {
      logger.info('ProfileValidationService: Fields filtered out due to permissions', {
        userRole,
        isUpdatingSelf,
        removedFields
      });
    }

    return filteredData;
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  private static isValidPhone(phone: string): boolean {
    // Allow various phone formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
  }

  /**
   * Validate date object
   */
  private static isValidDateObject(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime()) && date < new Date();
  }

  /**
   * Validate date format (for string dates)
   */
  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && date < new Date();
  }

  /**
   * Get user-friendly field names
   */
  static getFieldDisplayName(fieldName: string): string {
    const fieldNames: Record<string, string> = {
      fullName: 'Full Name',
      phone: 'Phone Number',
      address: 'Address',
      dateOfBirth: 'Date of Birth',
      hireDate: 'Hire Date',
      profilePicture: 'Profile Picture',
      department: 'Department',
      position: 'Position',
      role: 'Role',
      status: 'Status'
    };

    return fieldNames[fieldName] || fieldName;
  }

  /**
   * Generate validation summary for user
   */
  static generateValidationSummary(
    data: UpdateEmployeeRequest,
    userRole: string,
    isUpdatingSelf: boolean
  ): {
    allowed: string[];
    restricted: string[];
    requiresApproval: string[];
  } {
    const restrictions = this.getFieldRestrictions(userRole, isUpdatingSelf);
    const updatedFields = Object.keys(data).filter(field => 
      data[field as keyof UpdateEmployeeRequest] !== undefined
    );

    return {
      allowed: updatedFields.filter(field => 
        restrictions.allowedFields.includes(field) && 
        !restrictions.restrictedFields.includes(field) &&
        !restrictions.requiresApproval.includes(field)
      ).map(field => this.getFieldDisplayName(field)),
      
      restricted: updatedFields.filter(field => 
        restrictions.restrictedFields.includes(field)
      ).map(field => this.getFieldDisplayName(field)),
      
      requiresApproval: updatedFields.filter(field => 
        restrictions.requiresApproval.includes(field)
      ).map(field => this.getFieldDisplayName(field))
    };
  }
}