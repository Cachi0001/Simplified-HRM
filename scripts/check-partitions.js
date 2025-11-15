const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function checkPartitions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('NOTIFICATION PARTITIONS:\n');
    
    const result = await client.query(`
      SELECT 
        c.relname as partition_name,
        pg_get_expr(c.relpartbound, c.oid, true) as partition_bound
      FROM pg_class c
      JOIN pg_inherits i ON c.oid = i.inhrelid
      JOIN pg_class p ON i.inhparent = p.oid
      WHERE p.relname = 'notifications'
      ORDER BY c.relname
    `);
    
    result.rows.forEach(row => {
      console.log(`Partition: ${row.partition_name}`);
      console.log(`Bound: ${row.partition_bound}`);
      console.log('');
    });
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPartitions();
