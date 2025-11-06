// Quick script to get a real user ID for testing
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xabdbqfxjxmslmbqujhz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmRicWZ4anhtc2xtYnF1amh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTc0NDUsImV4cCI6MjA3Njk5MzQ0NX0.oSu0VxML-GycmvL7btvYwmh1MoGQY57G42X_KB82yuU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getUserId() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(1);
    
    if (error) {
      console.log('Error:', error.message);
      return;
    }
    
    if (users && users.length > 0) {
      console.log('Real user found:');
      console.log('ID:', users[0].id);
      console.log('Email:', users[0].email);
      console.log('Name:', users[0].full_name);
    } else {
      console.log('No users found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getUserId();