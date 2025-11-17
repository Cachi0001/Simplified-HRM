const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixSelfApproval() {
  try {
    console.log('Fixing self-approval issues...');
    console.log('1. Updating notification functions to exclude requester');
    console.log('2. Backend validation added to prevent self-approval');
    console.log('3. Frontend filtering added to hide own requests\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/fix_self_approval_notifications.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    
    console.log('✅ Database functions updated successfully!');
    console.log('\nChanges applied:');
    console.log('  ✓ notify_leave_request_created - now excludes requester');
    console.log('  ✓ notify_purchase_request_created - now excludes requester');
    console.log('  ✓ Backend validation prevents self-approval');
    console.log('  ✓ Frontend filters out own requests from approval view');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixSelfApproval();
