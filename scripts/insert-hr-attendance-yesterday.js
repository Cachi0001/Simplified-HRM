const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

// Use direct connection (not pgbouncer) for scripts
const directUrl = process.env.DATABASE_URL?.replace('?pgbouncer=true', '');

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false }
});

async function insertHRAttendanceYesterday() {
  const client = await pool.connect();
  
  try {
    console.log('Inserting HR attendance for yesterday...\n');
    
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    console.log(`Date: ${yesterdayDate} (${yesterday.toDateString()})\n`);
    
    // Find HR employee
    const hrQuery = await client.query(`
      SELECT e.id, e.full_name, e.email, e.role, e.department_id
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
    
    // Check if attendance already exists for yesterday
    const existingCheck = await client.query(`
      SELECT id, clock_in, clock_out 
      FROM attendance 
      WHERE employee_id = $1 AND date = $2
    `, [hrEmployee.id, yesterdayDate]);
    
    if (existingCheck.rows.length > 0) {
      console.log('⚠️  Attendance record already exists for yesterday:');
      console.log(`   Clock In: ${existingCheck.rows[0].clock_in}`);
      console.log(`   Clock Out: ${existingCheck.rows[0].clock_out}`);
      console.log('\nDeleting existing record...');
      
      await client.query(`
        DELETE FROM attendance 
        WHERE employee_id = $1 AND date = $2
      `, [hrEmployee.id, yesterdayDate]);
      
      console.log('✅ Deleted existing record\n');
    }
    
    // Get working hours config for late calculation
    const configQuery = await client.query(`
      SELECT late_threshold_time 
      FROM working_hours_config 
      LIMIT 1
    `);
    
    const lateThreshold = configQuery.rows[0]?.late_threshold_time || '09:00:00';
    console.log(`Late threshold: ${lateThreshold}\n`);
    
    // Create timestamps for yesterday
    const clockInTime = new Date(yesterday);
    clockInTime.setHours(7, 50, 0, 0); // 7:50 AM
    
    const clockOutTime = new Date(yesterday);
    clockOutTime.setHours(17, 0, 0, 0); // 5:00 PM
    
    // Calculate hours worked
    const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);
    
    // Check if late (7:50 AM is before 9:00 AM, so not late)
    const clockInTimeOnly = '07:50:00';
    const isLate = clockInTimeOnly > lateThreshold;
    const lateMinutes = isLate ? 0 : 0; // Not late
    
    console.log('Attendance details:');
    console.log(`   Clock In: ${clockInTime.toISOString()} (7:50 AM)`);
    console.log(`   Clock Out: ${clockOutTime.toISOString()} (5:00 PM)`);
    console.log(`   Hours Worked: ${hoursWorked.toFixed(2)} hours`);
    console.log(`   Status: ${isLate ? 'Late' : 'On Time'}`);
    console.log(`   Late Minutes: ${lateMinutes}\n`);
    
    // Get office location from config
    const officeQuery = await client.query(`
      SELECT office_lat, office_lng 
      FROM working_hours_config 
      LIMIT 1
    `);
    
    const officeLat = officeQuery.rows[0]?.office_lat || 6.5244;
    const officeLng = officeQuery.rows[0]?.office_lng || 3.3792;
    
    // Insert attendance record
    const insertResult = await client.query(`
      INSERT INTO attendance (
        employee_id,
        date,
        clock_in,
        clock_out,
        clock_in_lat,
        clock_in_lng,
        clock_in_address,
        clock_out_lat,
        clock_out_lng,
        clock_out_address,
        hours_worked,
        status,
        is_late,
        late_minutes,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *
    `, [
      hrEmployee.id,
      yesterdayDate,
      clockInTime.toISOString(),
      clockOutTime.toISOString(),
      officeLat,
      officeLng,
      'Office Location',
      officeLat,
      officeLng,
      'Office Location',
      hoursWorked,
      isLate ? 'late' : 'present',
      isLate,
      lateMinutes,
      'Manual entry - arrived on time at 7:50 AM, left at 5:00 PM'
    ]);
    
    console.log('✅ Successfully inserted attendance record!');
    console.log('\nRecord details:');
    console.log(JSON.stringify(insertResult.rows[0], null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.stack) console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

insertHRAttendanceYesterday();
