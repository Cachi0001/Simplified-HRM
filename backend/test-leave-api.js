const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testLeaveAPI() {
  try {
    console.log('Testing leave requests API with admin role...');
    
    // Create a test JWT token with admin role to see all requests
    const testPayload = {
      sub: 'fc34bcd5-8efa-4547-aad2-223a93518ef9', // Use a real employee ID
      email: 'test@example.com',
      role: 'admin', // Use admin role to see all requests
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };
    
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(testPayload, secret);
    
    console.log('Generated token for testing...');
    console.log('Token payload:', testPayload);
    
    // Test leave requests endpoint
    const response = await axios.get('http://localhost:3000/api/leave-requests', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Leave requests API response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.leaveRequests && response.data.data.leaveRequests.length > 0) {
      console.log('\n📋 First leave request details:');
      console.log(JSON.stringify(response.data.data.leaveRequests[0], null, 2));
    }
  } catch (error) {
    console.log('❌ Leave requests API error:', error.response?.data || error.message);
    if (error.response) {
      console.log('Full error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
  }
}

testLeaveAPI();