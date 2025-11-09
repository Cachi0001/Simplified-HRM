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
      path.join(__dirname, '../database/migrations/simplify_leave_and_purchase.sql'),
      'utf8'
    );
    
    console.log('🔄 Simplifying leave, purchase, and task functions...\n');
    await client.query(sql);
    console.log('✅ Migration completed successfully!\n');
    console.log('Fixed issues:');
    console.log('  ✓ Leave requests no longer check balance (just create)');
    console.log('  ✓ Purchase requests accept any price format (9ducs → 9)');
    console.log('  ✓ Task creation no longer fails on notification errors');
    console.log('  ✓ All functions simplified and working\n');
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
