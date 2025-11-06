// Basic Realtime connection test
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xabdbqfxjxmslmbqujhz.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmRicWZ4anhtc2xtYnF1amh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxNzQ0NSwiZXhwIjoyMDc2OTkzNDQ1fQ.eZNs-l54JgknM_HQpGsWCyHd6AYVuXAiu7oKm6jUyAw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
    heartbeatIntervalMs: 30000,
  },
});

async function testBasicRealtime() {
  console.log('🧪 Testing basic Realtime connection...');
  
  // Test 1: Check if we can connect to Realtime
  const channel = supabase.channel('test-connection');
  
  let connected = false;
  
  channel.subscribe((status) => {
    console.log('📡 Connection status:', status);
    if (status === 'SUBSCRIBED') {
      connected = true;
      console.log('✅ Realtime connection successful!');
    } else if (status === 'TIMED_OUT') {
      console.log('❌ Realtime connection timed out');
    } else if (status === 'CLOSED') {
      console.log('📡 Connection closed');
    }
  });
  
  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  if (connected) {
    console.log('🎉 Supabase Realtime is working!');
  } else {
    console.log('❌ Supabase Realtime connection failed');
    console.log('💡 This might indicate:');
    console.log('   - Realtime is not enabled in Supabase project');
    console.log('   - Network connectivity issues');
    console.log('   - Configuration problems');
  }
  
  // Cleanup
  await channel.unsubscribe();
}

testBasicRealtime().catch(console.error);