// Get real employee ID for testing
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xabdbqfxjxmslmbqujhz.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmRicWZ4anhtc2xtYnF1amh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxNzQ0NSwiZXhwIjoyMDc2OTkzNDQ1fQ.eZNs-l54JgknM_HQpGsWCyHd6AYVuXAiu7oKm6jUyAw';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function getEmployeeId() {
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, email, full_name')
      .limit(1);
    
    if (error) {
      console.log('Error:', error.message);
      return;
    }
    
    if (employees && employees.length > 0) {
      console.log('Real employee found:');
      console.log('ID:', employees[0].id);
      console.log('Email:', employees[0].email);
      console.log('Name:', employees[0].full_name);
    } else {
      console.log('No employees found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getEmployeeId();