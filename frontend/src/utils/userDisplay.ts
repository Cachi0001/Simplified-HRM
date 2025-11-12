/**
 * Utility functions for displaying user information
 */

/**
 * Get display name for a user, showing "YOU" if it's the current user
 */
export function getDisplayName(
  userName: string | undefined,
  userId: string | undefined,
  currentUserId: string | undefined,
  currentEmployeeId: string | undefined
): string {
  if (!userName) return 'Unknown';
  
  // Check if this is the current user
  if (userId && currentUserId && userId === currentUserId) {
    return 'You';
  }
  
  if (userId && currentEmployeeId && userId === currentEmployeeId) {
    return 'You';
  }
  
  return userName;
}

/**
 * Get display name with role, showing "YOU" if it's the current user
 */
export function getDisplayNameWithRole(
  userName: string | undefined,
  userId: string | undefined,
  role: string | undefined,
  currentUserId: string | undefined,
  currentEmployeeId: string | undefined
): string {
  const displayName = getDisplayName(userName, userId, currentUserId, currentEmployeeId);
  
  if (displayName === 'YOU') {
    return role ? `YOU (${role})` : 'YOU';
  }
  
  return role ? `${userName} (${role})` : userName || 'Unknown';
}

/**
 * Check if a user ID matches the current user
 */
export function isCurrentUser(
  userId: string | undefined,
  currentUserId: string | undefined,
  currentEmployeeId: string | undefined
): boolean {
  if (!userId) return false;
  
  return (
    (currentUserId && userId === currentUserId) ||
    (currentEmployeeId && userId === currentEmployeeId)
  );
}
