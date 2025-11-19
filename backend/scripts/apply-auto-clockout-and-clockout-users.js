const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyMigrationAndClockout() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Step 1: Applying auto-clockout migration...\n');
    
    // Read and apply migration
    const migrationPath = path.join(__dirname, '../../database/migrations/add_auto_clockout_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    console.log('✅ Migration applied successfully!\n');
    
    console.log('👥 Step 2: Clocking out users manually...\n');
    
    // Clock out all users who are still clocked in
    const result = await client.query(`SELECT * FROM manual_clockout_all_today()`);
    
    if (result.rows.length === 0) {
      console.log('✅ No users need to be clocked out - everyone is already clocked out!');
    } else {
      console.log(`✅ Clocked out ${result.rows.length} user(s):\n`);
      
      result.rows.forEach(row => {
        console.log(`   👤 ${row.employee_name}`);
        console.log(`      Hours worked: ${parseFloat(row.hours_worked).toFixed(2)}h`);
      });
    }
    
    console.log('\n🎉 All done!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Auto-clockout column added to attendance table`);
    console.log(`   ✅ Auto-clockout functions created`);
    console.log(`   ✅ ${result.rows.length} user(s) clocked out manually`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigrationAndClockout()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
