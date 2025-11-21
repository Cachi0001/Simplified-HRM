const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

// Use direct connection (not pgbouncer) for scripts
const directUrl = process.env.DATABASE_URL?.replace('?pgbouncer=true', '');

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkoutHRAndDebug() {
  const client = await pool.connect();
  
  try {
    console.log('='.repeat(80));
    console.log('PART 1: CHECKOUT HR AT MIDNIGHT (AUTO-CLOCKOUT)');
    console.log('='.repeat(80));
    console.log();
    
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    console.log(`Processing date: ${yesterdayDate} (${yesterday.toDateString()})\n`);
    
    // Find HR employee
    const hrQuery = await client.query(`
      SELECT e.id, e.full_name, e.email, e.role
      FROM employees e
      WHERE e.role = 'hr' AND e.status = 'active'
      LIMIT 1
    `);
    
    if (hrQuery.rows.length === 0) {
      console.log('❌ No HR employee found');
      return;
    }
    
    const hrEmployee = hrQuery.rows[0];
    console.log('✅ Found HR employee:');
    console.log(`   Name: ${hrEmployee.full_name}`);
    console.log(`   Email: ${hrEmployee.email}`);
    console.log(`   ID: ${hrEmployee.id}\n`);
    
    // Check current attendance status for yesterday
    const attendanceCheck = await client.query(`
      SELECT 
        id,
        date,
        clock_in,
        clock_out,
        hours_worked,
        status,
        is_late,
        late_minutes,
        auto_clocked_out
      FROM attendance 
      WHERE employee_id = $1 AND date = $2
    `, [hrEmployee.id, yesterdayDate]);
    
    if (attendanceCheck.rows.length === 0) {
      console.log('❌ No attendance record found for yesterday');
      console.log('   HR did not clock in yesterday\n');
      return;
    }
    
    const attendance = attendanceCheck.rows[0];
    console.log('📋 Current attendance status:');
    console.log(`   Clock In: ${attendance.clock_in}`);
    console.log(`   Clock Out: ${attendance.clock_out || 'NOT CLOCKED OUT'}`);
    console.log(`   Hours Worked: ${attendance.hours_worked || 'N/A'}`);
    console.log(`   Auto Clocked Out: ${attendance.auto_clocked_out || false}`);
    console.log();
    
    if (attendance.clock_out) {
      console.log('⚠️  HR is already clocked out for yesterday');
      console.log(`   Clock out time: ${attendance.clock_out}`);
      console.log(`   Was auto-clocked out: ${attendance.auto_clocked_out ? 'YES' : 'NO'}\n`);
    } else {
      console.log('🔄 Clocking out HR at midnight (23:59:59)...\n');
      
      // Create midnight timestamp for yesterday
      const midnightTime = new Date(yesterday);
      midnightTime.setHours(23, 59, 59, 999);
      
      // Calculate hours worked
      const clockInTime = new Date(attendance.clock_in);
      const hoursWorked = (midnightTime - clockInTime) / (1000 * 60 * 60);
      
      console.log(`   Clock In: ${clockInTime.toISOString()}`);
      console.log(`   Clock Out (Midnight): ${midnightTime.toISOString()}`);
      console.log(`   Hours Worked: ${hoursWorked.toFixed(2)} hours\n`);
      
      // Get office location
      const officeQuery = await client.query(`
        SELECT office_lat, office_lng 
        FROM working_hours_config 
        LIMIT 1
      `);
      
      const officeLat = officeQuery.rows[0]?.office_lat || 6.5244;
      const officeLng = officeQuery.rows[0]?.office_lng || 3.3792;
      
      // Update attendance with auto-clockout
      const updateResult = await client.query(`
        UPDATE attendance
        SET 
          clock_out = $1,
          clock_out_lat = $2,
          clock_out_lng = $3,
          clock_out_address = $4,
          hours_worked = $5,
          auto_clocked_out = true,
          updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `, [
        midnightTime.toISOString(),
        officeLat,
        officeLng,
        'Auto clock-out at midnight',
        hoursWorked,
        attendance.id
      ]);
      
      console.log('✅ Successfully clocked out HR at midnight!');
      console.log(`   Hours worked: ${hoursWorked.toFixed(2)} hours`);
      console.log(`   Auto clocked out: YES\n`);
    }
    
    console.log('='.repeat(80));
    console.log('PART 2: DEBUGGING AUTO-CLOCKOUT SYSTEM');
    console.log('='.repeat(80));
    console.log();
    
    // Check if auto_clocked_out column exists
    console.log('1️⃣ Checking if auto_clocked_out column exists...');
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendance' 
        AND column_name = 'auto_clocked_out'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('   ✅ auto_clocked_out column exists');
      console.log(`      Type: ${columnCheck.rows[0].data_type}`);
      console.log(`      Nullable: ${columnCheck.rows[0].is_nullable}\n`);
    } else {
      console.log('   ❌ auto_clocked_out column DOES NOT exist');
      console.log('   This is why auto-clockout is not working!\n');
    }
    
    // Check if auto-clockout functions exist
    console.log('2️⃣ Checking if auto-clockout functions exist...');
    const functionsCheck = await client.query(`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname IN ('auto_clockout_at_midnight', 'manual_clockout_all_today')
    `);
    
    if (functionsCheck.rows.length > 0) {
      console.log(`   ✅ Found ${functionsCheck.rows.length} auto-clockout function(s):`);
      functionsCheck.rows.forEach(func => {
        console.log(`      - ${func.proname}`);
      });
      console.log();
    } else {
      console.log('   ❌ No auto-clockout functions found');
      console.log('   Functions need to be created!\n');
    }
    
    // Check for cron job or scheduled task
    console.log('3️⃣ Checking for scheduled auto-clockout...');
    console.log('   ⚠️  Note: Supabase does not support pg_cron by default');
    console.log('   You need to use:');
    console.log('      - Vercel Cron Jobs (if deployed on Vercel)');
    console.log('      - External cron service (like cron-job.org)');
    console.log('      - Manual trigger via API endpoint\n');
    
    // Check recent auto-clockouts
    console.log('4️⃣ Checking recent auto-clockouts...');
    const recentAutoClockouts = await client.query(`
      SELECT 
        e.full_name,
        a.date,
        a.clock_in,
        a.clock_out,
        a.hours_worked,
        a.auto_clocked_out
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.auto_clocked_out = true
        AND a.date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY a.date DESC
      LIMIT 10
    `);
    
    if (recentAutoClockouts.rows.length > 0) {
      console.log(`   ✅ Found ${recentAutoClockouts.rows.length} recent auto-clockouts:`);
      recentAutoClockouts.rows.forEach(row => {
        console.log(`      ${row.full_name} - ${row.date} (${row.hours_worked}h)`);
      });
      console.log();
    } else {
      console.log('   ⚠️  No auto-clockouts found in the last 7 days');
      console.log('   This confirms auto-clockout is not running!\n');
    }
    
    // Check for users who should have been auto-clocked out yesterday
    console.log('5️⃣ Checking who should have been auto-clocked out yesterday...');
    const shouldBeClockout = await client.query(`
      SELECT 
        e.full_name,
        e.email,
        a.clock_in,
        a.clock_out,
        a.auto_clocked_out
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = $1
        AND a.clock_in IS NOT NULL
        AND (a.clock_out IS NULL OR a.auto_clocked_out = false)
    `, [yesterdayDate]);
    
    if (shouldBeClockout.rows.length > 0) {
      console.log(`   ⚠️  Found ${shouldBeClockout.rows.length} user(s) who should have been auto-clocked out:`);
      shouldBeClockout.rows.forEach(row => {
        console.log(`      ${row.full_name} (${row.email})`);
        console.log(`         Clock In: ${row.clock_in}`);
        console.log(`         Clock Out: ${row.clock_out || 'MISSING'}`);
      });
      console.log();
    } else {
      console.log('   ✅ All users were properly clocked out yesterday\n');
    }
    
    console.log('='.repeat(80));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log();
    console.log('To fix auto-clockout:');
    console.log('1. Ensure auto_clocked_out column exists in attendance table');
    console.log('2. Create auto-clockout functions (auto_clockout_at_midnight)');
    console.log('3. Set up a cron job to call the auto-clockout endpoint daily at midnight');
    console.log('4. Test the endpoint: POST /api/cron/auto-clockout');
    console.log();
    
    // Final verification
    console.log('='.repeat(80));
    console.log('FINAL VERIFICATION - HR ATTENDANCE FOR YESTERDAY');
    console.log('='.repeat(80));
    console.log();
    
    const finalCheck = await client.query(`
      SELECT 
        e.full_name,
        e.email,
        a.date,
        a.clock_in,
        a.clock_out,
        a.hours_worked,
        a.status,
        a.is_late,
        a.late_minutes,
        a.auto_clocked_out
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE e.role = 'hr' 
        AND a.date = $1
    `, [yesterdayDate]);
    
    if (finalCheck.rows.length > 0) {
      const record = finalCheck.rows[0];
      console.log('✅ HR Attendance Record:');
      console.log(`   Name: ${record.full_name}`);
      console.log(`   Date: ${record.date}`);
      console.log(`   Clock In: ${record.clock_in}`);
      console.log(`   Clock Out: ${record.clock_out}`);
      console.log(`   Hours Worked: ${record.hours_worked ? parseFloat(record.hours_worked).toFixed(2) : 'N/A'} hours`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Late: ${record.is_late ? 'Yes' : 'No'} (${record.late_minutes} min)`);
      console.log(`   Auto Clocked Out: ${record.auto_clocked_out ? 'YES ✅' : 'NO'}`);
    } else {
      console.log('❌ No attendance record found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.stack) console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkoutHRAndDebug();
