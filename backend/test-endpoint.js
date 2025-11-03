const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEndpoint() {
  try {
    console.log('Testing the fixed getEmployeesForManagement service method...');
    
    // Test the direct Supabase query that the service is now using
    let query = supabase
      .from('employees')
      .select(`
        id,
        user_id,
        full_name,
        email,
        phone,
        department_id,
        position,
        role,
        status,
        hire_date,
        salary,
        manager_id,
        profile_picture,
        avatar,
        address,
        date_of_birth,
        work_type,
        work_days,
        performance_score,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    const { data: employees, error } = await query;

    if (error) {
      console.error('❌ Query error:', error);
      return;
    }

    console.log('✅ Query successful!');
    console.log('Employee count:', employees?.length || 0);
    
    if (employees && employees.length > 0) {
      console.log('Sample employee:', JSON.stringify(employees[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testEndpoint();