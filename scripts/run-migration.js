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
    
    console.log('Reading migration files...');
    
    // Run multiple migrations
    const migrations = [
      '../database/migrations/fix_final_issues.sql',
      '../database/migrations/fix_notification_types.sql',
      '../database/migrations/fix_leave_system_single_pool.sql',
      '../database/migrations/fix_performance_metrics.sql'
    ];
    
    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, migration);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log(`Running ${migration.split('/').pop()}...`);
      await client.query(migrationSQL);
    }
    
    console.log('✅ All migrations completed successfully!');
    
    // Verify leave types
    const leaveTypes = await client.query(`
      SELECT name, default_days_per_year FROM leave_types WHERE is_active = TRUE ORDER BY name
    `);
    
    console.log('✅ Leave types verified:');
    leaveTypes.rows.forEach(lt => {
      console.log(`   - ${lt.name}: ${lt.default_days_per_year} days`);
    });
    
    // Verify leave balances created
    const balances = await client.query(`
      SELECT COUNT(*) as count FROM leave_balances WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    console.log(`✅ Leave balances: ${balances.rows[0].count} records`);
    
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
