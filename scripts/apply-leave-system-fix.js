const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyFix() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  COMPREHENSIVE LEAVE SYSTEM FIX');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📖 Reading SQL file...');
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/fix_leave_system_comprehensive.sql'),
      'utf8'
    );
    
    console.log('🔧 Applying fixes to database...\n');
    await pool.query(sql);
    
    console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  WHAT WAS FIXED:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✓ Each employee gets 7 days TOTAL annual leave');
    console.log('  ✓ All leave types share the same 7-day pool');
    console.log('  ✓ No self-approval (HR/Admin cannot approve own leave)');
    console.log('  ✓ Fixed overlap detection (only checks approved/pending)');
    console.log('  ✓ Weekday calculation (Monday-Friday only)');
    console.log('  ✓ Individual reset to 7 days');
    console.log('  ✓ Bulk reset all employees to 7 days');
    console.log('  ✓ Accurate balance tracking\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('  CURRENT EMPLOYEE BALANCES:');
    console.log('═══════════════════════════════════════════════════════');
    
    const result = await pool.query(`
      SELECT 
        full_name,
        total_annual_leave,
        used_annual_leave,
        remaining_annual_leave,
        status
      FROM employees
      WHERE status = 'active'
      ORDER BY full_name
    `);
    
    if (result.rows.length === 0) {
      console.log('  No active employees found\n');
    } else {
      result.rows.forEach(emp => {
        console.log(`  ${emp.full_name.padEnd(30)} | Total: ${emp.total_annual_leave} | Used: ${emp.used_annual_leave} | Remaining: ${emp.remaining_annual_leave}`);
      });
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('  TESTING FUNCTIONS:');
    console.log('═══════════════════════════════════════════════════════');
    
    // Test weekday calculation
    const weekdayTest = await pool.query(`
      SELECT calculate_weekdays('2025-11-17'::DATE, '2025-11-21'::DATE) as weekdays
    `);
    console.log(`  ✓ Weekday calculation: Nov 17-21, 2025 = ${weekdayTest.rows[0].weekdays} weekdays`);
    
    // Test get_leave_balances
    if (result.rows.length > 0) {
      const firstEmployee = await pool.query(`
        SELECT id FROM employees WHERE status = 'active' LIMIT 1
      `);
      
      if (firstEmployee.rows.length > 0) {
        const balanceTest = await pool.query(`
          SELECT * FROM get_leave_balances($1, NULL)
        `, [firstEmployee.rows[0].id]);
        
        if (balanceTest.rows.length > 0) {
          const bal = balanceTest.rows[0];
          console.log(`  ✓ Get balance function: ${bal.leave_type} - ${bal.remaining_days}/${bal.total_days} days`);
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  LEAVE SYSTEM IS NOW READY! 🎉');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR APPLYING FIX:');
    console.error('═══════════════════════════════════════════════════════');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('═══════════════════════════════════════════════════════\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyFix();
