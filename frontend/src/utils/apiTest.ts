import api from '../lib/api';

/**
 * Utility function to test API connectivity
 * This can be called from the browser console to diagnose connectivity issues
 */
export const testApiConnectivity = async () => {
  console.log('Testing API connectivity...');
  
  try {
    // Test the health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await api.get('/health');
    console.log('Health endpoint response:', healthResponse.data);
    
    // Test the CORS test endpoint
    console.log('Testing CORS test endpoint...');
    const corsResponse = await api.get('/cors-test');
    console.log('CORS test endpoint response:', corsResponse.data);
    
    // Test the preflight test endpoint
    console.log('Testing preflight test endpoint...');
    const preflightResponse = await api.get('/preflight-test');
    console.log('Preflight test endpoint response:', preflightResponse.data);
    
    console.log('All API connectivity tests passed!');
    return {
      success: true,
      health: healthResponse.data,
      cors: corsResponse.data,
      preflight: preflightResponse.data
    };
  } catch (error) {
    console.error('API connectivity test failed:', error);
    return {
      success: false,
      error: error
    };
  }
};

// Make the test function available in the global scope for browser console access
if (typeof window !== 'undefined') {
  (window as any).testApiConnectivity = testApiConnectivity;
}

export default testApiConnectivity;