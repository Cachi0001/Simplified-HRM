const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function debugLeaveBalance() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 DEBUGGING LEAVE BALANCE CALCULATION...\n');
    
    // Get all employees with their leave balances
    const result = await client.query(`
      SELECT 
        e.id,
        e.full_name,
        e.employee_number,
        lb.leave_type,
        lb.total_days,
        lb.used_days,
        lb.remaining_days,
        lb.year,
        (
          SELECT COUNT(*) 
          FROM leave_requests lr 
          WHERE lr.employee_id = e.id 
          AND lr.leave_type = lb.leave_type 
          AND lr.status = 'pending'
          AND EXTRACT(YEAR FROM lr.start_date) = lb.year
        ) as pending_requests,
        (
          SELECT COALESCE(SUM(lr.days_requested), 0)
          FROM leave_requests lr 
          WHERE lr.employee_id = e.id 
          AND lr.leave_type = lb.leave_type 
          AND lr.status = 'pending'
          AND EXTRACT(YEAR FROM lr.start_date) = lb.year
        ) as pending_days,
        (
          SELECT COALESCE(SUM(lr.days_requested), 0)
          FROM leave_requests lr 
          WHERE lr.employee_id = e.id 
          AND lr.leave_type = lb.leave_type 
          AND lr.status = 'approved'
          AND EXTRACT(YEAR FROM lr.start_date) = lb.year
        ) as approved_days
      FROM employees e
      JOIN leave_balances lb ON e.id = lb.employee_id
      WHERE e.status = 'active'
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY e.full_name, lb.leave_type
    `);
    
    console.log('LEAVE BALANCE DETAILS:\n');
    result.rows.forEach(row => {
      console.log(`Employee: ${row.full_name} (#${row.employee_number})`);
      console.log(`Leave Type: ${row.leave_type}`);
      console.log(`Total Days: ${row.total_days}`);
      console.log(`Used Days: ${row.used_days}`);
      console.log(`Remaining Days: ${row.remaining_days}`);
      console.log(`Pending Requests: ${row.pending_requests} (${row.pending_days} days)`);
      console.log(`Approved Days: ${row.approved_days}`);
      console.log(`Calculated Available: ${row.total_days - row.used_days - row.pending_days}`);
      console.log('---');
    });
    
    // Check for any leave requests
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
    
    console.log('\nALL LEAVE REQUESTS THIS YEAR:\n');
    requests.rows.forEach(req => {
      console.log(`${req.full_name} - ${req.leave_type}: ${req.days_requested} days (${req.status})`);
      console.log(`  ${req.start_date} to ${req.end_date}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugLeaveBalance();
