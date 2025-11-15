const { Pool } = require('../backend/node_modules/pg');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function checkCheckinValidation() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    // Get the validate_clock_in_location function
    const func = await client.query(`
      SELECT prosrc FROM pg_proc WHERE proname = 'validate_clock_in_location'
    `);
    
    console.log('VALIDATE_CLOCK_IN_LOCATION FUNCTION:');
    console.log(func.rows[0].prosrc);
    console.log('\n');
    
    // Get optimized_clock_in function
    const clockInFunc = await client.query(`
      SELECT prosrc FROM pg_proc WHERE proname = 'optimized_clock_in'
    `);
    
    console.log('OPTIMIZED_CLOCK_IN FUNCTION:');
    console.log(clockInFunc.rows[0].prosrc);
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCheckinValidation();
