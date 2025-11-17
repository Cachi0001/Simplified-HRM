const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addIndexes() {
  try {
    console.log('Adding department indexes for better performance...\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/add_department_indexes.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Department indexes added successfully!');
    console.log('\nIndexes created:');
    console.log('  • idx_departments_is_active - Filter active departments');
    console.log('  • idx_departments_name - Search/sort by name');
    console.log('  • idx_departments_team_lead - Join with employees');
    console.log('  • idx_departments_active_name - Combined active + name queries');
    console.log('\n✨ Department queries should now be faster!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addIndexes();
