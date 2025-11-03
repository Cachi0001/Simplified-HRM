const axios = require('axios');

async function testLeaveAPI() {
  try {
    console.log('Testing leave requests API...');
    
    // Test without authentication first to see the error
    const response = await axios.get('http://localhost:3000/api/leave-requests');
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }
}

testLeaveAPI();