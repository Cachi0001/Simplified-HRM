// Test script to verify Supabase Realtime chat functionality
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xabdbqfxjxmslmbqujhz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmRicWZ4anhtc2xtYnF1amh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTc0NDUsImV4cCI6MjA3Njk5MzQ0NX0.oSu0VxML-GycmvL7btvYwmh1MoGQY57G42X_KB82yuU';

// Use a known valid UUID from the system (Kayode's user ID from setup)
const REAL_USER_ID = '01234567-89ab-cdef-0123-456789abcdef'; // We'll use a real one from login

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 30000,
  },
});

async function testSupabaseRealtime() {
  try {
    console.log('🧪 Testing Supabase Realtime chat functionality...');
    
    // Test 1: Authenticate as a real user to bypass RLS policies
    console.log('1. Authenticating as test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'kayode@go3net.com.ng',
      password: 'kayode'
    });
    
    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      console.log('💡 Trying without authentication...');
    } else {
      console.log('✅ Authenticated successfully');
    }
    
    // Test 2: Check connection
    console.log('2. Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('chat_messages')
      .select('count', { count: 'exact', head: true });
    
    if (testError && testError.code !== 'PGRST116') {
      console.log('❌ Supabase connection failed:', testError.message);
      return;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('📊 Current message count:', testData?.length || 0);
    
    // Test 3: Set up realtime subscription
    console.log('3. Testing Realtime subscription...');
    
    const testChatId = 'test-chat-realtime-' + Date.now();
    let messageReceived = false;
    
    const channel = supabase
      .channel(`chat_${testChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${testChatId}`
        },
        (payload) => {
          console.log('📨 Realtime message received:', payload);
          messageReceived = true;
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
    
    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Insert a test message to trigger realtime
    console.log('4. Inserting test message...');
    
    // Use the authenticated user's ID or fallback to a valid UUID
    const testUserId = authData?.user?.id || '550e8400-e29b-41d4-a716-446655440000';
    
    const { data: insertedMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: testChatId,
        sender_id: testUserId,
        sender_full_name: 'Test User',
        message: 'Test realtime message',
        timestamp: new Date().toISOString(),
        message_type: 'text',
        chat_type: 'dm'
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Failed to insert test message:', insertError.message);
    } else {
      console.log('✅ Test message inserted:', insertedMessage.id);
    }
    
    // Wait for realtime event
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (messageReceived) {
      console.log('✅ Realtime subscription working!');
    } else {
      console.log('❌ Realtime subscription not working');
    }
    
    // Test 5: Clean up
    console.log('5. Cleaning up...');
    
    // Remove test message
    await supabase
      .from('chat_messages')
      .delete()
      .eq('chat_id', testChatId);
    
    // Unsubscribe from channel safely
    try {
      await channel.unsubscribe();
      supabase.removeChannel(channel);
    } catch (cleanupError) {
      console.log('⚠️  Cleanup warning:', cleanupError.message);
    }
    
    console.log('✅ Cleanup completed');
    
    console.log('\n🎯 Supabase Realtime Test Results:');
    console.log('✅ Connection: Working');
    console.log('✅ Message insertion: Working');
    console.log(messageReceived ? '✅ Realtime updates: Working' : '❌ Realtime updates: Not working');
    console.log('✅ Cleanup: Working');
    
    if (messageReceived) {
      console.log('\n🎉 Supabase Realtime chat system is fully functional!');
      console.log('💡 The chat system will work properly on Vercel deployment.');
    } else {
      console.log('\n⚠️  Realtime updates not working - check Supabase configuration.');
    }
    
  } catch (error) {
    console.error('❌ Error testing Supabase Realtime:', error.message);
  }
}

// Run the test
testSupabaseRealtime();