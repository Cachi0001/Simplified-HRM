-- Migration 002: Chat Features - Read Receipts, Unread Count, Notifications
-- This migration adds support for:
-- 1. Read receipts on chat messages
-- 2. Unread message counters
-- 3. Notification system

-- 1. Add read_at column to chat_messages for read receipts
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON public.chat_messages(read_at);

-- 2. Create chat_unread_count table for tracking unread messages per user per chat
CREATE TABLE if not exists public.chat_unread_count (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('chat', 'leave', 'purchase', 'task', 'birthday', 'checkout')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add push_token column to auth.users for FCM notifications
ALTER TABLE public.employees
ADD COLUMN push_token TEXT DEFAULT NULL;

-- 6. Create typing_status table for real-time typing indicators
CREATE TABLE IF NOT EXISTS public.typing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(chat_id, user_id)
);

-- 7. Create indexes for typing status
CREATE INDEX IF NOT EXISTS idx_typing_status_chat_id ON public.typing_status(chat_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_expires_at ON public.typing_status(expires_at);
CREATE INDEX IF NOT EXISTS idx_typing_status_user_id ON public.typing_status(user_id);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_unread_count_user_chat ON public.chat_unread_count(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- End of migration 002