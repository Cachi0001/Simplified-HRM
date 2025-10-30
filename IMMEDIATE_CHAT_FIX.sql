-- IMMEDIATE CHAT FIX - Run this to get chat working
-- This creates the minimal required tables and data

-- 1. Ensure the current user exists in employees table
INSERT INTO employees (id, email, full_name, role, status, active) 
VALUES (
  '38c01fbd-33f2-4c50-a7e6-c18f1e4bdd80',
  'current.user@test.com', 
  'Current User',
  'admin',
  'active',
  true
) ON CONFLICT (id) DO UPDATE SET 
  active = true,
  status = 'active';

-- 2. Create test employees for chat
INSERT INTO employees (id, email, full_name, role, status, active) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'john.doe@test.com', 'John Doe', 'employee', 'active', true),
  ('22222222-2222-2222-2222-222222222222', 'jane.smith@test.com', 'Jane Smith', 'employee', 'active', true),
  ('33333333-3333-3333-3333-333333333333', 'hr.manager@test.com', 'HR Manager', 'hr', 'active', true)
ON CONFLICT (email) DO UPDATE SET 
  active = true,
  status = 'active';

-- 3. Drop and recreate chat_messages table with correct structure
DROP TABLE IF EXISTS public.chat_messages CASCADE;

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id VARCHAR(255) NOT NULL,
    sender_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- 5. Enable RLS and create policies
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send and view messages" ON public.chat_messages
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (sender_id = auth.uid());

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

-- 7. Ensure chat_unread_count table exists with correct structure
-- (Keep existing data if table exists)
CREATE TABLE IF NOT EXISTS public.chat_unread_count (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    chat_id VARCHAR(255) NOT NULL,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

-- 8. Create indexes for unread count
CREATE INDEX IF NOT EXISTS idx_chat_unread_count_user_chat ON public.chat_unread_count(user_id, chat_id);

-- 9. Enable RLS for unread count
ALTER TABLE public.chat_unread_count ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their unread counts" ON public.chat_unread_count
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_unread_count TO authenticated;

-- 11. Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Enable RLS for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can read announcements" ON public.announcements
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'hr', 'super-admin')
        )
    );

-- 13. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- 14. Insert sample announcement
INSERT INTO announcements (title, content, author_id, priority) 
VALUES (
    'Welcome to the Chat System',
    'The chat system is now available for all employees. You can send direct messages and participate in group discussions.',
    '38c01fbd-33f2-4c50-a7e6-c18f1e4bdd80',
    'normal'
) ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 'Employees' as table_name, count(*) as count FROM employees WHERE active = true
UNION ALL
SELECT 'Chat Messages' as table_name, count(*) as count FROM chat_messages
UNION ALL
SELECT 'Announcements' as table_name, count(*) as count FROM announcements;