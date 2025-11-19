// Trigger the Vercel cron endpoint manually
const API_URL = 'https://go3nethrm-backend.vercel.app/api';
const CRON_SECRET = process.env.CRON_SECRET || ''; // Optional - set in Vercel env vars

async function triggerCheckoutCron() {
  console.log('🔔 Triggering checkout reminder cron endpoint...\n');
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authorization if CRON_SECRET is set
    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }
    
    const response = await fetch(`${API_URL}/cron/checkout-reminders`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Success!');
    console.log(`📊 ${result.message}`);
    console.log(`📧 Sent to ${result.count} employee(s)`);
    console.log(`⏰ Timestamp: ${result.timestamp}\n`);
    
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

triggerCheckoutCron();
