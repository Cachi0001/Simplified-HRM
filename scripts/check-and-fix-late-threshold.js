const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function checkAndFix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Test current threshold by checking what the function returns
    console.log('📊 Testing CURRENT late threshold in database:\n');
    
    const testCases = [
      { time: '08:30:00', desc: '8:30 AM' },
      { time: '08:35:00', desc: '8:35 AM' },
      { time: '09:00:00', desc: '9:00 AM' },
      { time: '09:35:00', desc: '9:35 AM' },
      { time: '10:20:00', desc: '10:20 AM' },
      { time: '16:12:00', desc: '4:12 PM' },
    ];
    
    for (const test of testCases) {
      const result = await client.query(`
        SELECT calculate_late_status(CURRENT_DATE + TIME '${test.time}')
      `);
      
      const lateInfo = result.rows[0].calculate_late_status;
      const status = lateInfo.is_late ? `❌ ${lateInfo.late_minutes} minutes late` : '✅ On time';
      console.log(`  ${test.desc}: ${status}`);
    }

    console.log('\n🔧 Updating threshold to 9:00 AM...\n');

    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_late_status(
          p_clock_in TIMESTAMPTZ,
          p_late_threshold TIME DEFAULT '09:00:00'
      )
      RETURNS JSONB AS $$
      DECLARE
          v_clock_in_time TIME;
          v_is_late BOOLEAN;
          v_late_minutes INTEGER;
      BEGIN
          v_clock_in_time := p_clock_in::TIME;
          v_is_late := v_clock_in_time > p_late_threshold;
          
          IF v_is_late THEN
              v_late_minutes := EXTRACT(EPOCH FROM (v_clock_in_time - p_late_threshold)) / 60;
          ELSE
              v_late_minutes := 0;
          END IF;
          
          RETURN jsonb_build_object(
              'is_late', v_is_late,
              'late_minutes', v_late_minutes,
              'status', CASE WHEN v_is_late THEN 'late' ELSE 'on_time' END
          );
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    console.log('✅ Function updated!\n');

    // Test again with new threshold
    console.log('📊 Testing NEW late threshold (9:00 AM):\n');
    
    for (const test of testCases) {
      const result = await client.query(`
        SELECT calculate_late_status(CURRENT_DATE + TIME '${test.time}')
      `);
      
      const lateInfo = result.rows[0].calculate_late_status;
      const status = lateInfo.is_late ? `❌ ${lateInfo.late_minutes} minutes late` : '✅ On time';
      console.log(`  ${test.desc}: ${status}`);
    }

    console.log('\n✅ Late threshold fixed to 9:00 AM!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

checkAndFix().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
