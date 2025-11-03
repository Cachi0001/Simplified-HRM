const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Running migration 038_fix_employee_management_function.sql...');
    
    const migrationPath = path.join(__dirname, '../database/migrations/038_fix_employee_management_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    });

    if (error) {
      console.error('Migration error:', error);
      
      // Try alternative approach - execute SQL directly
      console.log('Trying direct SQL execution...');
      const { data: directData, error: directError } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1);
        
      if (directError && directError.code === '42P01') {
        console.log('No migrations table found, executing SQL via RPC...');
        
        // Split the migration into individual statements
        const statements = migrationSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
          
        for (const statement of statements) {
          if (statement.trim()) {
            console.log('Executing:', statement.substring(0, 100) + '...');
            const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
            if (stmtError) {
              console.error('Statement error:', stmtError);
            }
          }
        }
      }
    } else {
      console.log('✅ Migration completed successfully');
    }
    
    // Test the function
    console.log('\nTesting the fixed function...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_all_employees_for_management', {
        p_requester_role: 'admin',
        p_requester_id: '00000000-0000-0000-0000-000000000000'
      });

    if (testError) {
      console.error('Test error:', testError);
    } else {
      console.log('✅ Function test successful!');
      console.log('Result:', JSON.stringify(testData, null, 2));
    }
    
  } catch (error) {
    console.error('Migration script error:', error);
  }
}

runMigration();