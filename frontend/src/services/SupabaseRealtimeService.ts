// import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
// // import { ChatMessage, User, Chat, TypingUser } from '../hooks/useChat';

// interface RealtimeMessage {
//   id: string;
//   chat_id: string;
//   sender_id: string;
//   sender_name: string;
//   sender_avatar?: string;
//   content: string;
//   created_at: string;
//   updated_at: string;
// }

// interface RealtimeTyping {
//   id: string;
//   chat_id: string;
//   user_id: string;
//   user_name: string;
//   is_typing: boolean;
//   updated_at: string;
// }

// class SupabaseRealtimeService {
//   private supabase: SupabaseClient;
//   private channels: Map<string, RealtimeChannel> = new Map();
//   private messageHandlers: Map<string, (message: ChatMessage) => void> = new Map();
//   private typingHandlers: Map<string, (typing: TypingUser) => void> = new Map();
//   private connectionHandlers: ((connected: boolean) => void)[] = [];
//   private userStatusHandlers: Map<string, (user: User) => void> = new Map();
//   private isConnected = false;
//   private currentUserId: string | null = null;

//   constructor() {
//     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
//     const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

//     if (!supabaseUrl || !supabaseKey) {
//       console.error('❌ Supabase configuration missing');
//       throw new Error('Supabase configuration missing');
//     }

//     this.supabase = createClient(supabaseUrl, supabaseKey);
//     this.initialize();
//   }

//   private async initialize() {
//     try {
//       // Get current user from localStorage
//       const currentUser = localStorage.getItem('currentUser');
//       if (currentUser) {
//         const user = JSON.parse(currentUser);
//         this.currentUserId = user.id || user.employeeId;
//         console.log('✅ Supabase Realtime initialized for user:', this.currentUserId);
//       }

//       // Set up auth state listener
//       this.supabase.auth.onAuthStateChange((event, session) => {
//         console.log('🔐 Auth state changed:', event, session?.user?.id);
//         if (session?.user) {
//           this.currentUserId = session.user.id;
//           this.isConnected = true;
//           this.notifyConnectionHandlers(true);
//         } else {
//           this.isConnected = false;
//           this.notifyConnectionHandlers(false);
//         }
//       });

//       // Set connection as active
//       this.isConnected = true;
//       this.notifyConnectionHandlers(true);

//     } catch (error) {
//       console.error('❌ Failed to initialize Supabase Realtime:', error);
//       this.isConnected = false;
//       this.notifyConnectionHandlers(false);
//     }
//   }

//   // Subscribe to chat messages with optimized refresh patterns
//   subscribeToChat(chatId: string): RealtimeChannel {
//     console.log('🔄 Setting up Supabase realtime subscription for chat:', chatId);

//     // Remove existing subscription if any
//     this.unsubscribeFromChat(chatId);

//     const channelName = `chat_${chatId}`;
//     const channel = this.supabase
//       .channel(channelName)
//       .on(
//         'postgres_changes',
//         {
//           event: 'INSERT',
//           schema: 'public',
//           table: 'messages',
//           filter: `chat_id=eq.${chatId}`
//         },
//         (payload) => {
//           console.log('📨 New message received:', payload);
//           this.handleRealtimeMessage(payload.new as RealtimeMessage);
//         }
//       )
//       .on(
//         'postgres_changes',
//         {
//           event: 'UPDATE',
//           schema: 'public',
//           table: 'messages',
//           filter: `chat_id=eq.${chatId}`
//         },
//         (payload) => {
//           console.log('📝 Message updated:', payload);
//           this.handleRealtimeMessage(payload.new as RealtimeMessage);
//         }
//       )
//       .on(
//         'postgres_changes',
//         {
//           event: 'INSERT',
//           schema: 'public',
//           table: 'chat_typing',
//           filter: `chat_id=eq.${chatId}`
//         },
//         (payload) => {
//           console.log('⌨️ Typing indicator received:', payload);
//           this.handleRealtimeTyping(payload.new as RealtimeTyping);
//         }
//       )
//       .on(
//         'postgres_changes',
//         {
//           event: 'UPDATE',
//           schema: 'public',
//           table: 'chat_typing',
//           filter: `chat_id=eq.${chatId}`
//         },
//         (payload) => {
//           console.log('⌨️ Typing indicator updated:', payload);
//           this.handleRealtimeTyping(payload.new as RealtimeTyping);
//         }
//       )
//       .subscribe((status) => {
//         console.log(`📡 Subscription status for chat ${chatId}:`, status);

