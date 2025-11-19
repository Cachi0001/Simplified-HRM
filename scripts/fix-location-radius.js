const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixLocationRadius() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current location radius...');
    
    // Get current config
    const currentResult = await client.query(`
      SELECT office_lat, office_lng, location_radius_meters
      FROM working_hours_config
      LIMIT 1
    `);
    
    if (currentResult.rows.length === 0) {
      console.log('❌ No working hours config found');
      return;
    }
    
    const current = currentResult.rows[0];
    console.log('\n📍 Current Configuration:');
    console.log(`   Office Location: ${current.office_lat}, ${current.office_lng}`);
    console.log(`   Current Radius: ${current.location_radius_meters} meters (${(current.location_radius_meters / 1000).toFixed(1)} km)`);
    
    if (current.location_radius_meters > 1000) {
      console.log(`   ⚠️  WARNING: Radius is TOO LARGE! Users can check in from ${(current.location_radius_meters / 1000).toFixed(1)}km away!`);
    }
    
    // Update to reasonable radius
    const NEW_RADIUS = 200; // 200 meters - reasonable office building radius
    
    console.log(`\n🔧 Updating radius to ${NEW_RADIUS} meters...`);
    
    await client.query(`
      UPDATE working_hours_config
      SET location_radius_meters = $1
    `, [NEW_RADIUS]);
    
    // Verify update
    const verifyResult = await client.query(`
      SELECT office_lat, office_lng, location_radius_meters
      FROM working_hours_config
      LIMIT 1
    `);
    
    const updated = verifyResult.rows[0];
    console.log('\n✅ Updated Configuration:');
    console.log(`   Office Location: ${updated.office_lat}, ${updated.office_lng}`);
    console.log(`   New Radius: ${updated.location_radius_meters} meters`);
    console.log(`   Users must be within ${updated.location_radius_meters}m of office to check in`);
    
    console.log('\n🎉 Location radius fixed successfully!');
    console.log('   Security improved: Users can no longer check in from kilometers away');
    
  } catch (error) {
    console.error('❌ Error fixing location radius:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixLocationRadius()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
