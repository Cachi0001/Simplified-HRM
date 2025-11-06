// Simple test to check if chat routes are working
const API_BASE_URL = 'http://localhost:3001/api';

async function testChatRoutes() {
  try {
    console.log('🧪 Testing chat API routes...');
    
    // Test 1: Check if chat list endpoint exists
    console.log('1. Testing GET /api/chat/list...');
    try {
      const response = await fetch(`${API_BASE_URL}/chat/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add a dummy auth header for testing
          'Authorization': 'Bearer dummy-token'
        }
      });
      
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Route exists (401 = auth required)');
      } else if (response.status === 404) {
        console.log('   ❌ Route not found');
      } else {
        console.log('   ✅ Route exists');
      }
    } catch (error) {
      console.log('   ❌ Network error:', error.message);
    }
    
    // Test 2: Check if chat history endpoint exists
    console.log('2. Testing GET /api/chat/{chatId}/history...');
    try {
      const response = await fetch(`${API_BASE_URL}/chat/test-chat/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token'
        }
      });
      
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Route exists (401 = auth required)');
      } else if (response.status === 404) {
        console.log('   ❌ Route not found');
      } else {
        console.log('   ✅ Route exists');
      }
    } catch (error) {
      console.log('   ❌ Network error:', error.message);
    }
    
    // Test 3: Check if send message endpoint exists
    console.log('3. Testing POST /api/chat/send...');
    try {
      const response = await fetch(`${API_BASE_URL}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token'
        },
        body: JSON.stringify({
          chatId: 'test-chat',
          message: 'test message'
        })
      });
      
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Route exists (401 = auth required)');
      } else if (response.status === 404) {
        console.log('   ❌ Route not found');
      } else {
        console.log('   ✅ Route exists');
      }
    } catch (error) {
      console.log('   ❌ Network error:', error.message);
    }
    
    console.log('\n🎯 Summary:');
    console.log('The chat API routes should now be properly mapped.');
    console.log('Frontend routes fixed:');
    console.log('  - /chat/{chatId}/messages → /chat/{chatId}/history');
    console.log('  - /chat/{chatId}/message → /chat/send');
    console.log('  - /typing/* → /chat/{chatId}/typing/*');
    
  } catch (error) {
    console.error('❌ Error testing chat routes:', error.message);
  }
}

// Run the test if this is executed directly
if (typeof window === 'undefined') {
  testChatRoutes();
}