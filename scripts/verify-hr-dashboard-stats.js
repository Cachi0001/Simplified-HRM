const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function verifyHRStats() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 VERIFYING HR DASHBOARD STATS...\n');
    
    // 1. Total Staff (same as admin)
    const totalStaff = await client.query(`
      SELECT COUNT(*) as count FROM employees WHERE status = 'active'
    `);
    console.log('1️⃣ Total Staff:', totalStaff.rows[0].count);
    
    // 2. Total Departments
    const totalDepts = await client.query(`
      SELECT COUNT(*) as count FROM departments
    `);
    console.log('2️⃣ Total Departments:', totalDepts.rows[0].count);
    
    // 3. Leave Requests (pending)
    const leaveRequests = await client.query(`
      SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'
    `);
    console.log('3️⃣ Pending Leave Requests:', leaveRequests.rows[0].count);
    
    // 4. Purchase Requests (pending)
    const purchaseRequests = await client.query(`
      SELECT COUNT(*) as count FROM purchase_requests WHERE status = 'pending'
    `);
    console.log('4️⃣ Pending Purchase Requests:', purchaseRequests.rows[0].count);
    
    console.log('\n✅ HR Dashboard should show same data as Admin Dashboard');
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyHRStats();
