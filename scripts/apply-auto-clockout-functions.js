const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

// Use direct connection (not pgbouncer) for scripts
const directUrl = process.env.DATABASE_URL?.replace('?pgbouncer=true', '');

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false }
});

async function applyAutoClockoutFunctions() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Applying auto-clockout functions migration...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/create_auto_clockout_functions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply migration
    await client.query(sql);
    
    console.log('✅ Auto-clockout functions created successfully!\n');
    
    // Verify functions exist
    const functionsCheck = await client.query(`
      SELECT proname, pg_get_function_identity_arguments(oid) as args
      FROM pg_proc
      WHERE proname IN ('auto_clockout_at_midnight', 'manual_clockout_all_today')
    `);
    
    console.log('📋 Verified functions:');
    functionsCheck.rows.forEach(func => {
      console.log(`   ✅ ${func.proname}(${func.args})`);
    });
    
    console.log('\n🎉 All done! Auto-clockout functions are ready to use.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyAutoClockoutFunctions()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
