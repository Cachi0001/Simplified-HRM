const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createMockAttendanceForCaleb() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding Caleb\'s employee record...');
    
    // Find Caleb's employee record
    const employeeResult = await client.query(`
      SELECT e.id, e.full_name, e.email, u.email as user_email
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE LOWER(e.full_name) LIKE '%caleb%' OR LOWER(e.email) LIKE '%caleb%'
      LIMIT 1
    `);
    
    if (employeeResult.rows.length === 0) {
      console.log('❌ Caleb not found. Searching for all employees...');
      const allEmployees = await client.query(`
        SELECT id, full_name, email FROM employees ORDER BY full_name
      `);
      console.log('Available employees:');
      allEmployees.rows.forEach(emp => {
        console.log(`  - ${emp.full_name} (${emp.email})`);
      });
      throw new Error('Caleb not found in database');
    }
    
    const caleb = employeeResult.rows[0];
    console.log(`✅ Found Caleb: ${caleb.full_name} (${caleb.email || caleb.user_email})`);
    console.log(`   Employee ID: ${caleb.id}`);
    
    // Get company settings for work hours
    let settings = {
      work_start_time: '08:35:00',
      work_end_time: '17:00:00',
      late_threshold_minutes: 15
    };
    
    try {
      const settingsResult = await client.query(`
        SELECT work_start_time, work_end_time, late_threshold_minutes
        FROM company_settings
        LIMIT 1
      `);
      
      if (settingsResult.rows.length > 0) {
        settings = settingsResult.rows[0];
      }
    } catch (error) {
      console.log('⚠️  Company settings table not found, using defaults');
    }
    
    console.log(`\n⚙️  Company Settings:`);
    console.log(`   Work Start: ${settings.work_start_time}`);
    console.log(`   Work End: ${settings.work_end_time}`);
    console.log(`   Late Threshold: ${settings.late_threshold_minutes} minutes`);
    
    // Create on-time attendance for today
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Parse work start time
    const [startHour, startMinute] = settings.work_start_time.split(':').map(Number);
    
    // Create check-in time 5 minutes before work start (on-time)
    const checkInTime = new Date(today);
    checkInTime.setHours(startHour, startMinute - 5, 0, 0);
    const checkInTimeStr = checkInTime.toISOString(); // Full ISO timestamp
    
    // Create check-out time at work end
    const [endHour, endMinute] = settings.work_end_time.split(':').map(Number);
    const checkOutTime = new Date(today);
    checkOutTime.setHours(endHour, endMinute, 0, 0);
    const checkOutTimeStr = checkOutTime.toISOString(); // Full ISO timestamp
    
    // Calculate hours worked
    const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    
    // Office location (Lagos coordinates)
    const officeLat = 6.5244;
    const officeLng = 3.3792;
    
    console.log(`\n📅 Creating attendance record for ${dateStr}:`);
    console.log(`   Check-in: ${checkInTime.toTimeString().split(' ')[0]} (ON-TIME)`);
    console.log(`   Check-out: ${checkOutTime.toTimeString().split(' ')[0]}`);
    console.log(`   Hours worked: ${hoursWorked.toFixed(2)}h`);
    console.log(`   Location: Office (${officeLat}, ${officeLng})`);
    
    // Check if attendance already exists for today
    const existingResult = await client.query(`
      SELECT id FROM attendance
      WHERE employee_id = $1 AND date = $2
    `, [caleb.id, dateStr]);
    
    if (existingResult.rows.length > 0) {
      console.log('\n⚠️  Attendance record already exists for today. Updating...');
      
      await client.query(`
        UPDATE attendance
        SET 
          clock_in = $1,
          clock_out = $2,
          clock_in_lat = $3,
          clock_in_lng = $4,
          clock_out_lat = $5,
          clock_out_lng = $6,
          hours_worked = $7,
          status = 'present',
          is_late = false,
          late_minutes = 0,
          updated_at = NOW()
        WHERE employee_id = $8 AND date = $9
      `, [
        checkInTimeStr,
        checkOutTimeStr,
        officeLat,
        officeLng,
        officeLat,
        officeLng,
        hoursWorked,
        caleb.id,
        dateStr
      ]);
      
      console.log('✅ Updated existing attendance record');
    } else {
      await client.query(`
        INSERT INTO attendance (
          employee_id,
          date,
          clock_in,
          clock_out,
          clock_in_lat,
          clock_in_lng,
          clock_out_lat,
          clock_out_lng,
          hours_worked,
          status,
          is_late,
          late_minutes,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'present', false, 0, NOW(), NOW())
      `, [
        caleb.id,
        dateStr,
        checkInTimeStr,
        checkOutTimeStr,
        officeLat,
        officeLng,
        officeLat,
        officeLng,
        hoursWorked
      ]);
      
      console.log('✅ Created new attendance record');
    }
    
    // Verify the record
    const verifyResult = await client.query(`
      SELECT 
        date,
        clock_in,
        clock_out,
        hours_worked,
        is_late,
        late_minutes,
        status
      FROM attendance
      WHERE employee_id = $1 AND date = $2
    `, [caleb.id, dateStr]);
    
    if (verifyResult.rows.length > 0) {
      const record = verifyResult.rows[0];
      console.log('\n✅ Verification - Record in database:');
      console.log(`   Date: ${record.date}`);
      console.log(`   Clock-in: ${record.clock_in}`);
      console.log(`   Clock-out: ${record.clock_out}`);
      console.log(`   Hours: ${record.hours_worked}h`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Late: ${record.is_late ? 'Yes' : 'No'} (${record.late_minutes} minutes)`);
    }
    
    console.log('\n🎉 Mock attendance created successfully for Caleb!');
    console.log('   Status: ON-TIME ✅');
    console.log('   You can now test the attendance display in the dashboard.');
    
  } catch (error) {
    console.error('❌ Error creating mock attendance:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createMockAttendanceForCaleb()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
