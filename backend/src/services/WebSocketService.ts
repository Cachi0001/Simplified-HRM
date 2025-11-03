import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import supabaseConfig from '../config/supabase';
import DomainValidator from '../utils/domainValidator';

export class WebSocketService {
  private io: SocketIOServer;
  private redis: Redis;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(server: HttpServer) {
    // Initialize Socket.IO with enhanced CORS support for go3net.com
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          // Development domains
          "http://localhost:5173",
          "http://localhost:3000",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:3000",
          
          // Production domains
          "https://go3nethrm.vercel.app",
          "https://go3nethrm.com",
          "https://www.go3nethrm.com",
          
          // go3net.com domains (primary custom domain)
          "https://go3net.com",
          "https://www.go3net.com",
          "https://app.go3net.com",
          "https://admin.go3net.com",
          "https://api.go3net.com",
          "https://hr.go3net.com",
          "https://hrm.go3net.com"
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true // Allow Engine.IO v3 clients for better compatibility
    });

    // Initialize Redis clients
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    this.pubClient = new Redis(redisUrl);
    this.subClient = new Redis(redisUrl);

    this.setupSocketHandlers();
    this.setupRedisSubscriptions();

    logger.info('✅ WebSocket service initialized');
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      // Validate origin domain for security
      const origin = socket.handshake.headers.origin;
      const validationResult = DomainValidator.getValidationDetails(origin || '');
      
      if (!validationResult.isValid) {
        logger.warn('❌ WebSocket connection from invalid origin:', {
          origin,
          reason: validationResult.reason,
          socketId: socket.id
        });
        socket.disconnect(true);
        return;
      }
      
      logger.info('👤 User connected from valid domain:', {
        socketId: socket.id,
        origin,
        domain: validationResult.domain,
        subdomain: validationResult.subdomain
      });

      // Handle user authentication and room joining
      socket.on('authenticate', async (data: { userId: string, token: string }) => {
        try {
          // Verify JWT token
          const secret = process.env.JWT_SECRET;
          if (!secret) {
            throw new Error('JWT_SECRET not configured');
          }

          const decoded = jwt.verify(data.token, secret) as any;
          
          // Verify user exists in database
          const supabase = supabaseConfig.getClient();
          
          // Log the decoded token for debugging
          logger.info('🔍 WebSocket Auth Debug:', {
            decodedSub: decoded.sub,
            tokenUserId: decoded.id || decoded.userId || decoded.user_id
          });
          
          // Try to find user by id first (based on JWT sub values in logs)
          let { data: user, error } = await supabase
            .from('employees')
            .select('id, user_id, email, full_name, role, status')
            .eq('id', decoded.sub)
            .eq('status', 'active')
            .single();

          // If not found by id, try by user_id
          if (error || !user) {
            logger.info('🔍 User not found by id, trying by user_id...');
            const { data: userByUserId, error: errorByUserId } = await supabase
              .from('employees')
              .select('id, user_id, email, full_name, role, status')
              .eq('user_id', decoded.sub)
              .eq('status', 'active')
              .single();
            
            user = userByUserId;
            error = errorByUserId;
          }

          if (error || !user) {
            logger.error('❌ User lookup failed:', {
              decodedSub: decoded.sub,
              error: error?.message,
              errorCode: error?.code,
              searchedFields: ['user_id', 'id']
            });
            throw new Error('User not found or inactive');
          }
          
          logger.info('✅ User found in database:', {
            employeeId: user.id,
            userId: user.user_id,
            email: user.email,
            status: user.status
          });

          // Store user data in socket (use JWT sub as userId for consistency)
          const userId = decoded.sub; // Use JWT sub directly
          socket.data.userId = userId;
          socket.data.userEmail = user.email;
          socket.data.userName = user.full_name;
          socket.data.userRole = user.role;
          socket.data.authenticated = true;
          
          logger.info('🔍 User data stored in socket:', {
            jwtSub: decoded.sub,
            userId: userId,
            employeeId: user.id,
            userEmail: user.email,
            userName: user.full_name,
            userRole: user.role
          });
          
          // Store user presence in Redis
          await this.redis.setex(`user:${userId}:presence`, 300, JSON.stringify({
            status: 'online',
            lastSeen: new Date().toISOString(),
            socketId: socket.id
          }));
          
          logger.info('🔐 Chat user authenticated:', { 
            userId: userId, 
            userName: user.full_name
          });
          
          socket.emit('authenticated', { 
            success: true, 
            user: {
              id: userId,
              name: user.full_name,
              email: user.email,
              role: user.role
            }
          });
        } catch (error) {
          logger.error('❌ Authentication failed:', error);
          socket.emit('authenticated', { 
            success: false, 
            error: error instanceof Error ? error.message : 'Invalid token' 
          });
        }
      });

      // Handle joining chat rooms
      socket.on('join_chat', async (data: { chatId: string }) => {
        if (!socket.data.authenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { chatId } = data;
        socket.join(chatId);
        
        // Store user's active chats in Redis
        await this.redis.sadd(`user:${socket.data.userId}:chats`, chatId);
        await this.redis.sadd(`chat:${chatId}:users`, socket.data.userId);
        
        // Get updated user count for debugging
        const usersInChat = await this.redis.smembers(`chat:${chatId}:users`);
        
        logger.info('🏠 User joined chat:', { 
          userId: socket.data.userId, 
          userName: socket.data.userName,
          chatId,
          totalUsersInChat: usersInChat.length,
          usersInChat: usersInChat
        });
        
        socket.emit('joined_chat', { chatId });
      });

      // Handle leaving chat rooms
      socket.on('leave_chat', async (data: { chatId: string }) => {
        const { chatId } = data;
        socket.leave(chatId);
        
        // Remove from Redis
        await this.redis.srem(`user:${socket.data.userId}:chats`, chatId);
        await this.redis.srem(`chat:${chatId}:users`, socket.data.userId);
        
        logger.info('🚪 User left chat:', { userId: socket.data.userId, chatId });
      });

      // Handle sending messages
      socket.on('send_message', async (data: {
        chatId: string;
        message: string;
        messageId: string;
        timestamp: string;
      }) => {
        if (!socket.data.authenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          // Log message attempt for debugging
          logger.info('📤 WebSocket: Attempting to send message:', {
            chatId: data.chatId,
            senderId: socket.data.userId,
            senderName: socket.data.userName,
            messageId: data.messageId
          });

          // CRITICAL FIX: Save message to database first
          const { ChatService } = await import('./ChatService');
          const chatService = new ChatService();
          
          const savedMessage = await chatService.sendMessage(
            data.chatId,
            socket.data.userId,
            data.message
          );

          logger.info('💾 WebSocket: Message saved to database:', {
            messageId: savedMessage.id,
            chatId: savedMessage.chat_id
          });

          const messageData = {
            id: savedMessage.id, // Use the real database ID
            chatId: savedMessage.chat_id,
            senderId: savedMessage.sender_id,
            senderName: socket.data.userName,
            senderEmail: socket.data.userEmail,
            senderRole: socket.data.userRole,
            message: savedMessage.message,
            timestamp: savedMessage.timestamp,
            type: 'message'
          };

          // Publish to Redis for other server instances
          await this.pubClient.publish('chat_messages', JSON.stringify(messageData));
          
          logger.info('📡 Message published to Redis:', {
            chatId: savedMessage.chat_id,
            senderId: savedMessage.sender_id,
            messageId: savedMessage.id,
            messageContent: savedMessage.message.substring(0, 50) + '...'
          });
          
          // Confirm message sent to sender with real database data
          socket.emit('message_sent', {
            messageId: savedMessage.id,
            chatId: savedMessage.chat_id,
            timestamp: data.timestamp,
            status: 'sent'
          });

          // Emit message indicator events for real-time visual feedback
          await this.broadcastMessageIndicator(savedMessage.chat_id, savedMessage.sender_id, 'sent');
          
          logger.info('📨 WebSocket: Message sent successfully:', { 
            chatId: savedMessage.chat_id, 
            senderId: savedMessage.sender_id,
            senderName: socket.data.userName,
            messageId: savedMessage.id,
            originalMessageId: data.messageId
          });
        } catch (error) {
          logger.error('❌ Error sending message:', error);
          socket.emit('error', { 
            message: 'Failed to send message',
            messageId: data.messageId 
          });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', async (data: { chatId: string }) => {
        const typingData = {
          chatId: data.chatId,
          userId: socket.data.userId,
          type: 'typing_start'
        };

        await this.pubClient.publish('chat_typing', JSON.stringify(typingData));
      });

      socket.on('typing_stop', async (data: { chatId: string }) => {
        const typingData = {
          chatId: data.chatId,
          userId: socket.data.userId,
          type: 'typing_stop'
        };

        await this.pubClient.publish('chat_typing', JSON.stringify(typingData));
      });

      // Handle read receipts
      socket.on('mark_read', async (data: { chatId: string, messageId?: string }) => {
        if (!socket.data.authenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const readData = {
            chatId: data.chatId,
            userId: socket.data.userId,
            userName: socket.data.userName,
            messageId: data.messageId,
            timestamp: new Date().toISOString(),
            type: 'read_receipt'
          };

          // Publish read receipt to Redis
          await this.pubClient.publish('chat_read_receipts', JSON.stringify(readData));
          
          logger.info('✅ Message marked as read:', { 
            chatId: data.chatId, 
            userId: socket.data.userId,
            messageId: data.messageId 
          });
        } catch (error) {
          logger.error('❌ Error marking message as read:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        if (socket.data.userId) {
          // Update user presence to offline
          await this.redis.setex(`user:${socket.data.userId}:presence`, 300, JSON.stringify({
            status: 'offline',
            lastSeen: new Date().toISOString(),
            socketId: null
          }));

          // Broadcast offline status
          const presenceData = {
            userId: socket.data.userId,
            status: 'offline',
            lastSeen: new Date().toISOString(),
            type: 'presence_update'
          };
          await this.pubClient.publish('user_presence', JSON.stringify(presenceData));

          // Clean up user's active chats
          const userChats = await this.redis.smembers(`user:${socket.data.userId}:chats`);
          for (const chatId of userChats) {
            await this.redis.srem(`chat:${chatId}:users`, socket.data.userId);
          }
          await this.redis.del(`user:${socket.data.userId}:chats`);
        }
        
        logger.info('👋 User disconnected:', { 
          socketId: socket.id,
          userId: socket.data.userId,
          userName: socket.data.userName 
        });
      });
    });
  }

  private setupRedisSubscriptions() {
    const channels = ['chat_messages', 'chat_typing', 'chat_read_receipts', 'user_presence'];
    
    // Subscribe to all channels
    this.subClient.subscribe(...channels, (err) => {
      if (err) {
        logger.error('❌ Failed to subscribe to Redis channels:', err);
      } else {
        logger.info('✅ Subscribed to Redis channels:', channels);
      }
    });

    // Handle incoming Redis messages
    this.subClient.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);

        switch (channel) {
          case 'chat_messages':
            await this.handleChatMessage(data);
            break;
          case 'chat_typing':
            await this.handleTypingIndicator(data);
            break;
          case 'chat_read_receipts':
            await this.handleReadReceipt(data);
            break;
          case 'message_indicator':
            await this.handleMessageIndicatorSync(data);
            break;
          case 'user_presence':
            await this.handlePresenceUpdate(data);
            break;
        }
      } catch (error) {
        logger.error('❌ Error processing Redis message:', error);
      }
    });
  }

  private async handleChatMessage(data: any) {
    const { chatId, senderId, ...messageData } = data;
    
    // Get users in chat room for debugging
    const usersInRoom = await this.redis.smembers(`chat:${chatId}:users`);
    const senderSockets = this.getUserSockets(senderId);
    
    logger.info('📢 Broadcasting message:', { 
      chatId, 
      senderId, 
      senderName: data.senderName,
      messageId: data.id,
      usersInRoom: usersInRoom.length,
      senderSockets: senderSockets.length,
      totalConnectedSockets: this.io.sockets.sockets.size
    });
    
    const messagePayload = {
      id: data.id,
      chatId: data.chatId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      senderRole: data.senderRole,
      message: data.message,
      timestamp: data.timestamp
    };
    
    // Broadcast to all users in the chat room except sender
    this.io.to(chatId).except(senderSockets).emit('new_message', messagePayload);
    
    // CRITICAL FIX: Send message directly to intended recipient for DM chats
    if (chatId.startsWith('dm_')) {
      // Extract recipient ID from DM chat ID (format: dm_userId1_userId2)
      const userIds = chatId.replace('dm_', '').split('_');
      const recipientId = userIds.find((id: string) => id !== senderId);
      
      if (recipientId) {
        // Convert employee ID to user ID if needed
        let actualRecipientUserId = recipientId;
        
        // Check if recipientId is an employee ID by looking for a socket with matching employee data
        const allSockets = Array.from(this.io.sockets.sockets.values());
        const authenticatedSockets = allSockets.filter(socket => socket.data.authenticated);
        
        // First try to find by user ID (JWT sub)
        let recipientSockets = authenticatedSockets.filter(socket => socket.data.userId === recipientId);
        
        // If not found, try to find by employee ID and get the user ID
        if (recipientSockets.length === 0) {
          const socketWithEmployeeId = authenticatedSockets.find(socket => {
            // Check if this socket belongs to an employee with the recipient employee ID
            return socket.data.employeeId === recipientId;
          });
          
          if (socketWithEmployeeId) {
            actualRecipientUserId = socketWithEmployeeId.data.userId;
            recipientSockets = authenticatedSockets.filter(socket => socket.data.userId === actualRecipientUserId);
          }
        }
        
        // Send message to all recipient's sockets
        recipientSockets.forEach(socket => {
          socket.emit('new_message', messagePayload);
        });
        
        logger.info('📨 Message sent directly to recipient:', {
          chatId,
          senderId,
          recipientId,
          actualRecipientUserId,
          recipientSocketCount: recipientSockets.length,
          messageId: data.id,
          senderName: data.senderName,
          totalSockets: allSockets.length,
          authenticatedSockets: authenticatedSockets.length,
          authenticatedUserIds: authenticatedSockets.map(s => s.data.userId),
          recipientSocketIds: recipientSockets.map(s => s.id)
        });
      } else {
        logger.warn('⚠️ Could not extract recipient ID from DM chat:', {
          chatId,
          senderId,
          userIds
        });
      }
    }
    
    logger.info('✅ Message broadcasted to chat room:', { 
      chatId, 
      senderId, 
      senderName: data.senderName,
      messageId: data.id,
      recipientCount: usersInRoom.length - 1 // Exclude sender
    });
  }

  private async handleTypingIndicator(data: any) {
    const { chatId, userId, type } = data;
    
    // Broadcast typing indicator to all users in chat except the typer
    this.io.to(chatId).except(this.getUserSockets(userId)).emit('typing_update', {
      chatId,
      userId,
      isTyping: type === 'typing_start'
    });
  }

  private async handleReadReceipt(data: any) {
    const { chatId, userId, messageId, timestamp } = data;
    
    // Broadcast read receipt to all users in the chat
    this.io.to(chatId).emit('message_read', {
      chatId,
      userId,
      messageId,
      timestamp
    });
    
    logger.info('✅ Read receipt broadcasted:', { chatId, userId, messageId });
  }

  private async handlePresenceUpdate(data: any) {
    const { userId, status, lastSeen } = data;
    
    // Get user's active chats to broadcast presence update
    const userChats = await this.redis.smembers(`user:${userId}:chats`);
    
    for (const chatId of userChats) {
      this.io.to(chatId).emit('user_presence', {
        userId,
        status,
        lastSeen
      });
    }
    
    logger.info('👤 Presence update broadcasted:', { userId, status });
  }

  private async handleMessageIndicatorSync(data: any) {
    const { userId, chatId, indicatorType, timestamp, expiresAt } = data;
    
    // Broadcast indicator update to all connected clients
    this.io.emit('user_indicator', {
      userId,
      indicatorType,
      chatId,
      timestamp,
      expiresAt
    });
    
    logger.info('🔄 Message indicator synced across clients:', { userId, chatId, indicatorType });
  }

  /**
   * Broadcast message indicator for visual feedback
   */
  private async broadcastMessageIndicator(chatId: string, userId: string, indicatorType: 'sent' | 'received') {
    try {
      // Create indicator data
      const indicatorData = {
        type: 'message_indicator',
        userId,
        chatId,
        indicatorType,
        timestamp: Date.now(),
        expiresAt: Date.now() + 3000 // 3 seconds from now
      };

      // Broadcast to all users in the chat for visual feedback
      this.io.to(chatId).emit('message_indicator', indicatorData);

      // Also broadcast to global indicator listeners (for avatar indicators)
      this.io.emit('user_indicator', {
        userId,
        indicatorType,
        chatId,
        timestamp: indicatorData.timestamp,
        expiresAt: indicatorData.expiresAt
      });

      logger.info('✨ Message indicator broadcasted:', {
        chatId,
        userId,
        indicatorType,
        timestamp: indicatorData.timestamp
      });
    } catch (error) {
      logger.error('❌ Failed to broadcast message indicator:', error);
    }
  }

  private getUserSockets(userId: string): string[] {
    const sockets: string[] = [];
    
    this.io.sockets.sockets.forEach((socket) => {
      if (socket.data.userId === userId) {
        sockets.push(socket.id);
      }
    });
    
    return sockets;
  }

  // Public methods for external use
  public async broadcastToChat(chatId: string, event: string, data: any) {
    this.io.to(chatId).emit(event, data);
  }

  public async getUsersInChat(chatId: string): Promise<string[]> {
    return await this.redis.smembers(`chat:${chatId}:users`);
  }

  public getConnectedUsersCount(): number {
    return this.io.sockets.sockets.size;
  }

  public async getUserPresence(userId: string): Promise<any> {
    const presence = await this.redis.get(`user:${userId}:presence`);
    return presence ? JSON.parse(presence) : null;
  }

  public async broadcastMessageFromAPI(messageData: any) {
    // This method allows REST API endpoints to broadcast messages via WebSocket
    await this.pubClient.publish('chat_messages', JSON.stringify({
      ...messageData,
      type: 'message'
    }));
  }

  public async notifyTypingFromAPI(chatId: string, userId: string, isTyping: boolean) {
    await this.pubClient.publish('chat_typing', JSON.stringify({
      chatId,
      userId,
      type: isTyping ? 'typing_start' : 'typing_stop'
    }));
  }

  public async broadcastReadReceiptFromAPI(chatId: string, userId: string, messageId?: string) {
    await this.pubClient.publish('chat_read_receipts', JSON.stringify({
      chatId,
      userId,
      messageId,
      timestamp: new Date().toISOString(),
      type: 'read_receipt'
    }));
  }

  public async broadcastIndicatorFromAPI(userId: string, chatId: string, indicatorType: 'sent' | 'received') {
    try {
      await this.broadcastMessageIndicator(chatId, userId, indicatorType);
      
      // Also publish to Redis for cross-server synchronization
      await this.pubClient.publish('message_indicator', JSON.stringify({
        userId,
        chatId,
        indicatorType,
        timestamp: Date.now(),
        expiresAt: Date.now() + 3000
      }));
      
      logger.info('📡 Message indicator published from API:', { userId, chatId, indicatorType });
    } catch (error) {
      logger.error('❌ Failed to broadcast indicator from API:', error);
    }
  }

  public getHealthStatus() {
    return {
      connected: this.io.sockets.sockets.size,
      redisConnected: this.redis.status === 'ready',
      pubClientConnected: this.pubClient.status === 'ready',
      subClientConnected: this.subClient.status === 'ready'
    };
  }

  // Debug method to check chat room status
  public async debugChatRoom(chatId: string) {
    const usersInChat = await this.redis.smembers(`chat:${chatId}:users`);
    const socketsInRoom = this.io.sockets.adapter.rooms.get(chatId);
    
    const debugInfo = {
      chatId,
      usersInRedis: usersInChat,
      socketsInRoom: socketsInRoom ? Array.from(socketsInRoom) : [],
      totalConnectedSockets: this.io.sockets.sockets.size,
      connectedUsers: Array.from(this.io.sockets.sockets.values()).map(s => ({
        socketId: s.id,
        userId: s.data.userId,
        userName: s.data.userName,
        authenticated: s.data.authenticated
      }))
    };
    
    logger.info('🔍 Chat room debug info:', debugInfo);
    return debugInfo;
  }
}

let webSocketService: WebSocketService | null = null;

export function initializeWebSocketService(server: HttpServer): WebSocketService {
  if (!webSocketService) {
    webSocketService = new WebSocketService(server);
  }
  return webSocketService;
}

export function getWebSocketService(): WebSocketService | null {
  return webSocketService;
}