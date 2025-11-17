const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixPerformanceScores() {
  try {
    console.log('Fixing performance score calculation...\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/fix_performance_metrics.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Performance score calculation fixed!');
    console.log('\nChanges:');
    console.log('  • Punctuality: 0% when no attendance (was 100%)');
    console.log('  • Task Completion: 0% when no tasks (was 100%)');
    console.log('  • More accurate performance metrics');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPerformanceScores();
