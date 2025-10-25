// Using built-in fetch API
async function testApiConnection() {
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    const healthData = await healthResponse.json();
    console.log('Health endpoint response:', healthData);
    
    // Test signup endpoint
    console.log('\nTesting signup endpoint...');
    const signupResponse = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User'
      })
    });
    
    const signupData = await signupResponse.json();
    console.log('Signup endpoint response:', signupData);
    console.log('Signup status code:', signupResponse.status);
    
    // Test CORS test endpoint
    console.log('\nTesting CORS test endpoint...');
    const corsResponse = await fetch('http://localhost:3000/api/cors-test', {
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });
    const corsData = await corsResponse.json();
    console.log('CORS test response:', corsData);
    
  } catch (error) {
    console.error('Error testing API connection:', error);
  }
}

testApiConnection();