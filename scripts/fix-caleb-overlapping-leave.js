const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function fixOverlappingLeave() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔧 FIXING CALEB\'S OVERLAPPING LEAVE...\n');
    
    // Get CALEB's overlapping leave requests
    const requests = await client.query(`
      SELECT 
        lr.id,
        lr.leave_type,
        lr.days_requested,
        lr.start_date,
        lr.end_date,
        lr.status
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE e.full_name = 'CALEB KELECHI ONYEMECHI'
      AND lr.status = 'approved'
      AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY lr.start_date
    `);
    
    console.log('CALEB\'S APPROVED LEAVES:\n');
    requests.rows.forEach((req, idx) => {
      console.log(`${idx + 1}. ${req.leave_type}: ${req.days_requested} days`);
      console.log(`   ${req.start_date.toISOString().split('T')[0]} to ${req.end_date.toISOString().split('T')[0]}`);
      console.log(`   ID: ${req.id}`);
      console.log('');
    });
    
    if (requests.rows.length >= 2) {
      // Cancel the second overlapping request (4 days)
      const leaveToCancel = requests.rows[1];
      
      console.log(`Cancelling overlapping leave: ${leaveToCancel.days_requested} days (${leaveToCancel.start_date.toISOString().split('T')[0]} to ${leaveToCancel.end_date.toISOString().split('T')[0]})\n`);
      
      // Get admin user ID
      const admin = await client.query(`
        SELECT id FROM employees WHERE role = 'superadmin' LIMIT 1
      `);
      
      if (admin.rows.length > 0) {
        const result = await client.query(
          `SELECT cancel_approved_leave($1, $2, $3) as result`,
          [leaveToCancel.id, admin.rows[0].id, 'Cancelled due to overlapping dates with another approved leave']
        );
        
        console.log('Result:', result.rows[0].result);
        
        // Check updated balance
        const balance = await client.query(`
          SELECT 
            full_name,
            total_annual_leave,
            used_annual_leave,
            remaining_annual_leave
          FROM employees
          WHERE full_name = 'CALEB KELECHI ONYEMECHI'
        `);
        
        console.log('\n✅ UPDATED BALANCE:');
        const emp = balance.rows[0];
        console.log(`${emp.full_name}`);
        console.log(`  Total: ${emp.total_annual_leave} days`);
        console.log(`  Used: ${emp.used_annual_leave} days`);
        console.log(`  Remaining: ${emp.remaining_annual_leave} days`);
      } else {
        console.log('❌ No admin user found to perform cancellation');
      }
    } else {
      console.log('No overlapping leaves found to cancel');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

fixOverlappingLeave();
