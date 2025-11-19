const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addAttendanceIndexes() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding performance indexes for attendance...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/add_attendance_indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('📝 Executing migration...');
    await client.query(sql);
    
    console.log('\n✅ Indexes created successfully!\n');
    
    // Show created indexes
    const indexResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('attendance', 'employees', 'working_hours_config')
      AND schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    console.log('📊 Created Indexes:\n');
    let currentTable = '';
    indexResult.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n${row.tablename.toUpperCase()}:`);
      }
      console.log(`  ✓ ${row.indexname}`);
    });
    
    // Show table sizes
    console.log('\n📈 Table Statistics:\n');
    const statsResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_live_tup AS row_count
      FROM pg_stat_user_tables
      WHERE tablename IN ('attendance', 'employees', 'working_hours_config')
      ORDER BY tablename
    `);
    
    statsResult.rows.forEach(row => {
      console.log(`  ${row.tablename}: ${row.row_count} rows, ${row.size}`);
    });
    
    console.log('\n🎉 Performance optimization complete!');
    console.log('   Check-in/out operations should now be faster.');
    
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addAttendanceIndexes()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
