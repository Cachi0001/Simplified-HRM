const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function checkStatuses() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 CHECKING EMPLOYEE STATUSES...\n');
    
    // Check all employee statuses
    const statuses = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        STRING_AGG(full_name, ', ') as employees
      FROM employees
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('EMPLOYEE STATUS BREAKDOWN:\n');
    statuses.rows.forEach(row => {
      console.log(`${row.status}: ${row.count} employees`);
      console.log(`  Names: ${row.employees}`);
      console.log('');
    });
    
    // Check specifically for pending/inactive
    const pendingInactive = await client.query(`
      SELECT 
        id,
        full_name,
        email,
        status,
        role,
        created_at
      FROM employees
      WHERE status IN ('pending', 'inactive')
      ORDER BY created_at DESC
    `);
    
    console.log('PENDING/INACTIVE EMPLOYEES:\n');
    if (pendingInactive.rows.length === 0) {
      console.log('❌ NO pending or inactive employees found!');
      console.log('This is why Pending Approvals section is empty.\n');
    } else {
      pendingInactive.rows.forEach(emp => {
        console.log(`${emp.full_name} (${emp.email})`);
        console.log(`  Status: ${emp.status}`);
        console.log(`  Role: ${emp.role}`);
        console.log(`  Created: ${emp.created_at}`);
        console.log('');
      });
    }
    
    // Check recent signups
    const recent = await client.query(`
      SELECT 
        full_name,
        email,
        status,
        role,
        created_at
      FROM employees
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('RECENT EMPLOYEES (Last 5):\n');
    recent.rows.forEach(emp => {
      console.log(`${emp.full_name} - Status: ${emp.status} - Created: ${emp.created_at.toISOString().split('T')[0]}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStatuses();
