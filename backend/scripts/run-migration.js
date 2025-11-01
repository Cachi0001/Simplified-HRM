const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    try {
        console.log('Starting chat enhancements migration...');
        
        // Since Supabase doesn't support direct SQL execution via API for DDL,
        // we'll need to run this migration manually in the Supabase dashboard
        // or use a different approach
        
        console.log('Note: This migration needs to be run manually in Supabase dashboard');
        console.log('Please copy the SQL from database/migrations/019_chat_enhancements_comprehensive.sql');
        console.log('and run it in the Supabase SQL editor.');
        
        // For now, let's just verify if the tables exist
        console.log('Checking existing tables...');
        
        try {
            // Try to query existing tables to see what's already there
            const { data: users } = await supabase.from('users').select('id').limit(1);
            console.log('✓ Users table exists');
            
            const { data: announcements } = await supabase.from('announcements').select('id').limit(1);
            console.log('✓ Announcements table exists');
            
            const { data: notifications } = await supabase.from('notifications').select('id').limit(1);
            console.log('✓ Notifications table exists');
            
            const { data: departments } = await supabase.from('departments').select('id').limit(1);
            console.log('✓ Departments table exists');
            
        } catch (error) {
            console.log('Some base tables may not exist yet');
        }
        
        // Try to check new tables
        try {
            const { data: indicators } = await supabase.from('message_indicators').select('id').limit(1);
            console.log('✓ Message indicators table exists');
        } catch (error) {
            console.log('✗ Message indicators table needs to be created');
        }
        
        try {
            const { data: reactions } = await supabase.from('announcement_reactions').select('id').limit(1);
            console.log('✓ Announcement reactions table exists');
        } catch (error) {
            console.log('✗ Announcement reactions table needs to be created');
        }
        
        try {
            const { data: approvals } = await supabase.from('request_approvals').select('id').limit(1);
            console.log('✓ Request approvals table exists');
        } catch (error) {
            console.log('✗ Request approvals table needs to be created');
        }
        
        try {
            const { data: logs } = await supabase.from('conversation_access_logs').select('id').limit(1);
            console.log('✓ Conversation access logs table exists');
        } catch (error) {
            console.log('✗ Conversation access logs table needs to be created');
        }
        
        try {
            const { data: typing } = await supabase.from('typing_indicators').select('id').limit(1);
            console.log('✓ Typing indicators table exists');
        } catch (error) {
            console.log('✗ Typing indicators table needs to be created');
        }
        
        try {
            const { data: tasks } = await supabase.from('tasks').select('id').limit(1);
            console.log('✓ Tasks table exists');
            
            // Try to check if the expected columns exist
            try {
                const { data: taskColumns } = await supabase.from('tasks').select('assigner_id, assignee_id').limit(1);
                console.log('✓ Tasks table has assigner_id and assignee_id columns');
            } catch (columnError) {
                console.log('✗ Tasks table missing assigner_id or assignee_id columns');
                console.log('   This might cause index creation errors in the migration');
            }
        } catch (error) {
            console.log('✗ Tasks table needs to be created');
        }
        
        console.log('\nMigration check completed!');
        console.log('If any tables are missing, please run the SQL migration manually in Supabase dashboard.');
        console.log('The migration has been updated to handle existing table structures safely.');
        
    } catch (error) {
        console.error('Migration check failed:', error);
        process.exit(1);
    }
}

// Run the migration
runMigration();