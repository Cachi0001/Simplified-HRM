import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatMessageStatus } from '../types/chat';


export const useRealtimeChat = (chatId: string | null) => {
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  
  const subscribeToChat = useCallback(async () => {
    if (!chatId) {
      setIsSubscribed(false);
      return;
    }

    try {
      const { supabase } = await import('../lib/supabase');

      console.info(`🔗 Subscribing to chat realtime: ${chatId}`);

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
            console.info('📨 New message received:', payload);
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
            console.info('✏️  Message updated:', payload);
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
            console.info('🗑️  Message deleted:', payload);
            setRealtimeMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          }
        )
        .subscribe(async (status: string) => {
          console.info(`📡 Subscription status: ${status}`);
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
      console.error('❌ Failed to subscribe to chat:', errorMessage);
      setError(errorMessage);
      setIsSubscribed(false);
    }
  }, [chatId]);

  const unsubscribeFromChat = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsSubscribed(false);
        console.info('🔌 Unsubscribed from chat realtime');
      } catch (err) {
        console.error('Error unsubscribing:', err);
      }
    }
  }, []);

  useEffect(() => {
    subscribeToChat();

    return () => {
      unsubscribeFromChat();
    };
  }, [chatId, subscribeToChat, unsubscribeFromChat]);

  const clearRealtimeMessages = useCallback(() => {
    setRealtimeMessages([]);
  }, []);


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
    timestamp: data.timestamp || data.sent_at || data.created_at || new Date().toISOString(),
    created_at: data.created_at || data.timestamp || new Date().toISOString(),
    sent_at: data.sent_at || null,
    delivered_at: data.delivered_at || null,
    read_at: data.read_at || null,
    edited_at: data.edited_at || null,
    senderName: data.sender_name || data.senderName,
    senderAvatar: data.sender_avatar || data.senderAvatar,
  };
}

export default useRealtimeChat;