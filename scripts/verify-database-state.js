const { Pool } = require('../backend/node_modules/pg');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function verifyDatabaseState() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 VERIFYING DATABASE STATE...\n');
    const client = await pool.connect();

    // 1. Check leave types
    console.log('1️⃣ CHECKING LEAVE TYPES:');
    const leaveTypes = await client.query(`
      SELECT name, description, default_days_per_year, is_active 
      FROM leave_types 
      ORDER BY name
    `);
    console.log('Leave types in database:', leaveTypes.rows);
    console.log('');

    // 2. Check rejected employees in employees table
    console.log('2️⃣ CHECKING REJECTED EMPLOYEES:');
    const rejectedEmployees = await client.query(`
      SELECT id, full_name, email, status, role 
      FROM employees 
      WHERE status = 'rejected'
      ORDER BY full_name
    `);
    console.log(`Found ${rejectedEmployees.rows.length} rejected employees:`, rejectedEmployees.rows);
    console.log('');

    // 3. Check if assign_task_with_validation function exists
    console.log('3️⃣ CHECKING TASK FUNCTIONS:');
    const taskFunction = await client.query(`
      SELECT proname, pronargs, prosrc 
      FROM pg_proc 
      WHERE proname = 'assign_task_with_validation'
    `);
    console.log('assign_task_with_validation function exists:', taskFunction.rows.length > 0);
    if (taskFunction.rows.length > 0) {
      console.log('Function has', taskFunction.rows[0].pronargs, 'arguments');
    }
    console.log('');

    // 4. Check notification functions for signup
    console.log('4️⃣ CHECKING SIGNUP NOTIFICATION FUNCTIONS:');
    const signupNotifFunctions = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname LIKE '%signup%' OR proname LIKE '%employee_created%' OR proname LIKE '%new_employee%'
      ORDER BY proname
    `);
    console.log('Signup-related notification functions:', signupNotifFunctions.rows);
    console.log('');

    // 5. Check triggers on employees table
    console.log('5️⃣ CHECKING TRIGGERS ON EMPLOYEES TABLE:');
    const triggers = await client.query(`
      SELECT tgname, tgtype, tgenabled, 
             pg_get_triggerdef(oid) as trigger_definition
      FROM pg_trigger
      WHERE tgrelid = 'employees'::regclass
      AND tgname NOT LIKE 'pg_%'
      ORDER BY tgname
    `);
    console.log('Triggers on employees table:', triggers.rows.map(t => ({
      name: t.tgname,
      enabled: t.tgenabled === 'O' ? 'enabled' : 'disabled'
    })));
    console.log('');

    // 6. Check actual employee statuses distribution
    console.log('6️⃣ EMPLOYEE STATUS DISTRIBUTION:');
    const statusDist = await client.query(`
      SELECT status, COUNT(*) as count
      FROM employees
      GROUP BY status
      ORDER BY count DESC
    `);
    console.log('Employee status distribution:', statusDist.rows);
    console.log('');

    // 7. Check if there's a function that filters employees by status
    console.log('7️⃣ CHECKING EMPLOYEE RETRIEVAL FUNCTIONS:');
    const empFunctions = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname LIKE '%employee%' 
      AND proname LIKE '%get%'
      ORDER BY proname
    `);
    console.log('Employee retrieval functions:', empFunctions.rows);
    console.log('');

    // 8. Test actual query that backend uses to get employees
    console.log('8️⃣ TESTING EMPLOYEE QUERY (what backend should use):');
    const activeEmployees = await client.query(`
      SELECT id, full_name, email, status, role
      FROM employees
      WHERE status = 'active'
      ORDER BY full_name
      LIMIT 5
    `);
    console.log(`Active employees (first 5 of ${activeEmployees.rows.length}):`, activeEmployees.rows);
    console.log('');

    // 9. Check notification triggers
    console.log('9️⃣ CHECKING NOTIFICATION SYSTEM:');
    const notifFunctions = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname LIKE 'notify_%'
      ORDER BY proname
    `);
    console.log('Notification functions:', notifFunctions.rows);
    console.log('');

    // 10. Check if there's a trigger for new employee signup
    console.log('🔟 CHECKING FOR EMPLOYEE SIGNUP TRIGGER:');
    const signupTrigger = await client.query(`
      SELECT tgname, pg_get_triggerdef(oid) as definition
      FROM pg_trigger
      WHERE tgrelid = 'employees'::regclass
      AND (tgname LIKE '%signup%' OR tgname LIKE '%insert%' OR tgname LIKE '%new%')
      AND tgname NOT LIKE 'pg_%'
    `);
    console.log('Employee signup triggers:', signupTrigger.rows);
    console.log('');

    console.log('✅ DATABASE VERIFICATION COMPLETE\n');
    
    client.release();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

verifyDatabaseState();
