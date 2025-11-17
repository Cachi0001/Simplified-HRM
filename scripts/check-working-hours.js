const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkWorkingHours() {
  try {
    // Check if get_active_employees function exists
    const funcCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_active_employees'
      ) as exists
    `);
    console.log('get_active_employees function exists:', funcCheck.rows[0].exists);

    // Get a sample employee with working_hours
    const result = await pool.query(`
      SELECT id, full_name, email, working_hours, working_days, timezone
      FROM employees 
      WHERE status = 'active'
      LIMIT 3
    `);

    console.log('\nSample employees with working_hours:');
    result.rows.forEach(emp => {
      console.log(`\nEmployee: ${emp.full_name}`);
      console.log(`  ID: ${emp.id}`);
      console.log(`  Email: ${emp.email}`);
      console.log(`  working_hours (raw):`, emp.working_hours);
      console.log(`  working_hours (type):`, typeof emp.working_hours);
      console.log(`  working_days:`, emp.working_days);
      console.log(`  timezone:`, emp.timezone);
    });

    // Try the get_active_employees function if it exists
    if (funcCheck.rows[0].exists) {
      console.log('\n\nTesting get_active_employees() function:');
      const funcResult = await pool.query('SELECT * FROM get_active_employees() LIMIT 1');
      if (funcResult.rows.length > 0) {
        const emp = funcResult.rows[0];
        console.log(`Employee: ${emp.full_name}`);
        console.log(`  working_hours:`, emp.working_hours);
        console.log(`  working_hours (type):`, typeof emp.working_hours);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWorkingHours();
