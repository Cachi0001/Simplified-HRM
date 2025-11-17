const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyNotifications() {
  try {
    console.log('Adding task due notifications system...\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/add_task_due_notifications.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Task due notifications system added!');
    console.log('\nFeatures:');
    console.log('  • Notifies assignee when task is due within 1 hour');
    console.log('  • Notifies creator when their assigned task is due');
    console.log('  • Prevents duplicate notifications');
    console.log('  • Handles both date-only and date+time tasks');
    console.log('\n✅ Cron job configured to run every 15 minutes automatically');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

applyNotifications();
