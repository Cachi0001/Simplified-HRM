const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function syncBalances() {
  try {
    console.log('Syncing leave_balances to employees table...\n');
    
    // Get current year
    const year = new Date().getFullYear();
    
    // Update all employees with their current leave balance
    const result = await pool.query(`
      UPDATE employees e
      SET 
        total_annual_leave = COALESCE(lb.total_days, 7),
        used_annual_leave = COALESCE(lb.used_days, 0),
        remaining_annual_leave = COALESCE(lb.remaining_days, 7),
        updated_at = NOW()
      FROM (
        SELECT 
          employee_id,
          SUM(total_days) as total_days,
          SUM(used_days) as used_days,
          SUM(remaining_days) as remaining_days
        FROM leave_balances
        WHERE year = $1
        GROUP BY employee_id
      ) lb
      WHERE e.id = lb.employee_id
      RETURNING e.id, e.full_name, e.total_annual_leave, e.used_annual_leave, e.remaining_annual_leave
    `, [year]);
    
    console.log(`✅ Synced ${result.rows.length} employees\n`);
    
    result.rows.forEach(emp => {
      console.log(`${emp.full_name}: ${emp.remaining_annual_leave}/${emp.total_annual_leave} days remaining`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

syncBalances();
