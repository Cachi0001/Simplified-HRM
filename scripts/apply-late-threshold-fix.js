const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function applyFix() {
  console.log('🔧 Applying late threshold fix...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/fix_late_threshold_to_9am.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found!');
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute the migration
    console.log('🔄 Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Late threshold updated to 9:00 AM\n');
    
    // Test the function
    console.log('📊 Testing late calculation:\n');
    
    const testCases = [
      { time: '08:30:00', expected: 'On time' },
      { time: '09:00:00', expected: 'On time' },
      { time: '09:15:00', expected: '15 minutes late' },
      { time: '10:20:00', expected: '80 minutes late' },
    ];
    
    for (const test of testCases) {
      try {
        const result = await client.query(`
          SELECT calculate_late_status(CURRENT_DATE + TIME '${test.time}')
        `);
        
        const lateInfo = result.rows[0].calculate_late_status;
        const actual = lateInfo.is_late ? `${lateInfo.late_minutes} minutes late` : 'On time';
        console.log(`  ${test.time}: ${actual} (Expected: ${test.expected})`);
      } catch (err) {
        console.error(`  ❌ Error testing ${test.time}:`, err.message);
      }
    }

    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

applyFix().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
