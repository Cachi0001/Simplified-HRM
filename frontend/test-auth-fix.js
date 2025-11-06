// Test authentication fix
console.log('🧪 Testing Authentication Fix...\n');

// Simulate different localStorage scenarios
const testScenarios = [
  {
    name: 'User in localStorage',
    setup: () => localStorage.setItem('user', JSON.stringify({ id: 'user123', name: 'Test User' })),
    cleanup: () => localStorage.removeItem('user')
  },
  {
    name: 'CurrentUser in localStorage', 
    setup: () => localStorage.setItem('currentUser', JSON.stringify({ userId: 'user456', name: 'Current User' })),
    cleanup: () => localStorage.removeItem('currentUser')
  },
  {
    name: 'JWT Token in localStorage',
    setup: () => {
      // Create a simple JWT-like token (not real JWT, just for testing)
      const payload = { id: 'user789', name: 'JWT User' };
      const base64Payload = btoa(JSON.stringify(payload));
      const fakeToken = `header.${base64Payload}.signature`;
      localStorage.setItem('accessToken', fakeToken);
    },
    cleanup: () => localStorage.removeItem('accessToken')
  },
  {
    name: 'No authentication data',
    setup: () => {
      localStorage.clear();
    },
    cleanup: () => {}
  }
];

// Import the getCurrentUserId function logic
function getCurrentUserId() {
  try {
    // Try multiple possible keys for user data
    const possibleKeys = ['user', 'currentUser', 'authUser', 'userData'];
    
    for (const key of possibleKeys) {
      const storedData = localStorage.getItem(key);
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          if (parsed && (parsed.id || parsed.userId || parsed.user_id || parsed.employeeId)) {
            return parsed.id || parsed.userId || parsed.user_id || parsed.employeeId;
          }
        } catch (parseError) {
          continue;
        }
      }
    }

    // Try to extract from JWT token
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(function (c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join('')
        );

        const decoded = JSON.parse(jsonPayload);
        if (decoded && (decoded.id || decoded.userId || decoded.user_id || decoded.sub)) {
          return decoded.id || decoded.userId || decoded.user_id || decoded.sub;
        }
      } catch (tokenError) {
        // Silent fail
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get current user ID:', error);
    return null;
  }
}

// Test each scenario
testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. Testing: ${scenario.name}`);
  
  // Setup the scenario
  scenario.setup();
  
  // Test the function
  const userId = getCurrentUserId();
  
  if (userId) {
    console.log(`✅ User ID found: ${userId}`);
  } else {
    console.log(`❌ No user ID found`);
  }
  
  // Cleanup
  scenario.cleanup();
  console.log('');
});

console.log('🎯 Authentication Fix Test Complete!');
console.log('The getCurrentUserId function should now work with multiple storage formats.');