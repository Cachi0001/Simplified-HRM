const { Pool } = require('../backend/node_modules/pg');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function verifyLeaveSystem() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 VERIFYING LEAVE SYSTEM...\n');
    const client = await pool.connect();

    // 1. Check leave types and their limits
    console.log('1️⃣ LEAVE TYPES AND LIMITS:');
    const leaveTypes = await client.query(`
      SELECT id, name, description, default_days_per_year, requires_approval, is_active 
      FROM leave_types 
      ORDER BY name
    `);
    console.log('Leave types:', JSON.stringify(leaveTypes.rows, null, 2));
    console.log('');

    // 2. Check leave balances for active employees
    console.log('2️⃣ LEAVE BALANCES:');
    const balances = await client.query(`
      SELECT lb.*, e.full_name, e.email
      FROM leave_balances lb
      JOIN employees e ON lb.employee_id = e.id
      WHERE e.status = 'active'
      ORDER BY e.full_name, lb.leave_type
    `);
    console.log('Leave balances:', JSON.stringify(balances.rows, null, 2));
    console.log('');

    // 3. Check leave requests
    console.log('3️⃣ LEAVE REQUESTS:');
    const requests = await client.query(`
      SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.days_requested, 
             lr.status, e.full_name, e.email
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      ORDER BY lr.created_at DESC
      LIMIT 5
    `);
    console.log('Recent leave requests:', JSON.stringify(requests.rows, null, 2));
    console.log('');

    // 4. Check leave-related functions
    console.log('4️⃣ LEAVE FUNCTIONS:');
    const functions = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname LIKE '%leave%'
      AND proname NOT LIKE 'pg_%'
      ORDER BY proname
    `);
    console.log('Leave functions:', functions.rows);
    console.log('');

    // 5. Check approve_employee function
    console.log('5️⃣ APPROVE EMPLOYEE FUNCTION:');
    const approveFunc = await client.query(`
      SELECT proname, pronargs, prosrc 
      FROM pg_proc 
      WHERE proname = 'approve_employee'
    `);
    if (approveFunc.rows.length > 0) {
      console.log('approve_employee exists with', approveFunc.rows[0].pronargs, 'arguments');
      console.log('Function source (first 500 chars):', approveFunc.rows[0].prosrc.substring(0, 500));
    } else {
      console.log('⚠️  approve_employee function NOT FOUND');
    }
    console.log('');

    // 6. Check reset functions
    console.log('6️⃣ RESET FUNCTIONS:');
    const resetFuncs = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname LIKE '%reset%'
      ORDER BY proname
    `);
    console.log('Reset functions:', resetFuncs.rows);
    console.log('');

    // 7. Test create_leave_request validation
    console.log('7️⃣ TESTING LEAVE REQUEST VALIDATION:');
    try {
      // Get an active employee
      const emp = await client.query(`SELECT id FROM employees WHERE status = 'active' LIMIT 1`);
      if (emp.rows.length > 0) {
        const empId = emp.rows[0].id;
        console.log('Testing with employee ID:', empId);
        
        // Try to create a leave request for 10 days (should fail if limit is 7)
        const testResult = await client.query(`
          SELECT create_leave_request($1, $2, $3, $4, $5, $6) as result
        `, [empId, 'Annual Leave', '2025-12-01', '2025-12-15', 'Test validation', null]);
        
        console.log('Test result:', testResult.rows[0].result);
      }
    } catch (error) {
      console.log('Validation test error:', error.message);
    }
    console.log('');

    console.log('✅ VERIFICATION COMPLETE\n');
    
    client.release();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

verifyLeaveSystem();
