// Simple Realtime test using service role to bypass RLS
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xabdbqfxjxmslmbqujhz.supabase.co';
// Using service role key to bypass RLS policies
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmRicWZ4anhtc2xtYnF1amh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxNzQ0NSwiZXhwIjoyMDc2OTkzNDQ1fQ.eZNs-l54JgknM_HQpGsWCyHd6AYVuXAiu7oKm6jUyAw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
    heartbeatIntervalMs: 30000,
  },
});

async function testRealtime() {
  console.log('🧪 Testing Supabase Realtime (Service Role)...');
  
  const testChatId = 'test-' + Date.now();
  const testEmployeeId = '4e9d72ae-20da-48d0-84ac-24a64a57133e'; // Real employee ID
  let messageReceived = false;
  
  // Verify employee exists
  console.log('🔍 Verifying employee exists...');
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, full_name')
    .eq('id', testEmployeeId)
    .single();
  
  if (empError || !employee) {
    console.log('❌ Employee not found:', empError?.message);
    return;
  }
  console.log('✅ Employee found:', employee.full_name);
  
  // Set up subscription (matching the real hook exactly)
  const channel = supabase
    .channel(`chat_${testChatId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public', 
      table: 'chat_messages',
      filter: `chat_id=eq.${testChatId}`
    }, (payload) => {
      console.log('✅ Realtime message received!', payload.new);
      messageReceived = true;
    })
    .subscribe((status) => {
      console.log('📡 Subscription status:', status);
    });
  
  // Wait longer for subscription to be fully established
  console.log('⏳ Waiting for subscription to be ready...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Insert test message
  console.log('📤 Inserting test message...');
  const { error } = await supabase.from('chat_messages').insert({
    chat_id: testChatId,
    sender_id: testEmployeeId,
    sender_full_name: 'Caleb Test User',
    message: 'Hello Realtime!',
    timestamp: new Date().toISOString(),
    message_type: 'text',
    chat_type: 'dm'
  });
  
  if (error) {
    console.log('❌ Insert failed:', error.message);
  } else {
    console.log('✅ Message inserted');
  }
  
  // Wait longer for realtime event to be processed
  console.log('⏳ Waiting for realtime event...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log(messageReceived ? '🎉 Realtime working!' : '❌ Realtime not working');
  
  // Cleanup
  await supabase.from('chat_messages').delete().eq('chat_id', testChatId);
  await channel.unsubscribe();
}

testRealtime().catch(console.error);