//         if (status === 'SUBSCRIBED') {
//           this.isConnected = true;
//           this.notifyConnectionHandlers(true);
//         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
//           console.error(`❌ Subscription failed for chat ${chatId}:`, status);
//           this.isConnected = false;
//           this.notifyConnectionHandlers(false);

//           // Retry subscription after delay
//           setTimeout(() => {
//             console.log('🔄 Retrying subscription for chat:', chatId);
//             this.subscribeToChat(chatId);
//           }, 3000);
//         }
//       });

//     this.channels.set(chatId, channel);
//     return channel;
//   }

//   // Subscribe to user status updates (optimized to reduce load)
//   subscribeToUserStatus(): RealtimeChannel {
//     console.log('👥 Setting up user status subscription');

//     const channelName = 'user_status';
//     const channel = this.supabase
//       .channel(channelName)
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'user_status'
//         },
//         (payload) => {
//           console.log('👤 User status updated:', payload);
//           this.handleUserStatusUpdate(payload);
//         }
//       )
//       .subscribe();

//     this.channels.set('user_status', channel);
//     return channel;
//   }

//   // Subscribe to announcements
//   subscribeToAnnouncements(): RealtimeChannel {
//     console.log('📢 Setting up announcements subscription');

//     const channelName = 'announcements';
//     const channel = this.supabase
//       .channel(channelName)
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'announcements'
//         },
//         (payload) => {
//           console.log('📢 Announcement updated:', payload);
//           // Emit custom event for announcements
//           window.dispatchEvent(new CustomEvent('announcement-update', {
//             detail: payload
//           }));
//         }
//       )
//       .subscribe();

//     this.channels.set('announcements', channel);
//     return channel;
//   }

//   // Optimized unsubscribe with cleanup
//   unsubscribeFromChat(chatId: string) {
//     const channel = this.channels.get(chatId);
//     if (channel) {
//       console.log('🔌 Unsubscribing from chat:', chatId);
//       this.supabase.removeChannel(channel);
//       this.channels.delete(chatId);

//       // Clean up handlers
//       this.messageHandlers.delete(chatId);
//       this.typingHandlers.delete(chatId);
//     }
//   }

//   // Clean unsubscribe all with proper cleanup
//   unsubscribeAll() {
//     console.log('🔌 Unsubscribing from all channels');

//     for (const [channelKey, channel] of this.channels) {
//       this.supabase.removeChannel(channel);
//     }

//     this.channels.clear();
//     this.messageHandlers.clear();
//     this.typingHandlers.clear();
//     this.userStatusHandlers.clear();
//   }

//   // Handle realtime message with proper conversion
//   private handleRealtimeMessage(realtimeMessage: RealtimeMessage) {
//     const chatMessage: ChatMessage = {
//       id: realtimeMessage.id,
//       chatId: realtimeMessage.chat_id,
//       senderId: realtimeMessage.sender_id,
//       senderName: realtimeMessage.sender_name,
//       senderAvatar: realtimeMessage.sender_avatar,
//       content: realtimeMessage.content,
//       timestamp: realtimeMessage.created_at,
//       isOwn: realtimeMessage.sender_id === this.currentUserId,
//       status: 'delivered'
//     };

