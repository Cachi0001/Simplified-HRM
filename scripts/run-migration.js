const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../database/migrations/fix_profile_update_notifications.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the function exists
    const result = await client.query(`
      SELECT proname, pronargs 
      FROM pg_proc 
      WHERE proname = 'notify_profile_updated'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ notify_profile_updated function verified:');
      result.rows.forEach(row => {
        console.log(`   - ${row.proname} with ${row.pronargs} arguments`);
      });
    } else {
      console.log('⚠️  Warning: notify_profile_updated function not found after migration');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
