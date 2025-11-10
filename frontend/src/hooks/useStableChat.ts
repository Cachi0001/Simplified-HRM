// import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import { getChatStateManager, ChatState, UIMessage } from '../services/ChatStateManager';
// import { ChatMessage } from '../types/chat';
// import { apiClient } from '../services/apiClient';

// export interface UseChatOptions {
//   chatId: string | null;
//   autoConnect?: boolean;
//   enableTypingIndicators?: boolean;
// }

// export interface UseChatReturn {
//   // State
//   messages: UIMessage[];
//   unreadCount: number;
//   totalUnreadCount: number;
//   connectionStatus: ChatState['connectionStatus'];
//   isLoading: boolean;
//   error: string | null;
//   typingUsers: string[];
  
//   // Actions
//   sendMessage: (content: string) => Promise<void>;
//   markAsRead: () => void;
//   startTyping: () => void;
//   stopTyping: () => void;
//   loadHistory: () => Promise<void>;
  
//   // Connection management
//   connect: () => Promise<void>;
//   disconnect: () => void;
//   reconnect: () => Promise<void>;
// }

// export function useStableChat(options: UseChatOptions): UseChatReturn {
//   const { chatId, autoConnect = true, enableTypingIndicators = true } = options;
  
//   // Stable references
//   const stateManager = useMemo(() => getChatStateManager(), []);
//   const [state, setState] = useState<ChatState>(() => stateManager.getState());
  
//   // Refs for stable callbacks
//   const chatIdRef = useRef(chatId);
//   const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const isConnectedRef = useRef(false);
  
//   // Update refs when props change
//   useEffect(() => {
//     chatIdRef.current = chatId;
//   }, [chatId]);

//   // Subscribe to state changes
//   useEffect(() => {
//     const unsubscribe = stateManager.subscribe((newState) => {
//       setState(newState);
//     });

//     return unsubscribe;
//   }, [stateManager]);

//   // Set active chat when chatId changes
//   useEffect(() => {
//     stateManager.setActiveChat(chatId);
//   }, [chatId, stateManager]);

//   // Auto-connect when chatId is available
//   useEffect(() => {
//     if (chatId && autoConnect && !isConnectedRef.current) {
//       connect();
//     }
//   }, [chatId, autoConnect]); // connect is stable due to useCallback

//   // Stable action callbacks
//   const sendMessage = useCallback(async (content: string): Promise<void> => {
//     const currentChatId = chatIdRef.current;
//     if (!currentChatId || !content.trim()) return;

//     try {
//       // Create optimistic message
//       const optimisticMessage: UIMessage = {
//         id: `temp-${Date.now()}`,
//         chatId: currentChatId,
//         senderId: 'current-user-id', // This would come from auth
//         content: content.trim(),
//         timestamp: new Date().toISOString(),
//         status: 'sending',
//         isOwn: true,
//       };

//       // Add to state immediately for optimistic UI
//       stateManager.addMessage(currentChatId, optimisticMessage);

//       // Send to server
//       const result = await apiClient.post('/chat/send', {
//         chatId: currentChatId,
//         message: content.trim(),
//       });
      
//       if (result.status === 'success' && result.data?.message) {
//         // Update with server response
//         const serverMessage = result.data.message;
//         const uiMessage: UIMessage = {
//           id: serverMessage.id,
//           chatId: serverMessage.chat_id,
//           senderId: serverMessage.sender_id,
//           content: serverMessage.message,
//           timestamp: serverMessage.timestamp,
//           status: 'sent',
//           isOwn: true,
//         };

//         // Replace optimistic message with real one
//         stateManager.addMessage(currentChatId, uiMessage);
//       }

//     } catch (error) {
//       console.error('Failed to send message:', error);
//       stateManager.setError('Failed to send message. Please try again.');
      
//       // Update optimistic message to failed state
//       // In a real implementation, you might want to show a retry button
//     }
//   }, []); // No dependencies - uses refs for current values

//   const markAsRead = useCallback((): void => {
//     const currentChatId = chatIdRef.current;
//     if (!currentChatId) return;

//     // Update local state immediately
//     stateManager.updateUnreadCount(currentChatId, 0);

//     // Send to server
//     apiClient.post(`/chat/${currentChatId}/mark-read`).catch(error => {
//       console.error('Failed to mark chat as read:', error);
//     });
//   }, [stateManager]);

