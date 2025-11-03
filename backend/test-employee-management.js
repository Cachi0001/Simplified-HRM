const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEmployeeManagement() {
  try {
    console.log('Testing get_all_employees_for_management function...');
    
    const { data, error } = await supabase
      .rpc('get_all_employees_for_management', {
        p_requester_role: 'admin',
        p_requester_id: '00000000-0000-0000-0000-000000000000'
      });

    if (error) {
      console.error('Function call error:', error);
      return;
    }

    console.log('Function result:', JSON.stringify(data, null, 2));
    
    if (data && data.success) {
      console.log('✅ Function works! Employee count:', data.employees?.length || 0);
    } else {
      console.log('❌ Function returned error:', data?.error);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

testEmployeeManagement();