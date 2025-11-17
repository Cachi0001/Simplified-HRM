const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testNotifications() {
  try {
    console.log('🧪 Testing task due notification system...\n');
    
    // Check if function exists
    const funcCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'send_task_due_notifications'
      ) as exists
    `);
    
    if (!funcCheck.rows[0].exists) {
      console.log('❌ Function send_task_due_notifications does not exist!');
      console.log('Run: node scripts/apply-task-due-notifications.js');
      return;
    }
    
    console.log('✅ Function exists');
    
    // Check for tasks due within next hour
    const tasksCheck = await pool.query(`
      SELECT 
        t.id,
        t.title,
        t.due_date,
        t.due_time,
        t.status,
        e.full_name as assignee_name,
        CASE 
          WHEN t.due_time IS NOT NULL THEN t.due_date + t.due_time
          ELSE t.due_date + TIME '23:59:59'
        END as due_datetime,
        NOW() as current_time
      FROM tasks t
      JOIN employees e ON e.id = t.assignee_id
      WHERE t.status IN ('pending', 'in_progress')
      AND t.due_date IS NOT NULL
      AND CASE 
        WHEN t.due_time IS NOT NULL THEN t.due_date + t.due_time
        ELSE t.due_date + TIME '23:59:59'
      END BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
    `);
    
    console.log(`\n📋 Found ${tasksCheck.rows.length} task(s) due within next hour:`);
    tasksCheck.rows.forEach(task => {
      console.log(`  - "${task.title}" assigned to ${task.assignee_name}`);
      console.log(`    Due: ${task.due_datetime}`);
      console.log(`    Status: ${task.status}`);
    });
    
    // Trigger notification function
    console.log('\n🔔 Triggering notification function...');
    await pool.query('SELECT send_task_due_notifications()');
    console.log('✅ Notification function executed successfully');
    
    // Check notifications created
    const notifCheck = await pool.query(`
      SELECT 
        n.title,
        n.message,
        n.priority,
        n.created_at,
        u.email as recipient_email
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      WHERE n.title = 'Task Due Soon'
      AND n.created_at > NOW() - INTERVAL '5 minutes'
      ORDER BY n.created_at DESC
    `);
    
    console.log(`\n📬 Created ${notifCheck.rows.length} notification(s) in last 5 minutes:`);
    notifCheck.rows.forEach(notif => {
      console.log(`  - To: ${notif.recipient_email}`);
      console.log(`    Message: ${notif.message}`);
      console.log(`    Priority: ${notif.priority}`);
      console.log(`    Time: ${notif.created_at}`);
    });
    
    console.log('\n✅ Test complete!');
    console.log('\n💡 Tips:');
    console.log('  - Notifications appear in the notification bell');
    console.log('  - Cron job runs every 15 minutes automatically');
    console.log('  - Create a task due within 1 hour to test');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testNotifications();
