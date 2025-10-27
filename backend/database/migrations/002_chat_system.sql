-- Chat System Database Migration
-- This migration adds tables for the real-time chat and notification system

-- 1. Add new columns to existing tables
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS push_token VARCHAR(500) DEFAULT NULL;

-- 2. Create chat_unread_count table for efficient unread counting
CREATE TABLE IF NOT EXISTS chat_unread_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  unread_count INT NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, chat_id)
);

-- 3. Create notifications table for storing all notification types
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  related_id UUID DEFAULT NULL,
  action_url VARCHAR(500) DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  CONSTRAINT valid_notification_type CHECK (type IN ('chat', 'leave', 'purchase', 'task', 'birthday', 'checkout', 'announcement'))
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_unread_count_user_id ON chat_unread_count(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_unread_count_chat_id ON chat_unread_count(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;

-- 5. Create function to auto-update chat_unread_count when messages are created
CREATE OR REPLACE FUNCTION update_unread_count_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread count for all chat participants except sender
  INSERT INTO chat_unread_count (user_id, chat_id, unread_count, updated_at)
  SELECT 
    cp.user_id,
    NEW.chat_id,
    1,
    NOW()
  FROM chat_participants cp
  WHERE cp.chat_id = NEW.chat_id AND cp.user_id != NEW.sender_id
  ON CONFLICT (user_id, chat_id) DO UPDATE SET
    unread_count = chat_unread_count.unread_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-incrementing unread count
DROP TRIGGER IF NOT EXISTS trigger_update_unread_count ON chat_messages;
CREATE TRIGGER trigger_update_unread_count
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_unread_count_on_message_insert();

-- 6. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_unread_count;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;