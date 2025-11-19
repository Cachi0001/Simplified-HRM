// Login as admin and send checkout reminders
const API_URL = 'https://go3nethrm-backend.vercel.app/api';

async function sendCheckoutReminders() {
  console.log('🔐 Logging in as admin...\n');
  
  try {
    // Step 1: Login
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'kayode@go3net.com.ng',
        password: '12345678'
      })
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      throw new Error(`Login failed: ${error.message || loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data?.accessToken || loginData.accessToken;
    
    if (!token) {
      throw new Error('No access token received from login');
    }
    
    console.log('✅ Login successful!');
    console.log(`👤 User: ${loginData.data?.user?.fullName || 'Admin'}`);
    console.log(`🔑 Token: ${token.substring(0, 20)}...\n`);
    
    // Step 2: Send checkout reminders
    console.log('🔔 Sending checkout reminders...\n');
    
    const reminderResponse = await fetch(`${API_URL}/notifications/checkout-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!reminderResponse.ok) {
      const error = await reminderResponse.json();
      throw new Error(`Failed to send reminders: ${error.error || reminderResponse.statusText}`);
    }
    
    const result = await reminderResponse.json();
    
    console.log('✅ Checkout reminders sent successfully!');
    console.log(`📊 ${result.message}`);
    console.log(`📧 Notifications sent to ${result.count} employee(s)\n`);
    
    if (result.count === 0) {
      console.log('ℹ️  No employees need reminders - everyone has clocked out!');
    } else {
      console.log('📱 Push notifications sent');
      console.log('📧 Email reminders queued');
      console.log('🔗 Clicking notification will take users to /dashboard#checkin');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

sendCheckoutReminders();
