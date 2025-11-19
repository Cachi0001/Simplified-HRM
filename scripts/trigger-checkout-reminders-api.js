// Quick script to trigger checkout reminders via API
// Run this at 6:00 PM to send reminders

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TOKEN = process.env.ADMIN_TOKEN; // Set your admin token

async function triggerCheckoutReminders() {
  console.log('🔔 Triggering checkout reminders via API...\n');
  
  if (!TOKEN) {
    console.error('❌ Error: ADMIN_TOKEN environment variable not set');
    console.log('Usage: ADMIN_TOKEN=your_token node scripts/trigger-checkout-reminders-api.js');
    process.exit(1);
  }
  
  try {
    const response = await fetch(`${API_URL}/notifications/checkout-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Success!');
    console.log(`📊 ${result.message}`);
    console.log(`📧 Sent to ${result.count} employee(s)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

triggerCheckoutReminders();
