const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testApproval() {
  try {
    console.log('Testing leave request approval...');
    
    // Create a test JWT token with admin role
    const testPayload = {
      sub: 'fc34bcd5-8efa-4547-aad2-223a93518ef9', // Use a real employee ID
      email: 'test@example.com',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };
    
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(testPayload, secret);
    
    // Use a real leave request ID from the previous test
    const leaveRequestId = 'a1f09a52-e228-4061-88ed-287073a41c60';
    
    console.log('Attempting to approve leave request:', leaveRequestId);
    
    // Test approval endpoint
    const response = await axios.put(`http://localhost:3000/api/leave-requests/${leaveRequestId}/approve`, {
      approval_comments: 'Approved via API test'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Approval response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Approval error:', error.response?.data || error.message);
    if (error.response) {
      console.log('Full error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
  }
}

testApproval();