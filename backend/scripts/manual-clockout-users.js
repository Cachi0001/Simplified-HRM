const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function clockOutUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding users who need to be clocked out...\n');
    
    // Find users who haven't clocked out today
    const result = await client.query(`
      SELECT 
        a.id as attendance_id,
        a.employee_id,
        a.clock_in,
        e.full_name,
        e.email
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = CURRENT_DATE
        AND a.clock_in IS NOT NULL
        AND a.clock_out IS NULL
      ORDER BY e.full_name
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ No users need to be clocked out - everyone is already clocked out!');
      return;
    }
    
    console.log(`📋 Found ${result.rows.length} user(s) to clock out:\n`);
    
    for (const user of result.rows) {
      console.log(`👤 ${user.full_name} (${user.email})`);
      console.log(`   Clocked in at: ${new Date(user.clock_in).toLocaleTimeString()}`);
    }
    
    console.log('\n⏰ Clocking out users now...\n');
    
    const clockOutTime = new Date();
    
    for (const user of result.rows) {
      try {
        // Calculate hours worked
        const clockInTime = new Date(user.clock_in);
        const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);
        
        // Update attendance record
        await client.query(`
          UPDATE attendance
          SET 
            clock_out = $1,
            hours_worked = $2,
            status = 'present',
            updated_at = NOW()
          WHERE id = $3
        `, [clockOutTime, hoursWorked, user.attendance_id]);
        
        console.log(`✅ ${user.full_name} clocked out`);
        console.log(`   Hours worked: ${hoursWorked.toFixed(2)}h`);
        
      } catch (error) {
        console.error(`❌ Error clocking out ${user.full_name}:`, error.message);
      }
    }
    
    console.log('\n🎉 All users clocked out successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clockOutUsers()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
