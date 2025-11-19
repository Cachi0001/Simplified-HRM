// Send checkout reminders using the authenticated endpoint
// This works NOW without needing to deploy new code

const API_URL = 'https://go3nethrm-backend.vercel.app';

async function sendReminders() {
  console.log('🔐 Step 1: Logging in as admin...\n');
  
  try {
    // Login
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kayode@go3net.com.ng',
        password: '12345678'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken;
    
    if (!token) {
      console.error('Login response:', JSON.stringify(loginData, null, 2));
      throw new Error('No token in response');
    }
    
    console.log('✅ Login successful!\n');
    
    // Send reminders
    console.log('🔔 Step 2: Sending checkout reminders...\n');
    
    const reminderRes = await fetch(`${API_URL}/notifications/checkout-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!reminderRes.ok) {
      const error = await reminderRes.json();
      throw new Error(error.error || `HTTP ${reminderRes.status}`);
    }
    
    const result = await reminderRes.json();
    
    console.log('✅ Success!');
    console.log(`📊 ${result.message}`);
    console.log(`📧 Sent to ${result.count} employee(s)\n`);
    
    if (result.count === 0) {
      console.log('ℹ️  No employees need reminders - everyone has clocked out!');
    } else {
      console.log('📱 Push notifications sent');
      console.log('📧 Email reminders sent');
      console.log('🔗 Clicking notification takes users to /dashboard#checkin');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

sendReminders();
