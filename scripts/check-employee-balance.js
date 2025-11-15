const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function checkBalance() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 CHECKING CALEB\'S BALANCE...\n');
    
    const result = await client.query(`
      SELECT 
        id,
        full_name,
        email,
        total_annual_leave,
        used_annual_leave,
        remaining_annual_leave
      FROM employees
      WHERE email = 'calebonyemechi0@gmail.com'
    `);
    
    if (result.rows.length > 0) {
      const emp = result.rows[0];
      console.log('Employee:', emp.full_name);
      console.log('Email:', emp.email);
      console.log('Total Annual Leave:', emp.total_annual_leave);
      console.log('Used Annual Leave:', emp.used_annual_leave);
      console.log('Remaining Annual Leave:', emp.remaining_annual_leave);
      
      // Check pending requests
      const pending = await client.query(`
        SELECT 
          id,
          leave_type,
          days_requested,
          start_date,
          end_date,
          status
        FROM leave_requests
        WHERE employee_id = $1
        AND status = 'pending'
        ORDER BY start_date
      `, [emp.id]);
      
      console.log('\nPending Requests:', pending.rows.length);
      pending.rows.forEach(req => {
        console.log(`  - ${req.leave_type}: ${req.days_requested} days (${req.start_date.toISOString().split('T')[0]} to ${req.end_date.toISOString().split('T')[0]})`);
      });
      
      const pendingDays = pending.rows.reduce((sum, req) => sum + req.days_requested, 0);
      console.log('\nTotal Pending Days:', pendingDays);
      console.log('Available Days:', emp.remaining_annual_leave - pendingDays);
    } else {
      console.log('Employee not found');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBalance();
