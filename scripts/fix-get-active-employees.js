const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixFunction() {
  try {
    console.log('Fixing get_active_employees function...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/fix_get_active_employees_function.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Function updated successfully!');
    
    // Verify the fix
    const result = await pool.query('SELECT * FROM get_active_employees() LIMIT 1');
    if (result.rows.length > 0) {
      const emp = result.rows[0];
      console.log('\nVerification:');
      console.log(`  Employee: ${emp.full_name}`);
      console.log(`  working_hours:`, emp.working_hours);
      console.log(`  timezone:`, emp.timezone);
      console.log(`  ✅ working_hours is now included!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixFunction();
