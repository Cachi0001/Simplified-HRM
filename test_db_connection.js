const { createClient } = require('@supabase/supabase-js');

// Test database connection and run the migration
async function testConnection() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-key';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('employees').select('count').limit(1);
    
    if (error) {
      console.error('Database connection failed:', error);
      return;
    }
    
    console.log('Database connection successful!');
    
    // Test if our functions exist
    const { data: functionTest, error: functionError } = await supabase
      .rpc('get_all_employees_for_management', {
        p_requester_role: 'admin',
        p_requester_id: '00000000-0000-0000-0000-000000000000'
      });
    
    if (functionError) {
      console.log('Function not found, need to run migration:', functionError.message);
    } else {
      console.log('Functions are working!');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection();