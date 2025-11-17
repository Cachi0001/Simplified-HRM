/**
 * Format late time in a user-friendly way
 * @param minutes - Number of minutes late
 * @returns Formatted string like "50 minutes late" or "1 hour : 25 minutes late"
 */
export function formatLateTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''} : ${mins} minute${mins !== 1 ? 's' : ''} late`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''} late`;
}

/**
 * Format time from ISO string to HH:MM format
 * @param dateString - ISO date string
 * @returns Formatted time string or '—' if invalid
 */
export function formatTime(dateString?: string): string {
  if (!dateString) {
    return '—';
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date from ISO string to localized date format
 * @param dateString - ISO date string
 * @returns Formatted date string or '—' if invalid
 */
export function formatDate(dateString?: string): string {
  if (!dateString) {
    return '—';
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString();
}
