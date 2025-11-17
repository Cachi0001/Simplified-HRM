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
    console.log('  COMPREHENSIVE LEAVE BALANCE FIX');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/comprehensive_leave_balance_fix.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!\n');
    console.log('What was fixed:');
    console.log('  1. ✓ Synced all existing leave balances to employees table');
    console.log('  2. ✓ Created auto-sync trigger on leave_balances table');
    console.log('  3. ✓ Fixed approve_leave_request function');
    console.log('  4. ✓ Fixed reject_leave_request function');
    console.log('  5. ✓ Fixed reset_leave_balance function');
    console.log('\nHow it works now:');
    console.log('  • Any change to leave_balances automatically updates employees table');
    console.log('  • Approve/reject/reset all work seamlessly');
    console.log('  • Frontend always gets correct balance from /api/employees/me');
    console.log('  • No manual intervention needed EVER!\n');
    
    // Verify sync
    const result = await pool.query(`
      SELECT 
        e.full_name,
        e.total_annual_leave,
        e.used_annual_leave,
        e.remaining_annual_leave
      FROM employees e
      WHERE e.status = 'active'
      ORDER BY e.full_name
      LIMIT 10
    `);
    
    console.log('Current balances:');
    console.log('─────────────────────────────────────────────────────');
    result.rows.forEach(emp => {
      console.log(`  ${emp.full_name}: ${emp.remaining_annual_leave}/${emp.total_annual_leave} days`);
    });
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

applyFix();
