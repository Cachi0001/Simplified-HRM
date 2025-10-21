import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'backend/.env') });

async function debugDatabase() {
  console.log('🔍 Database Debug Tool');
  console.log('=' .repeat(50));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration:');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    console.error('   Current working directory:', process.cwd());
    console.error('   __dirname:', __dirname);
    return;
  }

  console.log('✅ Supabase configuration found');
  console.log('🔗 URL:', supabaseUrl.substring(0, 50) + '...');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('\n📋 Checking database tables...');

    // Check if employees table exists
    console.log('\n🔍 Checking employees table...');
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);

    if (employeeError) {
      console.error('❌ Employees table error:');
      console.error('   Message:', employeeError.message);
      console.error('   Details:', employeeError.details);
      console.error('   Hint:', employeeError.hint);
      console.error('   Code:', employeeError.code);
    } else {
      console.log('✅ Employees table exists');
      console.log('   Sample data:', employeeData);
    }

    // Check auth users
    console.log('\n👤 Checking Supabase auth users...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Auth users error:');
      console.error('   Message:', usersError.message);
      console.error('   Status:', usersError.status);
    } else {
      console.log(`✅ Found ${users.length} auth users`);

      // Check for the specific user causing issues
      const testUser = users.find(u => u.email === 'passioncaleb5@gmail.com');
      if (testUser) {
        console.log('\n🔍 Found problematic user in auth:');
        console.log('   ID:', testUser.id);
        console.log('   Email:', testUser.email);
        console.log('   Confirmed:', testUser.email_confirmed_at ? '✅' : '❌');
        console.log('   Created:', testUser.created_at);
        console.log('   User metadata:', testUser.user_metadata);
        console.log('   Raw user metadata:', testUser.raw_user_meta_data);
      } else {
        console.log('\n❌ Problematic user not found in auth users');
      }
    }

    // Check if employee record exists for the test user
    if (users && users.length > 0) {
      const testUser = users.find(u => u.email === 'passioncaleb5@gmail.com');
      if (testUser) {
        console.log('\n🔍 Checking if employee record exists for test user...');
        const { data: empRecord, error: empRecordError } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', testUser.id)
          .single();

        if (empRecordError) {
          if (empRecordError.code === 'PGRST116') {
            console.log('❌ No employee record found for user', testUser.id);
          } else {
            console.error('❌ Error checking employee record:');
            console.error('   Message:', empRecordError.message);
            console.error('   Code:', empRecordError.code);
          }
        } else {
          console.log('✅ Employee record found:');
          console.log('   ID:', empRecord.id);
          console.log('   Name:', empRecord.full_name);
          console.log('   Email:', empRecord.email);
          console.log('   Role:', empRecord.role);
          console.log('   Status:', empRecord.status);
        }

        // Also check by email
        console.log('\n🔍 Checking if employee record exists by email...');
        const { data: empByEmail, error: empByEmailError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', 'passioncaleb5@gmail.com')
          .single();

        if (empByEmailError) {
          if (empByEmailError.code === 'PGRST116') {
            console.log('❌ No employee record found for email passioncaleb5@gmail.com');
          } else {
            console.error('❌ Error checking employee by email:');
            console.error('   Message:', empByEmailError.message);
            console.error('   Code:', empByEmailError.code);
          }
        } else {
          console.log('✅ Employee record found by email:');
          console.log('   ID:', empByEmail.id);
          console.log('   User ID:', empByEmail.user_id);
          console.log('   Name:', empByEmail.full_name);
          console.log('   Email:', empByEmail.email);
          console.log('   Role:', empByEmail.role);
          console.log('   Status:', empByEmail.status);
        }
      }
    }

    // Test database permissions
    console.log('\n🔐 Testing database permissions...');
    try {
      const testEmployee = {
        user_id: 'test-user-id-123',
        full_name: 'Test User Debug',
        email: 'test-debug@example.com',
        role: 'employee',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: testInsertError } = await supabase
        .from('employees')
        .insert(testEmployee);

      if (testInsertError) {
        console.error('❌ Test insertion failed:');
        console.error('   Message:', testInsertError.message);
        console.error('   Details:', testInsertError.details);
        console.error('   Hint:', testInsertError.hint);
        console.error('   Code:', testInsertError.code);

        if (testInsertError.message.includes('duplicate key')) {
          console.log('💡 Duplicate key error - email already exists');
        } else if (testInsertError.message.includes('violates row-level security')) {
          console.log('💡 RLS policy violation - insufficient permissions');
        } else if (testInsertError.message.includes('column') && testInsertError.message.includes('does not exist')) {
          console.log('💡 Column missing - schema mismatch');
        }
      } else {
        console.log('✅ Test insertion successful!');
        // Clean up test record
        await supabase
          .from('employees')
          .delete()
          .eq('user_id', 'test-user-id-123');
        console.log('🧹 Test record cleaned up');
      }
    } catch (testError) {
      console.error('❌ Test insertion threw exception:', testError);
    }

  } catch (error) {
    console.error('❌ Unexpected error during database debug:');
    console.error('   Error:', error);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🔍 Database Debug Complete');
  console.log('\n💡 Next Steps:');
  console.log('1. Run this script: node debug-database.js');
  console.log('2. Check the output for specific error details');
  console.log('3. Update database schema if needed');
  console.log('4. Fix RLS policies if permission errors');
}

// Run the debug tool
debugDatabase().catch(console.error);