//     // Notify message handler
//     const handler = this.messageHandlers.get(realtimeMessage.chat_id);
//     if (handler) {
//       handler(chatMessage);
//     }

//     // Emit custom event for global listeners
//     window.dispatchEvent(new CustomEvent('chat-message', {
//       detail: chatMessage
//     }));
//   }

//   // Handle realtime typing with proper conversion
//   private handleRealtimeTyping(realtimeTyping: RealtimeTyping) {
//     const typingUser: TypingUser = {
//       userId: realtimeTyping.user_id,
//       chatId: realtimeTyping.chat_id,
//       isTyping: realtimeTyping.is_typing
//     };

//     // Notify typing handler
//     const handler = this.typingHandlers.get(realtimeTyping.chat_id);
//     if (handler) {
//       handler(typingUser);
//     }

//     // Emit custom event for global listeners
//     window.dispatchEvent(new CustomEvent('chat-typing', {
//       detail: typingUser
//     }));
//   }

//   // Handle user status updates
//   private handleUserStatusUpdate(payload: any) {
//     const user: Partial<User> = {
//       id: payload.new?.user_id,
//       status: payload.new?.status || 'offline'
//     };

//     // Notify user status handler
//     const handler = this.userStatusHandlers.get(user.id!);
//     if (handler) {
//       handler(user as User);
//     }

//     // Emit custom event for global listeners
//     window.dispatchEvent(new CustomEvent('user-status', {
//       detail: user
//     }));
//   }

//   // Send typing indicator with debouncing
//   private typingDebounce: Map<string, NodeJS.Timeout> = new Map();

//   async sendTypingIndicator(chatId: string, isTyping: boolean) {
//     if (!this.currentUserId) return;

//     try {
//       // Clear existing debounce
//       const existingTimeout = this.typingDebounce.get(chatId);
//       if (existingTimeout) {
//         clearTimeout(existingTimeout);
//       }

//       if (isTyping) {
//         // Insert/update typing record
//         const { error } = await this.supabase
//           .from('chat_typing')
//           .upsert({
//             chat_id: chatId,
//             user_id: this.currentUserId,
//             user_name: this.getCurrentUserName(),
//             is_typing: true,
//             updated_at: new Date().toISOString()
//           }, {
//             onConflict: 'chat_id,user_id'
//           });

//         if (error) {
//           console.error('❌ Failed to send typing indicator:', error);
//         }

//         // Auto-clear typing after 3 seconds
//         const timeout = setTimeout(() => {
//           this.sendTypingIndicator(chatId, false);
//         }, 3000);

//         this.typingDebounce.set(chatId, timeout);
//       } else {
//         // Remove typing record
//         const { error } = await this.supabase
//           .from('chat_typing')
//           .delete()
//           .eq('chat_id', chatId)
//           .eq('user_id', this.currentUserId);

//         if (error) {
//           console.error('❌ Failed to clear typing indicator:', error);
//         }

//         this.typingDebounce.delete(chatId);
//       }
//     } catch (error) {
//       console.error('❌ Error managing typing indicator:', error);
//     }
//   }

//   // Send message through Supabase
//   async sendMessage(chatId: string, content: string): Promise<ChatMessage | null> {
//     if (!this.currentUserId) {
//       console.error('❌ Cannot send message: No current user');
//       return null;
//     }

//     try {
//       const messageData = {
//         chat_id: chatId,
//         sender_id: this.currentUserId,
//         sender_name: this.getCurrentUserName(),
//         sender_avatar: this.getCurrentUserAvatar(),
//         content: content.trim(),
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString()
//       };

//       const { data, error } = await this.supabase
//         .from('messages')
//         .insert(messageData)
//         .select()
//         .single();

//       if (error) {
//         console.error('❌ Failed to send message:', error);
//         return null;
//       }

