const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkFunction() {
  try {
    const result = await pool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'get_active_employees'
    `);

    if (result.rows.length > 0) {
      console.log('get_active_employees function definition:');
      console.log(result.rows[0].definition);
    } else {
      console.log('Function not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFunction();
