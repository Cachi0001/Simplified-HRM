import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatMessageStatus, TypingUser } from '../types/chat';


export interface UseRealtimeChatReturn {
  realtimeMessages: ChatMessage[];
  isSubscribed: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  clearRealtimeMessages: () => void;
  getMessageStatus: (message: ChatMessage) => ChatMessageStatus;
  subscribeToChat: () => Promise<void>;
  unsubscribeFromChat: () => Promise<void>;
  reconnect: () => Promise<void>;
}

export const useRealtimeChat = (chatId: string | null): UseRealtimeChatReturn => {
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const subscribeToChat = useCallback(async () => {
    if (!chatId) {
      setIsSubscribed(false);
      setConnectionStatus('disconnected');
      return;
    }

    try {
      setConnectionStatus('connecting');
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
            setRealtimeMessages((prev) => {
              // Avoid duplicates
              const exists = prev.some(msg => msg.id === newMessage.id);
              return exists ? prev : [...prev, newMessage];
            });
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
            setConnectionStatus('connected');
            setError(null);
            reconnectAttempts.current = 0; // Reset on successful connection
          } else if (status === 'CHANNEL_ERROR') {
            setError('Failed to subscribe to chat updates');
            setIsSubscribed(false);
            setConnectionStatus('error');
            
            // Attempt to reconnect
            if (reconnectAttempts.current < maxReconnectAttempts) {
              reconnectAttempts.current++;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
              console.info(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                subscribeToChat();
              }, delay);
            }
          } else if (status === 'CLOSED') {
            setIsSubscribed(false);
            setConnectionStatus('disconnected');
          }
        });

      subscriptionRef.current = subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Failed to subscribe to chat:', errorMessage);
      setError(errorMessage);
      setIsSubscribed(false);
      setConnectionStatus('error');
    }
  }, [chatId]);

  const unsubscribeFromChat = useCallback(async () => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (subscriptionRef.current) {
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsSubscribed(false);
        setConnectionStatus('disconnected');
        console.info('🔌 Unsubscribed from chat realtime');
      } catch (err) {
        console.error('Error unsubscribing:', err);
      }
    }
  }, []);

  const reconnect = useCallback(async () => {
    console.info('🔄 Manual reconnect requested');
    await unsubscribeFromChat();
    reconnectAttempts.current = 0;
    await subscribeToChat();
  }, [unsubscribeFromChat, subscribeToChat]);

  useEffect(() => {
    subscribeToChat();

    return () => {
      unsubscribeFromChat();
    };
  }, [chatId, subscribeToChat, unsubscribeFromChat]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

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
    connectionStatus,
    clearRealtimeMessages,
    getMessageStatus,
    subscribeToChat,
    unsubscribeFromChat,
    reconnect,
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