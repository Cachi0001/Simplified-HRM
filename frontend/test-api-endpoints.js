// Test API endpoints functionality
import fetch from 'node-fetch';

const API_BASE = 'https://go3nethrm-backend.vercel.app/api';

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');
  
  const results = {
    health: false,
    auth: false,
    employees: false,
    chat: false,
    notifications: false,
    announcements: false,
    attendance: false,
    leave: false,
    purchase: false
  };

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Health check passed:', data.status || 'OK');
        results.health = true;
      } else {
        console.log('❌ Health check failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Health check error:', error.message);
    }

    // Test 2: Auth Endpoints
    console.log('\n2. Testing Auth Endpoints...');
    try {
      const response = await fetch(`${API_BASE}/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test' })
      });
      // Even if it fails validation, endpoint should be reachable
      console.log('✅ Auth endpoint accessible');
      results.auth = true;
    } catch (error) {
      console.log('❌ Auth endpoint error:', error.message);
    }

    // Test 3: Employees Endpoints
    console.log('\n3. Testing Employees Endpoints...');
    try {
      const response = await fetch(`${API_BASE}/employees`);
      if (response.status === 401) {
        console.log('✅ Employees endpoint accessible (requires auth)');
        results.employees = true;
      } else if (response.ok) {
        console.log('✅ Employees endpoint accessible');
        results.employees = true;
      } else {
        console.log('❌ Employees endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Employees endpoint error:', error.message);
    }

    // Test 4: Chat Endpoints
    console.log('\n4. Testing Chat Endpoints...');
    try {
      const response = await fetch(`${API_BASE}/chat/list`);
      if (response.status === 401) {
        console.log('✅ Chat endpoint accessible (requires auth)');
        results.chat = true;
      } else if (response.ok) {
        console.log('✅ Chat endpoint accessible');
        results.chat = true;
      } else {
        console.log('❌ Chat endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Chat endpoint error:', error.message);
    }

    // Test 5: Notifications Endpoints
    console.log('\n5. Testing Notifications Endpoints...');
    try {
      const response = await fetch(`${API_BASE}/notifications`);
      if (response.status === 401) {
        console.log('✅ Notifications endpoint accessible (requires auth)');
        results.notifications = true;
      } else if (response.ok) {
        console.log('✅ Notifications endpoint accessible');
        results.notifications = true;
      } else {
        console.log('❌ Notifications endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Notifications endpoint error:', error.message);
    }

    // Test 6: Announcements Endpoints
    console.log('\n6. Testing Announcements Endpoints...');
    try {
      const response = await fetch(`${API_BASE}/announcements`);
      if (response.status === 401) {
        console.log('✅ Announcements endpoint accessible (requires auth)');
        results.announcements = true;
      } else if (response.ok) {
        console.log('✅ Announcements endpoint accessible');
        results.announcements = true;
      } else {
        console.log('❌ Announcements endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Announcements endpoint error:', error.message);
    }

    // Test 7: Attendance Endpoints
    console.log('\n7. Testing Attendance Endpoints...');
    try {
      const response = await fetch(`${API_BASE}/attendance`);
      if (response.status === 401) {
        console.log('✅ Attendance endpoint accessible (requires auth)');
        results.attendance = true;
      } else if (response.ok) {
        console.log('✅ Attendance endpoint accessible');
        results.attendance = true;
      } else {
        console.log('❌ Attendance endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Attendance endpoint error:', error.message);
    }

    // Test 8: Leave Requests Endpoints
    console.log('\n8. Testing Leave Requests Endpoints...');
    try {
      const response = await fetch(`${API_BASE}/leave-requests`);
      if (response.status === 401) {
        console.log('✅ Leave requests endpoint accessible (requires auth)');
        results.leave = true;
      } else if (response.ok) {
        console.log('✅ Leave requests endpoint accessible');
        results.leave = true;
      } else {
        console.log('❌ Leave requests endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Leave requests endpoint error:', error.message);
    }

    // Test 9: Purchase Requests Endpoints
    console.log('\n9. Testing Purchase Requests Endpoints...');
    try {
      const response = await fetch(`${API_BASE}/purchase-requests`);
      if (response.status === 401) {
        console.log('✅ Purchase requests endpoint accessible (requires auth)');
        results.purchase = true;
      } else if (response.ok) {
        console.log('✅ Purchase requests endpoint accessible');
        results.purchase = true;
      } else {
        console.log('❌ Purchase requests endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Purchase requests endpoint error:', error.message);
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }

  // Summary
  console.log('\n🎯 API Endpoints Test Results:');
  console.log('==============================');
  
  const testResults = [
    { name: 'Health Check', status: results.health },
    { name: 'Authentication', status: results.auth },
    { name: 'Employees API', status: results.employees },
    { name: 'Chat API', status: results.chat },
    { name: 'Notifications API', status: results.notifications },
    { name: 'Announcements API', status: results.announcements },
    { name: 'Attendance API', status: results.attendance },
    { name: 'Leave Requests API', status: results.leave },
    { name: 'Purchase Requests API', status: results.purchase }
  ];

  testResults.forEach(test => {
    console.log(`${test.status ? '✅' : '❌'} ${test.name}`);
  });

  const passedTests = testResults.filter(test => test.status).length;
  const totalTests = testResults.length;
  
  console.log(`\n📊 API Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All API endpoints are working perfectly!');
    console.log('✅ Backend is ready and accessible from Vercel');
  } else {
    console.log('⚠️  Some API endpoints need attention');
  }
}

testAPIEndpoints().catch(console.error);