const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getFunction() {
  try {
    const result = await pool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'notify_task_status_change'
    `);

    if (result.rows.length > 0) {
      console.log('notify_task_status_change function:');
      console.log('===================================\n');
      console.log(result.rows[0].definition);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getFunction();
