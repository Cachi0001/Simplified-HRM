const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAllLeaveRequests() {
  try {
    console.log('Testing database function get_all_leave_requests...');
    
    const { data, error } = await supabase
      .rpc('get_all_leave_requests', {
        p_status: null
      });

    if (error) {
      console.error('❌ Database function error:', error);
    } else {
      console.log('✅ Database function result:', data);
      if (data && data.length > 0) {
        console.log('First leave request:', JSON.stringify(data[0], null, 2));
      } else {
        console.log('No leave requests found');
      }
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAllLeaveRequests();