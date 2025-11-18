const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function assignEmployeesToTeamLead() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Assigning Employees to TeamLead...\n');

    // Get the TeamLead (Caleb)
    const teamLeadResult = await client.query(`
      SELECT id, full_name, email
      FROM employees
      WHERE role = 'teamlead' AND status = 'active'
      LIMIT 1
    `);
    
    if (teamLeadResult.rows.length === 0) {
      console.log('❌ No active TeamLead found!');
      return;
    }
    
    const teamLead = teamLeadResult.rows[0];
    console.log(`📋 TeamLead: ${teamLead.full_name} (${teamLead.email})`);
    console.log(`   ID: ${teamLead.id}\n`);

    // Get all employees without a team lead
    const employeesResult = await client.query(`
      SELECT id, full_name, email, role
      FROM employees
      WHERE role = 'employee' 
        AND status = 'active'
        AND team_lead_id IS NULL
      ORDER BY full_name
    `);
    
    if (employeesResult.rows.length === 0) {
      console.log('✅ All employees already have team leads assigned!');
      return;
    }
    
    console.log(`Found ${employeesResult.rows.length} employees without team leads:\n`);
    employeesResult.rows.forEach(emp => {
      console.log(`  - ${emp.full_name} (${emp.email})`);
    });
    
    console.log('\n🔄 Assigning employees to TeamLead...\n');
    
    // Assign all employees to the TeamLead
    for (const employee of employeesResult.rows) {
      await client.query(`
        UPDATE employees
        SET team_lead_id = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [teamLead.id, employee.id]);
      
      console.log(`✅ Assigned ${employee.full_name} to ${teamLead.full_name}`);
    }
    
    console.log('\n✅ All employees have been assigned to the TeamLead!');
    
    // Verify the assignment
    console.log('\n📊 Verification:');
    const verifyResult = await client.query(`
      SELECT 
        e.full_name as employee_name,
        tl.full_name as team_lead_name
      FROM employees e
      JOIN employees tl ON e.team_lead_id = tl.id
      WHERE e.role = 'employee' AND e.status = 'active'
      ORDER BY e.full_name
    `);
    
    console.log(`\nTeam Members under ${teamLead.full_name}:`);
    verifyResult.rows.forEach(row => {
      console.log(`  ✓ ${row.employee_name}`);
    });
    
    console.log('\n✅ Assignment complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

assignEmployeesToTeamLead();
