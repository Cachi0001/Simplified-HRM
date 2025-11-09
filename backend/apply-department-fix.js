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
      path.join(__dirname, '../database/migrations/fix_update_department.sql'),
      'utf8'
    );
    
    console.log('🔄 Fixing update_department function...\n');
    await client.query(sql);
    console.log('✅ Migration completed successfully!\n');
    console.log('Fixed issue:');
    console.log('  ✓ Department updates no longer fail when name is unchanged');
    console.log('  ✓ Unique constraint violation prevented\n');
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
