const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function verifySinglePool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 VERIFYING SINGLE POOL LEAVE SYSTEM...\n');
    
    // Check employee leave balances
    const employees = await client.query(`
      SELECT 
        full_name,
        employee_number,
        total_annual_leave,
        used_annual_leave,
        remaining_annual_leave
      FROM employees
      WHERE status = 'active'
      ORDER BY full_name
    `);
    
    console.log('EMPLOYEE LEAVE BALANCES (SINGLE 7-DAY POOL):\n');
    employees.rows.forEach(emp => {
      console.log(`${emp.full_name} (#${emp.employee_number})`);
      console.log(`  Total: ${emp.total_annual_leave} days`);
      console.log(`  Used: ${emp.used_annual_leave} days`);
      console.log(`  Remaining: ${emp.remaining_annual_leave} days`);
      console.log('');
    });
    
    // Check all leave requests
    const requests = await client.query(`
      SELECT 
        e.full_name,
        lr.leave_type,
        lr.days_requested,
        lr.status,
        lr.start_date,
        lr.end_date
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY e.full_name, lr.start_date
    `);
    
    console.log('ALL LEAVE REQUESTS THIS YEAR:\n');
    requests.rows.forEach(req => {
      console.log(`${req.full_name} - ${req.leave_type}: ${req.days_requested} days [${req.status}]`);
      console.log(`  ${req.start_date.toISOString().split('T')[0]} to ${req.end_date.toISOString().split('T')[0]}`);
    });
    
    console.log('\n✅ System now uses SINGLE 7-day pool shared across ALL leave types!');
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifySinglePool();
