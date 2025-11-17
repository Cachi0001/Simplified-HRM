const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixFunction() {
  try {
    console.log('Fixing get_my_profile function...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/fix_get_my_profile_function.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Function updated successfully!');
    
    // Verify the fix
    const userResult = await pool.query(`
      SELECT user_id FROM employees WHERE status = 'active' LIMIT 1
    `);
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].user_id;
      const result = await pool.query(
        `SELECT get_my_profile($1) as profile_data`,
        [userId]
      );
      
      const profileData = result.rows[0]?.profile_data;
      
      if (profileData && profileData.success && profileData.profile) {
        console.log('\nVerification:');
        console.log(`  Employee: ${profileData.profile.full_name}`);
        console.log(`  working_hours:`, profileData.profile.working_hours);
        console.log(`  timezone:`, profileData.profile.timezone);
        console.log(`  ✅ working_hours and timezone are now included!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixFunction();
