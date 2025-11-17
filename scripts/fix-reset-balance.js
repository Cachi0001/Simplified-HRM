const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixReset() {
  try {
    console.log('Fixing reset_leave_balance function...\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/fix_reset_leave_balance_sync.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Function updated successfully!');
    console.log('\nNow reset_leave_balance will update:');
    console.log('  1. leave_balances table');
    console.log('  2. employees table columns (total_annual_leave, used_annual_leave, remaining_annual_leave)');
    console.log('  3. Frontend will get correct balance from /api/employees/me');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixReset();
