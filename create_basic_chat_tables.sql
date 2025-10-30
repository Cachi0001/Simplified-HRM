-- Create basic chat tables for immediate functionality

-- Create chat_messages table with minimal structure
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id VARCHAR(255) NOT NULL,
    sender_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for chat messages
CREATE POLICY "Users can view and send messages" ON public.chat_messages
    FOR ALL TO authenticated
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

-- Create chat_unread_count table if it doesn't exist with correct structure
CREATE TABLE IF NOT EXISTS public.chat_unread_count (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id VARCHAR(255) NOT NULL,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_unread_count_user_chat ON public.chat_unread_count(user_id, chat_id);

-- Enable RLS
ALTER TABLE public.chat_unread_count ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own unread counts" ON public.chat_unread_count
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_unread_count TO authenticated;