// Debug Realtime configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xabdbqfxjxmslmbqujhz.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmRicWZ4anhtc2xtYnF1amh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxNzQ0NSwiZXhwIjoyMDc2OTkzNDQ1fQ.eZNs-l54JgknM_HQpGsWCyHd6AYVuXAiu7oKm6jUyAw';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugRealtime() {
  console.log('🔍 Debugging Supabase Realtime configuration...');
  
  try {
    // Test 1: Check if we can query the realtime publication
    console.log('1. Checking realtime publication...');
    const { data: publications, error: pubError } = await supabase
      .from('pg_publication')
      .select('*')
      .eq('pubname', 'supabase_realtime');
    
    if (pubError) {
      console.log('❌ Cannot query publications:', pubError.message);
    } else {
      console.log('✅ Publications found:', publications?.length || 0);
    }

    // Test 2: Check if chat_messages is in the publication
    console.log('2. Checking if chat_messages is in realtime publication...');
    const { data: pubTables, error: tablesError } = await supabase
      .from('pg_publication_tables')
      .select('*')
      .eq('pubname', 'supabase_realtime')
      .eq('tablename', 'chat_messages');
    
    if (tablesError) {
      console.log('❌ Cannot query publication tables:', tablesError.message);
    } else {
      console.log('✅ chat_messages in publication:', pubTables?.length > 0 ? 'YES' : 'NO');
      if (pubTables?.length > 0) {
        console.log('📋 Publication details:', pubTables[0]);
      }
    }

    // Test 3: Try a simple realtime connection with different settings
    console.log('3. Testing realtime connection with different settings...');
    
    const testClient = createClient(supabaseUrl, serviceRoleKey, {
      realtime: {
        params: {
          eventsPerSecond: 1,
        },
        heartbeatIntervalMs: 10000,
        logger: (level, message, details) => {
          console.log(`📡 Realtime [${level}]:`, message, details);
        }
      },
    });

    let connectionStatus = 'unknown';
    
    const channel = testClient
      .channel('debug-test')
      .subscribe((status) => {
        connectionStatus = status;
        console.log('📡 Connection status changed to:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connection successful!');
        } else if (status === 'TIMED_OUT') {
          console.log('❌ Realtime connection timed out');
          console.log('💡 Possible issues:');
          console.log('   - Realtime is disabled in Supabase project settings');
          console.log('   - Network firewall blocking WebSocket connections');
          console.log('   - Supabase project is paused or has issues');
        } else if (status === 'CLOSED') {
          console.log('📡 Connection closed');
        }
      });

    // Wait for connection result
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('🎯 Final connection status:', connectionStatus);
    
    // Cleanup
    await channel.unsubscribe();
    
    // Test 4: Check project status
    console.log('4. Checking project health...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('chat_messages')
      .select('count', { count: 'exact', head: true });
    
    if (healthError) {
      console.log('❌ Project health check failed:', healthError.message);
    } else {
      console.log('✅ Project is healthy and accessible');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugRealtime().catch(console.error);