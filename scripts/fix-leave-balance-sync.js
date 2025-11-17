const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixBalanceSync() {
  try {
    console.log('Fixing leave balance synchronization...\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/fix_leave_balance_sync.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Functions updated successfully!');
    console.log('\nChanges applied:');
    console.log('  ✓ approve_leave_request - now updates employees table');
    console.log('  ✓ reject_leave_request - updated for consistency');
    console.log('\nNow when a leave is approved:');
    console.log('  1. leave_balances table is updated');
    console.log('  2. employees table columns are synced');
    console.log('  3. Frontend will show correct balance');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixBalanceSync();
