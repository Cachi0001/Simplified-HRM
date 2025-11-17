const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyFix() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  COMPREHENSIVE TASK SYSTEM UPDATE');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/add_task_due_time_and_tracking.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ DATABASE UPDATED SUCCESSFULLY!\n');
    console.log('Changes applied:');
    console.log('  1. ✓ Added due_time column to tasks table');
    console.log('  2. ✓ Added completed_before_due tracking column');
    console.log('  3. ✓ Created auto-tracking trigger for early completion');
    console.log('  4. ✓ Updated performance metrics to track early completions');
    console.log('\nNew features:');
    console.log('  • Tasks can now have optional due time');
    console.log('  • System tracks if tasks completed before due date+time');
    console.log('  • Performance metrics show early completion rate');
    console.log('  • Validation prevents past dates/times');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

applyFix();
