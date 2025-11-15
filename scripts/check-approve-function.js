const { Pool } = require('../backend/node_modules/pg');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkApproveFunction() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT prosrc FROM pg_proc WHERE proname = 'approve_employee'
    `);
    
    console.log('APPROVE_EMPLOYEE FUNCTION SOURCE:');
    console.log(result.rows[0].prosrc);
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkApproveFunction();
