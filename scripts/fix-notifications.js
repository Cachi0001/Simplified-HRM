const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });

async function fixNotifications() {
  try {
    console.log('🔧 Fixing notification constraint issues...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Step 1: Check current notification types
    console.log('📊 Checking current notification types...');
    const { data: typeCheck, error: typeError } = await supabase
      .from('notifications')
      .select('type')
      .limit(1000);
    
    if (typeError) {
      console.error('❌ Error checking types:', typeError.message);
      return;
    }
    
    // Get unique types
    const uniqueTypes = [...new Set(typeCheck.map(n => n.type))];
    console.log('📋 Current notification types:', uniqueTypes);
    
    // Step 2: Update invalid types one by one
    const validTypes = ['announcement', 'reaction', 'message', 'system', 'request', 'task', 'leave', 'purchase'];
    const invalidTypes = uniqueTypes.filter(type => !validTypes.includes(type));
    
    console.log('⚠️  Invalid types found:', invalidTypes);
    
    if (invalidTypes.length > 0) {
      console.log('🔄 Updating invalid notification types...');
      
      for (const invalidType of invalidTypes) {
        let newType = 'system'; // Default fallback
        
        // Map specific types
        if (invalidType.includes('task')) newType = 'task';
        else if (invalidType.includes('leave')) newType = 'leave';
        else if (invalidType.includes('purchase')) newType = 'purchase';
        else if (invalidType.includes('message') || invalidType.includes('chat')) newType = 'message';
        else if (invalidType.includes('announcement')) newType = 'announcement';
        else if (invalidType.includes('request') || invalidType.includes('approval')) newType = 'request';
        
        console.log(`   Updating "${invalidType}" → "${newType}"`);
        
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ type: newType })
          .eq('type', invalidType);
        
        if (updateError) {
          console.error(`   ❌ Error updating ${invalidType}:`, updateError.message);
        } else {
          console.log(`   ✅ Updated ${invalidType} to ${newType}`);
        }
      }
    }
    
    // Step 3: Verify all types are now valid
    console.log('🧪 Verifying notification types...');
    const { data: verifyCheck, error: verifyError } = await supabase
      .from('notifications')
      .select('type')
      .limit(1000);
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError.message);
      return;
    }
    
    const finalTypes = [...new Set(verifyCheck.map(n => n.type))];
    const stillInvalid = finalTypes.filter(type => !validTypes.includes(type));
    
    if (stillInvalid.length > 0) {
      console.log('⚠️  Still invalid types:', stillInvalid);
      
      // Force update any remaining invalid types
      for (const type of stillInvalid) {
        await supabase
          .from('notifications')
          .update({ type: 'system' })
          .eq('type', type);
        console.log(`   🔧 Force updated ${type} to system`);
      }
    } else {
      console.log('✅ All notification types are now valid:', finalTypes);
    }
    
    console.log('🎉 Notification types fixed successfully!');
    console.log('');
    console.log('📋 Now you can run this SQL in Supabase SQL Editor:');
    console.log('');
    console.log('-- Drop existing constraint');
    console.log('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;');
    console.log('');
    console.log('-- Add new constraint');
    console.log('ALTER TABLE notifications ADD CONSTRAINT notifications_type_check');
    console.log("    CHECK (type IN ('announcement', 'reaction', 'message', 'system', 'request', 'task', 'leave', 'purchase'));");
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixNotifications();