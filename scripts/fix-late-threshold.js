const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixLateThreshold() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing late threshold to 9:00 AM...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/fix_late_threshold_to_9am.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Late threshold updated to 9:00 AM');
    
    // Test the function
    console.log('\n📊 Testing late calculation:');
    
    const testCases = [
      { time: '08:30:00', expected: 'On time' },
      { time: '09:00:00', expected: 'On time' },
      { time: '09:15:00', expected: '15 minutes late' },
      { time: '10:20:00', expected: '80 minutes late' },
    ];
    
    for (const test of testCases) {
      const result = await client.query(`
        SELECT calculate_late_status(CURRENT_DATE + TIME '${test.time}')
      `);
      
      const lateInfo = result.rows[0].calculate_late_status;
      console.log(`  ${test.time}: ${lateInfo.is_late ? `${lateInfo.late_minutes} minutes late` : 'On time'} (Expected: ${test.expected})`);
    }

    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixLateThreshold();
