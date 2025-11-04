import { IEmployee } from '../types/employee';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
}

// Define required fields for profile completion
const REQUIRED_PROFILE_FIELDS = [
  'fullName',
  'email',
  'phone',
  'address',
  'dateOfBirth',
  'department',
  'position'
];

// Define field labels for user-friendly display
const FIELD_LABELS: Record<string, string> = {
  fullName: 'Full Name',
  email: 'Email Address',
  phone: 'Phone Number',
  address: 'Address',
  dateOfBirth: 'Date of Birth',
  department: 'Department',
  position: 'Position'
};

/**
 * Check if a profile field has a valid value
 */
function isFieldComplete(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (value instanceof Date) return !isNaN(value.getTime());
  return true;
}

/**
 * Calculate profile completion status for an employee
 */
export function calculateProfileCompletion(employee: Partial<IEmployee> | null): ProfileCompletionStatus {
  if (!employee) {
    return {
      isComplete: false,
      missingFields: REQUIRED_PROFILE_FIELDS.map(field => FIELD_LABELS[field]),
      completionPercentage: 0
    };
  }

  const missingFields: string[] = [];
  let completedFields = 0;

  REQUIRED_PROFILE_FIELDS.forEach(field => {
    const value = employee[field as keyof IEmployee];
    if (isFieldComplete(value)) {
      completedFields++;
    } else {
      missingFields.push(FIELD_LABELS[field]);
    }
  });

  const completionPercentage = Math.round((completedFields / REQUIRED_PROFILE_FIELDS.length) * 100);
  const isComplete = missingFields.length === 0;

  return {
    isComplete,
    missingFields,
    completionPercentage
  };
}

/**
 * Check if profile completion popup should be shown
 */
export function shouldShowProfileCompletionPopup(
  employee: Partial<IEmployee> | null,
  hasBeenDismissed: boolean = false
): boolean {
  if (!employee) return false;
  
  const { isComplete } = calculateProfileCompletion(employee);
  
  // Don't show if profile is complete
  if (isComplete) return false;
  
  // Don't show if user has dismissed it in this session (but will show again on next login)
  if (hasBeenDismissed) return false;
  
  return true;
}

/**
 * Get profile completion storage key for a user
 */
export function getProfileCompletionStorageKey(userId: string): string {
  return `profile_completion_dismissed_${userId}`;
}

/**
 * Check if profile completion popup was dismissed in this session
 */
export function wasProfileCompletionDismissed(userId: string): boolean {
  const key = getProfileCompletionStorageKey(userId);
  return sessionStorage.getItem(key) === 'true';
}

/**
 * Mark profile completion popup as dismissed for this session
 */
export function markProfileCompletionDismissed(userId: string): void {
  const key = getProfileCompletionStorageKey(userId);
  sessionStorage.setItem(key, 'true');
}

/**
 * Clear profile completion dismissal (used when profile is completed)
 */
export function clearProfileCompletionDismissal(userId: string): void {
  const key = getProfileCompletionStorageKey(userId);
  sessionStorage.removeItem(key);
}