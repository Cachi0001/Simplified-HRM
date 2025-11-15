const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function checkWorkingHours() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 CHECKING WORKING HOURS DATA...\n');
    
    const result = await client.query(`
      SELECT 
        id,
        full_name,
        email,
        working_hours,
        pg_typeof(working_hours) as data_type
      FROM employees
      WHERE status = 'active'
      ORDER BY full_name
    `);
    
    console.log('EMPLOYEE WORKING HOURS:\n');
    result.rows.forEach(emp => {
      console.log(`${emp.full_name} (${emp.email})`);
      console.log(`  Data Type: ${emp.data_type}`);
      console.log(`  Raw Value: ${JSON.stringify(emp.working_hours)}`);
      console.log(`  Type: ${typeof emp.working_hours}`);
      
      if (emp.working_hours) {
        if (typeof emp.working_hours === 'string') {
          try {
            const parsed = JSON.parse(emp.working_hours);
            console.log(`  Parsed: ${JSON.stringify(parsed)}`);
          } catch (e) {
            console.log(`  Parse Error: ${e.message}`);
          }
        } else if (typeof emp.working_hours === 'object') {
          console.log(`  Already Object: start=${emp.working_hours.start}, end=${emp.working_hours.end}`);
        }
      }
      console.log('');
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWorkingHours();
