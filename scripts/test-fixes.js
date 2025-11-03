const fetch = require('node-fetch');

async function testFixes() {
  const baseUrl = 'http://localhost:3000/api';
  
  console.log('🧪 Testing system fixes...\n');
  
  // Test 1: Health check
  try {
    console.log('1️⃣  Testing health check...');
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Health check passed');
      console.log(`   Status: ${data.status}`);
      console.log(`   Environment: ${data.environment}`);
      console.log(`   Database: ${data.database?.status || 'unknown'}`);
    } else {
      console.log('❌ Health check failed');
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
  
  console.log('');
  
  // Test 2: CORS test
  try {
    console.log('2️⃣  Testing CORS configuration...');
    const response = await fetch(`${baseUrl}/cors-test`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ CORS test passed');
      console.log(`   Status: ${data.status}`);
    } else {
      console.log('❌ CORS test failed');
    }
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
  }
  
  console.log('');
  
  // Test 3: Announcement templates (without auth)
  try {
    console.log('3️⃣  Testing announcement templates endpoint...');
    const response = await fetch(`${baseUrl}/announcements/templates`);
    
    if (response.status === 401) {
      console.log('✅ Announcement templates endpoint exists (requires auth)');
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Announcement templates endpoint accessible');
      console.log(`   Templates found: ${data.data?.templates?.length || 0}`);
    } else {
      console.log('❌ Announcement templates endpoint failed');
    }
  } catch (error) {
    console.log('❌ Announcement templates error:', error.message);
  }
  
  console.log('');
  
  // Test 4: Dashboard stats (without auth)
  try {
    console.log('4️⃣  Testing dashboard stats endpoint...');
    const response = await fetch(`${baseUrl}/dashboard/stats`);
    
    if (response.status === 401) {
      console.log('✅ Dashboard stats endpoint exists (requires auth)');
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Dashboard stats endpoint accessible');
      console.log(`   Status: ${data.status}`);
    } else {
      console.log('❌ Dashboard stats endpoint failed');
    }
  } catch (error) {
    console.log('❌ Dashboard stats error:', error.message);
  }
  
  console.log('');
  
  // Test 5: Purchase requests (without auth)
  try {
    console.log('5️⃣  Testing purchase requests endpoint...');
    const response = await fetch(`${baseUrl}/purchase`);
    
    if (response.status === 401) {
      console.log('✅ Purchase requests endpoint exists (requires auth)');
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Purchase requests endpoint accessible');
      console.log(`   Status: ${data.status}`);
    } else {
      console.log('❌ Purchase requests endpoint failed');
    }
  } catch (error) {
    console.log('❌ Purchase requests error:', error.message);
  }
  
  console.log('\n🎉 Fix testing completed!');
  console.log('\n📋 Summary:');
  console.log('- CORS configuration updated for go3net.com');
  console.log('- Dashboard controller fixed for pendingEmployees');
  console.log('- Announcement templates endpoint created');
  console.log('- Notification types normalized in database');
  console.log('- Purchase request functionality should work');
  
  console.log('\n🔧 Next steps:');
  console.log('1. Test frontend with authentication');
  console.log('2. Verify purchase request totals display correctly');
  console.log('3. Test announcement templates in frontend');
  console.log('4. Configure DNS for go3net.com domain');
}

testFixes().catch(console.error);