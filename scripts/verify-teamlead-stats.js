const { Pool } = require('../backend/node_modules/pg');
require('../backend/node_modules/dotenv').config({ path: './backend/.env' });

async function verifyTeamLeadStats() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 VERIFYING TEAMLEAD STATS...\n');
    
    // Get all team leads
    const teamLeads = await client.query(`
      SELECT id, full_name, email, role
      FROM employees
      WHERE role = 'teamlead' AND status = 'active'
    `);
    
    if (teamLeads.rows.length === 0) {
      console.log('❌ No active team leads found');
      client.release();
      await pool.end();
      return;
    }
    
    for (const lead of teamLeads.rows) {
      console.log(`\n📊 TEAM LEAD: ${lead.full_name}`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   ID: ${lead.id}\n`);
      
      // Get team members
      const teamMembers = await client.query(`
        SELECT id, full_name, email, position
        FROM employees
        WHERE team_lead_id = $1 AND status = 'active'
      `, [lead.id]);
      
      console.log(`   Team Members: ${teamMembers.rows.length}`);
      if (teamMembers.rows.length > 0) {
        teamMembers.rows.forEach(member => {
          console.log(`     - ${member.full_name} (${member.position || 'No position'})`);
        });
      }
      
      // Get tasks assigned to team members
      const teamMemberIds = teamMembers.rows.map(m => m.id);
      if (teamMemberIds.length > 0) {
        const tasks = await client.query(`
          SELECT 
            COUNT(*) as total_tasks,
            COUNT(*) FILTER (WHERE status != 'completed' AND status != 'cancelled') as active_tasks,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
          FROM tasks
          WHERE assigned_to = ANY($1)
        `, [teamMemberIds]);
        
        const taskStats = tasks.rows[0];
        const completionRate = taskStats.total_tasks > 0 
          ? Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100)
          : 0;
        
        console.log(`\n   Tasks:`);
        console.log(`     Total: ${taskStats.total_tasks}`);
        console.log(`     Active: ${taskStats.active_tasks}`);
        console.log(`     Completed: ${taskStats.completed_tasks}`);
        console.log(`     Completion Rate: ${completionRate}%`);
      } else {
        console.log(`\n   Tasks: No team members to track`);
      }
      
      console.log('\n' + '='.repeat(60));
    }
    
    console.log('\n✅ TeamLead stats verification complete');
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyTeamLeadStats();