//   const startTyping = useCallback((): void => {
//     const currentChatId = chatIdRef.current;
//     if (!currentChatId || !enableTypingIndicators) return;

//     // Clear existing timeout
//     if (typingTimeoutRef.current) {
//       clearTimeout(typingTimeoutRef.current);
//     }

//     // Send typing indicator to server
//     apiClient.post(`/chat/${currentChatId}/typing/start`).catch(error => {
//       console.error('Failed to send typing indicator:', error);
//     });

//     // Auto-stop typing after 3 seconds
//     typingTimeoutRef.current = setTimeout(() => {
//       stopTyping();
//     }, 3000);
//   }, [enableTypingIndicators]); // stopTyping is stable

//   const stopTyping = useCallback((): void => {
//     const currentChatId = chatIdRef.current;
//     if (!currentChatId || !enableTypingIndicators) return;

//     // Clear timeout
//     if (typingTimeoutRef.current) {
//       clearTimeout(typingTimeoutRef.current);
//       typingTimeoutRef.current = null;
//     }

//     // Send stop typing to server
//     apiClient.post(`/chat/${currentChatId}/typing/stop`).catch(error => {
//       console.error('Failed to stop typing indicator:', error);
//     });
//   }, [enableTypingIndicators]);

//   const loadHistory = useCallback(async (): Promise<void> => {
//     const currentChatId = chatIdRef.current;
//     if (!currentChatId) return;

//     try {
//       stateManager.setLoading(true);
//       stateManager.setError(null);

//       const result = await apiClient.get(`/chat/${currentChatId}/history?limit=50`);
      
//       if (result.status === 'success' && result.data?.messages) {
//         const messages: ChatMessage[] = result.data.messages;
//         stateManager.loadMessages(currentChatId, messages);
//       }

//     } catch (error) {
//       console.error('Failed to load chat history:', error);
//       stateManager.setError('Failed to load chat history');
//     } finally {
//       stateManager.setLoading(false);
//     }
//   }, [stateManager]);

//   const connect = useCallback(async (): Promise<void> => {
//     const currentChatId = chatIdRef.current;
//     if (!currentChatId || isConnectedRef.current) return;

//     try {
//       stateManager.setConnectionStatus('connecting');
      
//       // Load initial history
//       await loadHistory();
      
//       // In a real implementation, this would establish WebSocket connection
//       // For now, we'll simulate a successful connection
//       stateManager.setConnectionStatus('connected');
//       isConnectedRef.current = true;
      
//     } catch (error) {
//       console.error('Failed to connect to chat:', error);
//       stateManager.setConnectionStatus('disconnected');
//       stateManager.setError('Failed to connect to chat');
//     }
//   }, [stateManager, loadHistory]);

//   const disconnect = useCallback((): void => {
//     isConnectedRef.current = false;
//     stateManager.setConnectionStatus('disconnected');
    
//     // Clean up typing timeout
//     if (typingTimeoutRef.current) {
//       clearTimeout(typingTimeoutRef.current);
//       typingTimeoutRef.current = null;
//     }
//   }, [stateManager]);

//   const reconnect = useCallback(async (): Promise<void> => {
//     disconnect();
//     await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
//     await connect();
//   }, [disconnect, connect]);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (typingTimeoutRef.current) {
//         clearTimeout(typingTimeoutRef.current);
//       }
//       stopTyping();
//     };
//   }, [stopTyping]);

//   // Memoized return value to prevent unnecessary re-renders
//   return useMemo(() => ({
//     // State
//     messages: chatId ? stateManager.getMessages(chatId) : [],
//     unreadCount: chatId ? stateManager.getUnreadCount(chatId) : 0,
//     totalUnreadCount: stateManager.getTotalUnreadCount(),
//     connectionStatus: state.connectionStatus,
//     isLoading: state.isLoading,
//     error: state.error,
//     typingUsers: chatId ? stateManager.getTypingUsers(chatId) : [],
    
//     // Actions (all stable due to useCallback)
//     sendMessage,
//     markAsRead,
//     startTyping,
//     stopTyping,
//     loadHistory,
//     connect,
//     disconnect,
//     reconnect,
//   }), [
//     chatId,
//     state.connectionStatus,
//     state.isLoading,
//     state.error,
//     stateManager,
//     sendMessage,
//     markAsRead,
//     startTyping,
//     stopTyping,
//     loadHistory,
//     connect,
//     disconnect,
//     reconnect,
//   ]);
// }