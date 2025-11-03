const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFunction() {
  try {
    console.log('Creating/updating the get_all_employees_for_management function...');
    
    // First, let's check what columns actually exist in the employees table
    const { data: tableInfo, error: tableError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);
      
    if (tableError) {
      console.error('Error checking employees table:', tableError);
    } else {
      console.log('Sample employee record structure:', Object.keys(tableInfo[0] || {}));
    }
    
    // Now let's create the corrected function using a simple approach
    const functionSQL = `
      CREATE OR REPLACE FUNCTION get_all_employees_for_management(
          p_requester_role TEXT,
          p_requester_id UUID
      )
      RETURNS JSON
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $func$
      DECLARE
          v_employees JSON;
      BEGIN
          -- Validate requester role
          IF p_requester_role NOT IN ('superadmin', 'super-admin', 'admin', 'hr') THEN
              RETURN json_build_object(
                  'success', false,
                  'error', 'Insufficient permissions to access employee management'
              );
          END IF;

          -- Get all employees with full details (using correct column names)
          SELECT json_agg(
              json_build_object(
                  'id', e.id,
                  'user_id', e.user_id,
                  'full_name', e.full_name,
                  'email', e.email,
                  'phone', e.phone,
                  'department', COALESCE(d.name, 'No Department'),
                  'department_id', e.department_id,
                  'position', e.position,
                  'role', e.role,
                  'status', e.status,
                  'hire_date', e.hire_date,
                  'salary', e.salary,
                  'manager_name', COALESCE(m.full_name, 'No Manager'),
                  'manager_id', e.manager_id,
                  'profile_picture_url', COALESCE(e.profile_picture, e.avatar),
                  'address', e.address,
                  'date_of_birth', e.date_of_birth,
                  'work_type', e.work_type,
                  'work_days', e.work_days,
                  'performance_score', e.performance_score,
                  'created_at', e.created_at,
                  'updated_at', e.updated_at
              )
          ) INTO v_employees
          FROM employees e
          LEFT JOIN departments d ON e.department_id = d.id
          LEFT JOIN employees m ON e.manager_id = m.id
          ORDER BY e.created_at DESC;

          RETURN json_build_object(
              'success', true,
              'employees', COALESCE(v_employees, '[]'::json)
          );
      END;
      $func$;
    `;
    
    console.log('Function SQL prepared. You need to run this in Supabase SQL Editor:');
    console.log('='.repeat(80));
    console.log(functionSQL);
    console.log('='.repeat(80));
    
    // Test the current function to see the exact error
    console.log('\nTesting current function to see exact error...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_all_employees_for_management', {
        p_requester_role: 'admin',
        p_requester_id: '00000000-0000-0000-0000-000000000000'
      });

    if (testError) {
      console.error('Current function error:', testError);
    } else {
      console.log('✅ Function works!', testData);
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

fixFunction();