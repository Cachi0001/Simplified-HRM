// Trigger the Vercel cron endpoint manually
const API_URL = 'https://go3nethrm-backend.vercel.app/api';
const CRON_SECRET = process.env.CRON_SECRET || ''; // Optional - set in Vercel env vars

async function triggerCheckoutCron() {
  console.log('🔔 Triggering checkout reminder cron endpoint...\n');
  
  try {
    // First check if endpoint exists
    console.log('🔍 Checking if cron endpoint exists...');
    const healthCheck = await fetch(`${API_URL}/cron/health`);
    
    if (!healthCheck.ok) {
      console.error('❌ Cron endpoint not found!');
      console.error('');
      console.error('The /api/cron routes have not been deployed yet.');
      console.error('');
      console.error('📋 To deploy:');
      console.error('  1. cd backend');
      console.error('  2. npm run build');
      console.error('  3. git add .');
      console.error('  4. git commit -m "Add cron routes"');
      console.error('  5. git push');
      console.error('');
      console.error('⏰ Or use the existing endpoint:');
      console.error('  POST /api/notifications/checkout-reminders');
      console.error('  (Requires admin authentication)');
      process.exit(1);
    }
    
    console.log('✅ Endpoint exists!\n');
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authorization if CRON_SECRET is set
    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`;
    }
    
    console.log('📤 Sending request to cron endpoint...');
    const response = await fetch(`${API_URL}/cron/checkout-reminders`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      } else {
        throw new Error(`HTTP ${response.status} - Endpoint returned HTML instead of JSON`);
      }
    }
    
    const result = await response.json();
    
    console.log('\n✅ Success!');
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
