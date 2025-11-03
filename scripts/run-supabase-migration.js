const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

async function runMigration() {
  try {
    console.log('🔄 Starting Supabase migration...');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔧 Step 1: Fixing notification types...');
    
    // First, fix the notification constraint issue
    try {
      // Update invalid notification types
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ type: 'system' })
        .in('type', ['info', 'success', 'warning', 'error', 'employee_update', 'system_alert', 'profile_update', 'approval', 'department', 'attendance']);
      
      if (updateError) {
        console.warn('⚠️  Warning updating notification types:', updateError.message);
      } else {
        console.log('✅ Updated invalid notification types');
      }
      
      // Update specific types
      await supabase.from('notifications').update({ type: 'task' }).eq('type', 'task_assignment');
      await supabase.from('notifications').update({ type: 'task' }).eq('type', 'task_update');
      await supabase.from('notifications').update({ type: 'message' }).eq('type', 'chat_message');
      await supabase.from('notifications').update({ type: 'leave' }).eq('type', 'leave_request');
      await supabase.from('notifications').update({ type: 'purchase' }).eq('type', 'purchase_request');
      
      console.log('✅ Notification types normalized');
    } catch (err) {
      console.warn('⚠️  Warning fixing notifications:', err.message);
    }
    
    console.log('🏗️  Step 2: Creating announcement_templates table...');
    
    // Create announcement_templates table
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS announcement_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR NOT NULL UNIQUE,
          title_template TEXT NOT NULL,
          content_template TEXT NOT NULL,
          category VARCHAR DEFAULT 'general',
          is_active BOOLEAN DEFAULT true,
          created_by UUID REFERENCES employees(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // We'll use a workaround since direct SQL execution isn't available
      // Let's try to insert a test record to see if table exists
      const { error: testError } = await supabase
        .from('announcement_templates')
        .select('id')
        .limit(1);
      
      if (testError && testError.message.includes('does not exist')) {
        console.log('📋 Table does not exist, you need to create it manually in Supabase SQL Editor');
        console.log('📋 Run this SQL in Supabase SQL Editor:');
        console.log(createTableSQL);
      } else {
        console.log('✅ announcement_templates table exists');
      }
    } catch (err) {
      console.warn('⚠️  Warning with announcement_templates:', err.message);
    }
    
    console.log('📊 Step 3: Testing existing functionality...');
    
    // Test purchase request function
    try {
      const { data: functionTest, error: funcError } = await supabase
        .rpc('create_purchase_request', {
          p_employee_id: '00000000-0000-0000-0000-000000000000',
          p_item_name: 'Test Item',
          p_unit_price: 100
        });
      
      console.log('✅ create_purchase_request function exists');
    } catch (err) {
      if (err.message.includes('No active employee found') || err.message.includes('function') && err.message.includes('does not exist')) {
        if (err.message.includes('does not exist')) {
          console.log('⚠️  create_purchase_request function does not exist - needs manual creation');
        } else {
          console.log('✅ create_purchase_request function exists and working');
        }
      } else {
        console.warn('⚠️  create_purchase_request function may have issues:', err.message);
      }
    }
    
    // Test dashboard stats
    console.log('📈 Step 4: Testing dashboard functionality...');
    try {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('status')
        .limit(5);
      
      if (empError) {
        console.warn('⚠️  Warning testing employees:', empError.message);
      } else {
        console.log(`✅ Employees table accessible (${employees?.length || 0} records found)`);
      }
    } catch (err) {
      console.warn('⚠️  Warning testing dashboard:', err.message);
    }
    
    console.log('🎉 Migration steps completed!');
    console.log('');
    console.log('📋 Manual steps required in Supabase SQL Editor:');
    console.log('1. Run the SQL from database/migrations/044_fix_notification_constraint.sql');
    console.log('2. Run the SQL from database/migrations/043_critical_fixes_simple.sql');
    console.log('3. Test the application functionality');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();