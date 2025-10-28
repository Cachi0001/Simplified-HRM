import { useEffect, useRef, useCallback, useState } from 'react';
import { ChatMessage, ChatMessageStatus } from '../types/chat';
import logger from '../utils/logger';

/**
 * Hook for real-time chat updates via Supabase Realtime
 * Handles new messages, message updates, and message deletions
 */
export const useRealtimeChat = (chatId: string | null) => {
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  /**
   * Initialize Supabase Realtime subscription
   */
  const subscribeToChat = useCallback(async () => {
    if (!chatId) {
      setIsSubscribed(false);
      return;
    }

    try {
      // Import supabase client
      const { supabase } = await import('../lib/supabase');

      logger.info(`🔗 Subscribing to chat realtime: ${chatId}`);

      // Subscribe to chat_messages changes for this chat
      const subscription = supabase
        .channel(`chat:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload: any) => {
            logger.info('📨 New message received:', payload);
            const newMessage = transformSupabaseMessage(payload.new);
            setRealtimeMessages((prev) => [...prev, newMessage]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload: any) => {
            logger.info('✏️  Message updated:', payload);
            const updatedMessage = transformSupabaseMessage(payload.new);
            setRealtimeMessages((prev) =>
              prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload: any) => {
            logger.info('🗑️  Message deleted:', payload);
            setRealtimeMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          }
        )
        .subscribe(async (status: string) => {
          logger.info(`📡 Subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            setIsSubscribed(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            setError('Failed to subscribe to chat updates');
            setIsSubscribed(false);
          }
        });

      subscriptionRef.current = subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('❌ Failed to subscribe to chat:', errorMessage);
      setError(errorMessage);
      setIsSubscribed(false);
    }
  }, [chatId]);

  /**
   * Unsubscribe from realtime updates
   */
  const unsubscribeFromChat = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsSubscribed(false);
        logger.info('🔌 Unsubscribed from chat realtime');
      } catch (err) {
        logger.error('Error unsubscribing:', err);
      }
    }
  }, []);

  /**
   * Effect: Subscribe when chatId changes
   */
  useEffect(() => {
    subscribeToChat();

    return () => {
      unsubscribeFromChat();
    };
  }, [chatId, subscribeToChat, unsubscribeFromChat]);

  /**
   * Clear realtime messages
   */
  const clearRealtimeMessages = useCallback(() => {
    setRealtimeMessages([]);
  }, []);

  /**
   * Get current message status (for showing in UI)
   */
  const getMessageStatus = useCallback((message: ChatMessage): ChatMessageStatus => {
    if (message.read_at) return 'read';
    if (message.delivered_at) return 'delivered';
    if (message.sent_at) return 'sent';
    return 'sending';
  }, []);

  return {
    realtimeMessages,
    isSubscribed,
    error,
    clearRealtimeMessages,
    getMessageStatus,
    subscribeToChat,
    unsubscribeFromChat,
  };
};

/**
 * Transform Supabase message object to ChatMessage type
 */
function transformSupabaseMessage(data: any): ChatMessage {
  return {
    id: data.id,
    chat_id: data.chat_id,
    sender_id: data.sender_id,
    message: data.message,
    sent_at: data.sent_at,
    delivered_at: data.delivered_at || null,
    read_at: data.read_at || null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    edited_at: data.edited_at || null,
  };
}

export default useRealtimeChat;