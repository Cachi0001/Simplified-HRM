import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'backend/.env') });

async function fixDatabaseIssues() {
  console.log('🔧 Database Auto-Fix Tool');
  console.log('=' .repeat(50));

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('\n🔍 Checking for common issues...');

    // 1. Check if employees table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('❌ Employees table does not exist');
      console.log('💡 You need to run the schema.sql file in Supabase SQL editor');
      console.log('📄 See database/schema.sql for the complete schema');
      return;
    }

    // 2. Check for the problematic user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const problemUser = users.find(u => u.email === 'passioncaleb5@gmail.com');

    if (problemUser) {
      console.log(`✅ Found user: ${problemUser.email}`);

      // 3. Check if employee record exists
      const { data: empRecord, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', problemUser.id)
        .single();

      if (empError && empError.code === 'PGRST116') {
        console.log('❌ No employee record found for user');
        console.log('🔄 Creating employee record...');

        const { error: createError } = await supabase
          .from('employees')
          .insert({
            user_id: problemUser.id,
            full_name: 'Passion Caleb', // You should get this from the signup data
            email: problemUser.email,
            role: 'employee',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createError) {
          console.error('❌ Failed to create employee record:', createError);
        } else {
          console.log('✅ Employee record created successfully');
        }
      } else if (empRecord) {
        console.log('✅ Employee record already exists');
        console.log('   Status:', empRecord.status);

        if (empRecord.status === 'pending') {
          console.log('🔄 Employee is pending approval - this is normal');
        }
      }

      // 4. Check if email exists in employees table (duplicate check)
      const { data: emailCheck, error: emailError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', problemUser.email);

      if (emailError) {
        console.error('❌ Error checking for duplicate emails:', emailError);
      } else if (emailCheck && emailCheck.length > 1) {
        console.log('❌ Duplicate email found in employees table');
        console.log('🔄 Cleaning up duplicates...');

        // Keep the first record, delete others
        const recordsToDelete = emailCheck.slice(1);
        for (const record of recordsToDelete) {
          await supabase.from('employees').delete().eq('id', record.id);
        }
        console.log(`✅ Deleted ${recordsToDelete.length} duplicate records`);
      }
    } else {
      console.log('❌ Problem user not found in auth system');
    }

    console.log('\n✅ Database check complete');
    console.log('💡 Try signing up again now');

  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
  }
}

// Run the fix tool
fixDatabaseIssues().catch(console.error);
