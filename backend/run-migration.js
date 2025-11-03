const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function runMigration() {
  try {
    console.log('🚀 Starting leave request JSON coercion fix migration...');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read the migration file
    const migrationPath = path.join(__dirname, 'database/migrations/028_fix_leave_request_json_coercion.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Migration SQL loaded successfully');
    console.log('');
    console.log('⚠️  IMPORTANT: This migration needs to be run manually in Supabase SQL Editor');
    console.log('');
    console.log('Instructions:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Navigate to your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Click "New Query"');
    console.log('5. Copy and paste the SQL below');
    console.log('6. Click "Run"');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ After running the SQL, the leave request JSON coercion issue will be fixed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();