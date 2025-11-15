const { Pool } = require('../backend/node_modules/pg');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function fixAllIssues() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 CHECKING ALL ISSUES...\n');
    const client = await pool.connect();

    // 1. Check signup notification function
    console.log('1️⃣ SIGNUP NOTIFICATION FUNCTION:');
    const notifFunc = await client.query(`
      SELECT prosrc FROM pg_proc WHERE proname = 'notify_admins_new_registration'
    `);
    console.log('Function source:', notifFunc.rows[0].prosrc.substring(0, 500));
    console.log('');

    // 2. Check who gets notifications
    console.log('2️⃣ WHO SHOULD GET NOTIFICATIONS:');
    const admins = await client.query(`
      SELECT e.id, e.full_name, e.email, e.role, e.status
      FROM employees e
      WHERE e.role IN ('superadmin', 'admin', 'hr')
      AND e.status = 'active'
    `);
    console.log('Admins who should get notifications:', admins.rows);
    console.log('');

    // 3. Check notification metadata structure
    console.log('3️⃣ RECENT SIGNUP NOTIFICATIONS:');
    const recentNotifs = await client.query(`
      SELECT n.*, e.full_name, e.role
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      JOIN employees e ON u.id = e.user_id
      WHERE n.title LIKE '%Registration%'
      ORDER BY n.created_at DESC
      LIMIT 5
    `);
    console.log('Recent notifications:', JSON.stringify(recentNotifs.rows, null, 2));
    console.log('');

    // 4. Check attendance/checkin issue
    console.log('4️⃣ CHECKING ATTENDANCE FUNCTIONS:');
    const attendanceFuncs = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname LIKE '%checkin%' OR proname LIKE '%attendance%'
      ORDER BY proname
    `);
    console.log('Attendance functions:', attendanceFuncs.rows);
    console.log('');

    // 5. Check working days for current user
    console.log('5️⃣ CHECKING WORKING DAYS:');
    const workingDays = await client.query(`
      SELECT id, full_name, email, working_days, role
      FROM employees
      WHERE status = 'active'
    `);
    console.log('Employee working days:', JSON.stringify(workingDays.rows, null, 2));
    console.log('');

    console.log('✅ CHECK COMPLETE\n');
    
    client.release();
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

fixAllIssues();