//       // Convert to ChatMessage format
//       const chatMessage: ChatMessage = {
//         id: data.id,
//         chatId: data.chat_id,
//         senderId: data.sender_id,
//         senderName: data.sender_name,
//         senderAvatar: data.sender_avatar,
//         content: data.content,
//         timestamp: data.created_at,
//         isOwn: true,
//         status: 'sent'
//       };

//       // Clear typing indicator
//       this.sendTypingIndicator(chatId, false);

//       return chatMessage;
//     } catch (error) {
//       console.error('❌ Error sending message:', error);
//       return null;
//     }
//   }

//   // Update user status
//   async updateUserStatus(status: 'online' | 'offline' | 'away') {
//     if (!this.currentUserId) return;

//     try {
//       const { error } = await this.supabase
//         .from('user_status')
//         .upsert({
//           user_id: this.currentUserId,
//           status: status,
//           last_seen: new Date().toISOString(),
//           updated_at: new Date().toISOString()
//         }, {
//           onConflict: 'user_id'
//         });

//       if (error) {
//         console.error('❌ Failed to update user status:', error);
//       }
//     } catch (error) {
//       console.error('❌ Error updating user status:', error);
//     }
//   }

//   // Event handler management
//   onMessage(chatId: string, handler: (message: ChatMessage) => void) {
//     this.messageHandlers.set(chatId, handler);
//   }

//   onTyping(chatId: string, handler: (typing: TypingUser) => void) {
//     this.typingHandlers.set(chatId, handler);
//   }

//   onConnection(handler: (connected: boolean) => void) {
//     this.connectionHandlers.push(handler);
//   }

//   onUserStatus(userId: string, handler: (user: User) => void) {
//     this.userStatusHandlers.set(userId, handler);
//   }

//   private notifyConnectionHandlers(connected: boolean) {
//     this.connectionHandlers.forEach(handler => handler(connected));
//   }

//   // Utility methods
//   /**
//    * Set the current user for the WebSocket service
//    */
//   setCurrentUser(userId: string, userName?: string) {
//     this.currentUserId = userId;
//     console.log('✅ WebSocket service current user set:', userId);
//   }

//   /**
//    * Get current user ID
//    */
//   getCurrentUserId(): string | null {
//     return this.currentUserId;
//   }

//   /**
//    * Reinitialize current user from localStorage
//    */
//   reinitializeCurrentUser() {
//     try {
//       const currentUser = localStorage.getItem('currentUser');
//       if (currentUser) {
//         const user = JSON.parse(currentUser);
//         this.currentUserId = user.id || user.employeeId;
//         console.log('✅ WebSocket service reinitialized for user:', this.currentUserId);
//       } else {
//         console.warn('⚠️ No current user found in localStorage');
//       }
//     } catch (error) {
//       console.error('❌ Failed to reinitialize current user:', error);
//     }
//   }

//   private getCurrentUserName(): string {
//     const currentUser = localStorage.getItem('currentUser');
//     if (currentUser) {
//       const user = JSON.parse(currentUser);
//       return user.fullName || user.name || user.email || 'Unknown User';
//     }
//     return 'Unknown User';
//   }

//   private getCurrentUserAvatar(): string | undefined {
//     const currentUser = localStorage.getItem('currentUser');
//     if (currentUser) {
//       const user = JSON.parse(currentUser);
//       return user.avatar || user.profilePicture;
//     }
//     return undefined;
//   }

//   // Connection status
//   get connected(): boolean {
//     return this.isConnected;
//   }

//   get status(): 'connected' | 'disconnected' | 'connecting' {
//     return this.isConnected ? 'connected' : 'disconnected';
//   }

//   // Cleanup
//   destroy() {
//     this.unsubscribeAll();
//     this.connectionHandlers = [];

//     // Clear all debounce timeouts
//     for (const timeout of this.typingDebounce.values()) {
//       clearTimeout(timeout);
//     }
//     this.typingDebounce.clear();
//   }
// }

// // Export singleton instance
// export default new SupabaseRealtimeService();
