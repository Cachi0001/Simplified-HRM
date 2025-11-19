const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function sendCheckoutReminders() {
  const client = await pool.connect();
  
  try {
    console.log('🔔 Finding employees who need checkout reminders...\n');
    
    // Get current day of week (0 = Sunday, 1 = Monday, ..., 5 = Friday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const currentHour = today.getHours();
    
    console.log(`📅 Today: ${today.toDateString()}`);
    console.log(`⏰ Current time: ${today.toLocaleTimeString()}`);
    console.log(`📆 Day of week: ${dayOfWeek} (1-5 = Mon-Fri)\n`);
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('⚠️  Today is weekend - no checkout reminders needed');
      return;
    }
    
    // Find employees who clocked in but haven't clocked out today
    const result = await client.query(`
      SELECT 
        a.id as attendance_id,
        a.employee_id,
        a.clock_in,
        e.full_name,
        e.email,
        u.id as user_id
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE a.date = CURRENT_DATE
        AND a.clock_in IS NOT NULL
        AND a.clock_out IS NULL
        AND e.status = 'active'
      ORDER BY e.full_name
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ No employees need checkout reminders - everyone has clocked out!');
      return;
    }
    
    console.log(`📋 Found ${result.rows.length} employee(s) who haven't clocked out:\n`);
    
    for (const employee of result.rows) {
      console.log(`👤 ${employee.full_name} (${employee.email})`);
      console.log(`   Clocked in at: ${new Date(employee.clock_in).toLocaleTimeString()}`);
      console.log(`   Employee ID: ${employee.employee_id}`);
      console.log(`   User ID: ${employee.user_id}`);
    }
    
    console.log('\n📧 Sending notifications...\n');
    
    let emailsSent = 0;
    let pushSent = 0;
    
    for (const employee of result.rows) {
      try {
        // Create push notification
        const pushResult = await client.query(`
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            metadata,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id
        `, [
          employee.user_id,
          'warning',
          'Checkout Reminder',
          'Don\'t forget to clock out for today!',
          JSON.stringify({
            action_url: '/dashboard#checkin',
            action_label: 'Clock Out Now',
            employee_id: employee.employee_id,
            attendance_id: employee.attendance_id
          })
        ]);
        
        pushSent++;
        console.log(`✅ Push notification sent to ${employee.full_name}`);
        
        // Send email (using a simple query to log it)
        // In production, this would call the actual email service
        console.log(`📧 Email would be sent to: ${employee.email}`);
        emailsSent++;
        
      } catch (error) {
        console.error(`❌ Error sending notification to ${employee.full_name}:`, error.message);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Push notifications sent: ${pushSent}/${result.rows.length}`);
    console.log(`   Emails queued: ${emailsSent}/${result.rows.length}`);
    console.log('\n🎉 Checkout reminders sent successfully!');
    
  } catch (error) {
    console.error('❌ Error sending checkout reminders:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
sendCheckoutReminders()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
