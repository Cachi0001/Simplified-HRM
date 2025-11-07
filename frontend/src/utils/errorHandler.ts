/**
 * Utility function to extract error messages from API responses
 * Handles various error response formats from the backend
 */
export function extractErrorMessage(error: any, fallbackMessage: string = 'An error occurred'): string {
  // Check for nested error.message structure (new backend format)
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  // Check for direct error string (old backend format)
  if (error.response?.data?.error && typeof error.response.data.error === 'string') {
    return error.response.data.error;
  }
  
  // Check for message field
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Check for error.message
  if (error.message) {
    return error.message;
  }
  
  // Fallback
  return fallbackMessage;
}
