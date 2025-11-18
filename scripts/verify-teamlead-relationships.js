const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyTeamLeadRelationships() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying TeamLead Relationships...\n');

    // 1. Check all employees and their team_lead_id
    console.log('1️⃣ Checking all employees and their team_lead_id:');
    const employeesResult = await client.query(`
      SELECT 
        e.id,
        e.full_name,
        e.role,
        e.team_lead_id,
        tl.full_name as team_lead_name,
        e.department_id,
        d.name as department_name,
        e.status
      FROM employees e
      LEFT JOIN employees tl ON e.team_lead_id = tl.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.role, e.full_name
    `);
    
    console.log(`\nTotal employees: ${employeesResult.rows.length}\n`);
    
    const byRole = {};
    employeesResult.rows.forEach(emp => {
      if (!byRole[emp.role]) byRole[emp.role] = [];
      byRole[emp.role].push(emp);
    });
    
    Object.keys(byRole).forEach(role => {
      console.log(`\n${role.toUpperCase()}s (${byRole[role].length}):`);
      byRole[role].forEach(emp => {
        console.log(`  - ${emp.full_name} (${emp.status})`);
        console.log(`    ID: ${emp.id}`);
        console.log(`    Team Lead: ${emp.team_lead_name || 'None'} (${emp.team_lead_id || 'null'})`);
        console.log(`    Department: ${emp.department_name || 'None'}`);
      });
    });

    // 2. Check TeamLeads and their team members
    console.log('\n\n2️⃣ Checking TeamLeads and their team members:');
    const teamLeadsResult = await client.query(`
      SELECT 
        id,
        full_name,
        email,
        status
      FROM employees
      WHERE role = 'teamlead'
      ORDER BY full_name
    `);
    
    console.log(`\nTotal TeamLeads: ${teamLeadsResult.rows.length}\n`);
    
    for (const teamLead of teamLeadsResult.rows) {
      console.log(`\n📋 ${teamLead.full_name} (${teamLead.status})`);
      console.log(`   ID: ${teamLead.id}`);
      console.log(`   Email: ${teamLead.email}`);
      
      // Get team members
      const membersResult = await client.query(`
        SELECT 
          id,
          full_name,
          role,
          status,
          department_id
        FROM employees
        WHERE team_lead_id = $1
        ORDER BY full_name
      `, [teamLead.id]);
      
      if (membersResult.rows.length > 0) {
        console.log(`   Team Members (${membersResult.rows.length}):`);
        membersResult.rows.forEach(member => {
          console.log(`     - ${member.full_name} (${member.role}, ${member.status})`);
        });
      } else {
        console.log(`   ⚠️  No team members assigned`);
      }
      
      // Get tasks assigned by this team lead
      const tasksResult = await client.query(`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM tasks
        WHERE assigned_by = $1
      `, [teamLead.id]);
      
      const taskStats = tasksResult.rows[0];
      console.log(`   Tasks Assigned: ${taskStats.total_tasks} (Pending: ${taskStats.pending}, In Progress: ${taskStats.in_progress}, Completed: ${taskStats.completed})`);
    }

    // 3. Check employees without team leads
    console.log('\n\n3️⃣ Checking employees without team leads:');
    const noTeamLeadResult = await client.query(`
      SELECT 
        id,
        full_name,
        role,
        status,
        department_id
      FROM employees
      WHERE team_lead_id IS NULL
        AND role = 'employee'
      ORDER BY full_name
    `);
    
    if (noTeamLeadResult.rows.length > 0) {
      console.log(`\n⚠️  Found ${noTeamLeadResult.rows.length} employees without team leads:`);
      noTeamLeadResult.rows.forEach(emp => {
        console.log(`  - ${emp.full_name} (${emp.status})`);
      });
    } else {
      console.log('\n✅ All employees have team leads assigned');
    }

    // 4. Check departments and their team leads
    console.log('\n\n4️⃣ Checking departments and their team leads:');
    const departmentsResult = await client.query(`
      SELECT 
        d.id,
        d.name,
        d.team_lead_id,
        e.full_name as team_lead_name,
        d.is_active
      FROM departments d
      LEFT JOIN employees e ON d.team_lead_id = e.id
      ORDER BY d.name
    `);
    
    console.log(`\nTotal departments: ${departmentsResult.rows.length}\n`);
    departmentsResult.rows.forEach(dept => {
      console.log(`  - ${dept.name} (${dept.is_active ? 'Active' : 'Inactive'})`);
      console.log(`    Team Lead: ${dept.team_lead_name || 'None'}`);
    });

    // 5. Summary
    console.log('\n\n📊 SUMMARY:');
    console.log('═══════════════════════════════════════════════════');
    
    const summary = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE role = 'employee') as total_employees,
        COUNT(*) FILTER (WHERE role = 'teamlead') as total_teamleads,
        COUNT(*) FILTER (WHERE role = 'employee' AND team_lead_id IS NOT NULL) as employees_with_teamlead,
        COUNT(*) FILTER (WHERE role = 'employee' AND team_lead_id IS NULL) as employees_without_teamlead,
        COUNT(*) FILTER (WHERE role = 'employee' AND status = 'active') as active_employees,
        COUNT(*) FILTER (WHERE role = 'teamlead' AND status = 'active') as active_teamleads
      FROM employees
    `);
    
    const stats = summary.rows[0];
    console.log(`Total Employees: ${stats.total_employees}`);
    console.log(`  - With Team Lead: ${stats.employees_with_teamlead}`);
    console.log(`  - Without Team Lead: ${stats.employees_without_teamlead}`);
    console.log(`  - Active: ${stats.active_employees}`);
    console.log(`\nTotal Team Leads: ${stats.total_teamleads}`);
    console.log(`  - Active: ${stats.active_teamleads}`);
    
    if (parseInt(stats.employees_without_teamlead) > 0) {
      console.log('\n⚠️  WARNING: Some employees do not have team leads assigned!');
      console.log('   This may cause issues with TeamLead dashboard stats.');
    } else {
      console.log('\n✅ All employees have team leads assigned!');
    }

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyTeamLeadRelationships();
