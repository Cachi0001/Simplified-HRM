const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected:', testResult.rows[0].now);
    
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'update_department_team_lead.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\nRunning migration: update_department_team_lead.sql');
    console.log('This will add automatic team lead to department assignment\n');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Changes applied:');
    console.log('  - Created sync_department_team_lead() function');
    console.log('  - Created trigger to auto-update department manager');
    console.log('  - Team leads automatically assigned to departments');
    console.log('\n🎉 Team lead assignment is now automatic!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.detail) console.error('Detail:', error.detail);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigration();
