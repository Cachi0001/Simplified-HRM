require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/fix_leave_and_purchase_functions.sql'),
      'utf8'
    );
    
    console.log('🔄 Running migration to fix leave and purchase functions...\n');
    await client.query(sql);
    console.log('✅ Migration completed successfully!\n');
    console.log('Fixed issues:');
    console.log('  ✓ Removed duplicate create_purchase_request function');
    console.log('  ✓ Simplified leave balance logic with auto-creation');
    console.log('  ✓ Added get_available_leave_types function');
    console.log('  ✓ Updated approve_employee to auto-initialize balances\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
