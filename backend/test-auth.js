async function testAuth() {
  console.log('=== Testing Authentication ===\n');

  // Test 1: Employee login (passioncaleb5@gmail.com)
  console.log('1. Testing employee login: passioncaleb5@gmail.com');
  try {
    const response1 = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'passioncaleb5@gmail.com',
        password: 'TestPassword123!'
      })
    });

    const result1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Admin login (kayode@go3net.com.ng)
  console.log('2. Testing admin login: kayode@go3net.com.ng');
  try {
    const response2 = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'kayode@go3net.com.ng',
        password: 'TestPassword123!'
      })
    });

    const result2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Check pending approvals (if admin login works)
  console.log('3. Testing pending approvals endpoint');
  try {
    const response3 = await fetch('http://localhost:3000/api/employees/pending', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Response:', JSON.stringify(result3, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testAuth();
