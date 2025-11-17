const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testMyProfile() {
  try {
    // Get a sample user_id
    const userResult = await pool.query(`
      SELECT user_id FROM employees WHERE status = 'active' LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('No active employees found');
      return;
    }
    
    const userId = userResult.rows[0].user_id;
    console.log('Testing with user_id:', userId);
    
    // Test the get_my_profile function
    const result = await pool.query(
      `SELECT get_my_profile($1) as profile_data`,
      [userId]
    );

    const profileData = result.rows[0]?.profile_data;
    
    console.log('\nget_my_profile function result:');
    console.log(JSON.stringify(profileData, null, 2));
    
    if (profileData && profileData.success) {
      console.log('\n✅ Success: true');
      console.log('Profile structure:', Object.keys(profileData));
      
      if (profileData.profile) {
        console.log('\nProfile fields:', Object.keys(profileData.profile));
        console.log('working_hours:', profileData.profile.working_hours);
      }
      
      if (profileData.data) {
        console.log('\nData fields:', Object.keys(profileData.data));
        console.log('working_hours:', profileData.data.working_hours);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testMyProfile();
