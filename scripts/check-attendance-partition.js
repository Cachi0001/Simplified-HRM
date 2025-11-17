const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function checkPartitions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 CHECKING ATTENDANCE PARTITIONS...\n');
    
    // Check which partitions exist
    const partitions = await client.query(`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE tablename LIKE 'attendance_%'
      AND schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('ATTENDANCE PARTITIONS:');
    partitions.rows.forEach(p => {
      console.log(`  ${p.tablename}: ${p.size}`);
    });
    
    // Check recent attendance records
    const recent = await client.query(`
      SELECT 
        date,
        COUNT(*) as records,
        MIN(created_at) as first_record,
        MAX(created_at) as last_record
      FROM attendance
      WHERE date >= CURRENT_DATE - 30
      GROUP BY date
      ORDER BY date DESC
      LIMIT 10
    `);
    
    console.log('\nRECENT ATTENDANCE RECORDS:');
    recent.rows.forEach(r => {
      console.log(`  ${r.date.toISOString().split('T')[0]}: ${r.records} records`);
    });
    
    // Check current year
    console.log('\nCURRENT YEAR:', new Date().getFullYear());
    console.log('EXPECTED PARTITION: attendance_' + new Date().getFullYear());
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPartitions();
