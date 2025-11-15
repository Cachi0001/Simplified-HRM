const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function checkNotificationTypes() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    // Check constraint (updated for PostgreSQL 12+)
    const constraint = await client.query(`
      SELECT 
        conname, 
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname LIKE '%type_check%' 
      AND conrelid::regclass::text LIKE '%notifications%'
    `);
    
    console.log('NOTIFICATION TYPE CONSTRAINTS:');
    constraint.rows.forEach(c => {
      console.log(`Constraint: ${c.conname}`);
      console.log(`Definition: ${c.definition}`);
    });
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkNotificationTypes();
