const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function removeTrigger() {
  try {
    console.log('Removing duplicate task notification trigger...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/remove_duplicate_task_notification_trigger.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Trigger and function removed successfully!');
    
    // Verify
    const check = await pool.query(`
      SELECT tgname 
      FROM pg_trigger
      WHERE tgrelid = 'tasks'::regclass
      AND tgname = 'trigger_task_status_notification'
    `);
    
    if (check.rows.length === 0) {
      console.log('✅ Verified: trigger_task_status_notification no longer exists');
    } else {
      console.log('⚠️  Warning: Trigger still exists');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

removeTrigger();
