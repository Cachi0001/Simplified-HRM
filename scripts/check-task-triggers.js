const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTriggers() {
  try {
    // Check for triggers on tasks table
    const triggers = await pool.query(`
      SELECT 
        tgname as trigger_name,
        pg_get_triggerdef(oid) as trigger_definition
      FROM pg_trigger
      WHERE tgrelid = 'tasks'::regclass
      AND tgisinternal = false
      ORDER BY tgname
    `);

    console.log('Triggers on tasks table:');
    console.log('========================\n');
    
    if (triggers.rows.length === 0) {
      console.log('No triggers found on tasks table');
    } else {
      triggers.rows.forEach(trigger => {
        console.log(`Trigger: ${trigger.trigger_name}`);
        console.log(`Definition: ${trigger.trigger_definition}`);
        console.log('\n---\n');
      });
    }

    // Check for functions that insert task notifications
    const functions = await pool.query(`
      SELECT 
        proname as function_name,
        pg_get_functiondef(oid) as function_definition
      FROM pg_proc
      WHERE proname LIKE '%task%notif%' OR proname LIKE '%notify%task%'
      ORDER BY proname
    `);

    console.log('\nTask notification functions:');
    console.log('============================\n');
    
    if (functions.rows.length === 0) {
      console.log('No task notification functions found');
    } else {
      functions.rows.forEach(func => {
        console.log(`Function: ${func.function_name}`);
        console.log(`Definition: ${func.function_definition.substring(0, 500)}...`);
        console.log('\n---\n');
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTriggers();
