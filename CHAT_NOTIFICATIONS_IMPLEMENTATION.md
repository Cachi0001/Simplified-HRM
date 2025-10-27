# Chat & Notification System Implementation Guide

## Overview
This document provides detailed implementation patterns for building a real-time chat system and push notification system that mirrors modern chat applications like WhatsApp, Telegram, or Slack.

---

## Part 1: Real-Time Chat System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Chat Card   │  │  Typing Ind. │  │ Read Receipt │      │
│  │  (Draggable) │  │ (Animated)   │  │  (✓✓ Filled) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Unread Badge │  │ Redis Sub.   │  │ Supabase RT  │      │
│  │  (Red Count) │  │  (Typing)    │  │  (Messages)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ↓ WebSocket/Realtime
┌──────────────────────────────────────────────────────────────┐
│                   Backend (Node.js/Express)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ChatService   │  │NotifService  │  │TypeingService│       │
│  │(CRUD msgs)   │  │(Broadcasts)  │  │(Redis TTL)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                  │                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Supabase RT   │  │PostgreSQL    │  │Redis Cache   │       │
│  │(Subscribe)   │  │(Persistence) │  │(Temp Data)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### 1. Database Schema Extensions

#### Add to chat_messages table:
```sql
ALTER TABLE chat_messages ADD COLUMN read_at TIMESTAMPTZ NULL;
-- This tracks when each message was read
```

#### Create chat_unread_count table:
```sql
CREATE TABLE chat_unread_count (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  unread_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, chat_id)
);

-- Create index for fast lookups
CREATE INDEX idx_chat_unread_user_id ON chat_unread_count(user_id);
```

### 2. Backend Implementation

#### ChatService Methods

```typescript
// src/services/ChatService.ts

export class ChatService {
  
  // ============ MESSAGE OPERATIONS ============
  
  async sendMessage(chatId: string, senderId: string, messageText: string) {
    // 1. Insert message into chat_messages
    const message = await db.chatMessages.create({
      chat_id: chatId,
      sender_id: senderId,
      message: messageText,
      created_at: new Date(),
      read_at: null // Initially unread by all except sender
    });
    
    // 2. Get all participants except sender
    const participants = await this.getChatParticipants(chatId);
    const othersUserIds = participants
      .filter(p => p.user_id !== senderId)
      .map(p => p.user_id);
    
    // 3. Increment unread_count for all other participants
    for (const userId of othersUserIds) {
      await this.incrementUnreadCount(userId, chatId);
    }
    
    // 4. Broadcast message via Supabase Realtime
    await supabase
      .from('chat_messages')
      .on('*', payload => {
        // This broadcasts to all subscribers
      })
      .subscribe();
    
    // 5. Create notification for participants (if not in active chat)
    await this.notifyParticipants(chatId, message, senderId);
    
    return message;
  }
  
  // ============ READ RECEIPT OPERATIONS ============
  
  async markMessageAsRead(messageId: string, userId: string) {
    // 1. Get the message
    const message = await db.chatMessages.findById(messageId);
    
    // 2. Mark as read
    await db.chatMessages.update(messageId, {
      read_at: new Date()
    });
    
    // 3. Decrement unread_count for this user in this chat
    await this.decrementUnreadCount(userId, message.chat_id);
    
    // 4. Broadcast read status to all participants
    await this.broadcastReadStatus({
      messageId,
      userId,
      readAt: new Date(),
      chatId: message.chat_id
    });
  }
  
  async markChatAsRead(chatId: string, userId: string) {
    // Mark ALL unread messages in a chat as read
    const unreadMessages = await db.chatMessages.find({
      chat_id: chatId,
      read_at: null
    });
    
    for (const msg of unreadMessages) {
      await this.markMessageAsRead(msg.id, userId);
    }
    
    // Reset unread_count to 0
    await this.resetUnreadCount(userId, chatId);
  }
  
  // ============ UNREAD COUNT OPERATIONS ============
  
  async incrementUnreadCount(userId: string, chatId: string) {
    await db.chatUnreadCount.upsert(
      { user_id: userId, chat_id: chatId },
      {
        unread_count: db.raw('unread_count + 1'),
        updated_at: new Date()
      }
    );
    
    // Broadcast unread count update
    await this.broadcastUnreadCountUpdate(userId);
  }
  
  async decrementUnreadCount(userId: string, chatId: string) {
    const current = await db.chatUnreadCount.findOne({
      user_id: userId,
      chat_id: chatId
    });
    
    if (current && current.unread_count > 0) {
      await db.chatUnreadCount.update(
        { user_id: userId, chat_id: chatId },
        {
          unread_count: Math.max(0, current.unread_count - 1),
          updated_at: new Date()
        }
      );
      
      // Broadcast update
      await this.broadcastUnreadCountUpdate(userId);
    }
  }
  
  async resetUnreadCount(userId: string, chatId: string) {
    await db.chatUnreadCount.update(
      { user_id: userId, chat_id: chatId },
      {
        unread_count: 0,
        updated_at: new Date()
      }
    );
    
    // Broadcast update
    await this.broadcastUnreadCountUpdate(userId);
  }
  
  async getTotalUnreadCount(userId: string): Promise<number> {
    const result = await db.chatUnreadCount.sum('unread_count', {
      user_id: userId
    });
    return result || 0;
  }
  
  async getChatHistory(chatId: string, limit: number = 50, offset: number = 0) {
    return await db.chatMessages.find(
      { chat_id: chatId },
      { 
        orderBy: { created_at: 'DESC' },
        limit,
        offset
      }
    );
  }
  
  // ============ BROADCAST OPERATIONS ============
  
  private async broadcastReadStatus(data: {
    messageId: string;
    userId: string;
    readAt: Date;
    chatId: string;
  }) {
    // Broadcast to all participants in the chat
    await supabase
      .from(`chat:${data.chatId}`)
      .send('broadcast', {
        event: 'message_read',
        payload: {
          messageId: data.messageId,
          userId: data.userId,
          readAt: data.readAt
        }
      });
  }
  
  private async broadcastUnreadCountUpdate(userId: string) {
    const totalUnread = await this.getTotalUnreadCount(userId);
    
    await supabase
      .from(`notifications:${userId}`)
      .send('broadcast', {
        event: 'unread_count_updated',
        payload: {
          totalUnread,
          userId
        }
      });
  }
}
```

#### TypingService (Redis-based)

```typescript
// src/services/TypingService.ts

export class TypingService {
  private redis: RedisClient;
  
  constructor(redisClient: RedisClient) {
    this.redis = redisClient;
  }
  
  async setUserTyping(chatId: string, userId: string) {
    // Store typing status with 2 second TTL
    const key = `typing:${chatId}:${userId}`;
    await this.redis.setex(key, 2, 'true');
    
    // Get all users currently typing in this chat
    const typingUsers = await this.getTypingUsers(chatId);
    
    // Broadcast to all chat participants
    await this.broadcastTypingStatus(chatId, typingUsers);
  }
  
  private async getTypingUsers(chatId: string): Promise<string[]> {
    // Get all keys matching pattern: typing:{chatId}:*
    const pattern = `typing:${chatId}:*`;
    const keys = await this.redis.keys(pattern);
    
    return keys.map(key => key.split(':')[2]); // Extract user IDs
  }
  
  private async broadcastTypingStatus(chatId: string, typingUserIds: string[]) {
    // Broadcast to all participants
    await supabase
      .from(`chat:${chatId}`)
      .send('broadcast', {
        event: 'users_typing',
        payload: {
          userIds: typingUserIds,
          timestamp: new Date()
        }
      });
  }
}
```

#### Backend Endpoints

```typescript
// src/routes/chatRoutes.ts

router.post('/chat/:id/typing', authenticateUser, async (req, res) => {
  try {
    const { id: chatId } = req.params;
    const userId = req.user.id;
    
    // Validate user is participant
    const isParticipant = await chatService.isUserInChat(chatId, userId);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });
    
    // Set typing status
    await typingService.setUserTyping(chatId, userId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/chat/messages/:id/mark-read', authenticateUser, async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user.id;
    
    // Mark message as read
    await chatService.markMessageAsRead(messageId, userId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/chat/unread-count', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const totalUnread = await chatService.getTotalUnreadCount(userId);
    
    res.json({ unreadCount: totalUnread });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/chat/:id/unread-count/reset', authenticateUser, async (req, res) => {
  try {
    const { id: chatId } = req.params;
    const userId = req.user.id;
    
    await chatService.markChatAsRead(chatId, userId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Frontend Implementation

#### Chat Badge Component

```typescript
// frontend/src/components/ChatBadge.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const ChatBadge: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const userId = useAuthStore(state => state.user?.id);
  
  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .from(`notifications:${userId}`)
      .on('broadcast', { event: 'unread_count_updated' }, (payload) => {
        setUnreadCount(payload.payload.totalUnread);
      })
      .subscribe();
    
    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [userId]);
  
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/chat/unread-count');
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  };
  
  return (
    <div className="relative">
      <ChatIcon className="w-6 h-6 cursor-pointer" />
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          {unreadCount}
        </div>
      )}
    </div>
  );
};
```

#### Typing Indicator Component

```typescript
// frontend/src/components/TypingIndicator.tsx

import React from 'react';

interface Props {
  userNames: string[];
}

export const TypingIndicator: React.FC<Props> = ({ userNames }) => {
  if (userNames.length === 0) return null;
  
  const displayText = userNames.length === 1 
    ? `${userNames[0]} is typing` 
    : `${userNames.slice(0, -1).join(', ')} and ${userNames[userNames.length - 1]} are typing`;
  
  return (
    <div className="flex items-center gap-1 text-gray-500 text-sm italic">
      <span>{displayText}</span>
      <div className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </div>
    </div>
  );
};
```

#### Chat Message Component with Read Receipts

```typescript
// frontend/src/components/ChatMessage.tsx

import React, { useEffect, useState } from 'react';

interface Props {
  message: IChatMessage;
  isOwnMessage: boolean;
  onMarkAsRead: (messageId: string) => void;
}

export const ChatMessage: React.FC<Props> = ({ message, isOwnMessage, onMarkAsRead }) => {
  const [readBy, setReadBy] = useState<string[]>([]);
  
  useEffect(() => {
    // Subscribe to read receipts for this message
    const subscription = supabase
      .from(`chat:${message.chat_id}`)
      .on('broadcast', { event: 'message_read' }, (payload) => {
        if (payload.payload.messageId === message.id) {
          setReadBy(prev => [...new Set([...prev, payload.payload.userId])]);
        }
      })
      .subscribe();
    
    // If message is visible, mark as read
    if (!isOwnMessage && !message.read_at) {
      const timer = setTimeout(() => {
        onMarkAsRead(message.id);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        supabase.removeSubscription(subscription);
      };
    }
    
    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [message, isOwnMessage, onMarkAsRead]);
  
  const getReadStatusIcon = () => {
    if (!isOwnMessage) return null;
    
    if (!message.read_at) return '✓'; // Sent
    if (readBy.length === 0) return '✓✓'; // Delivered
    return '✓✓'; // Read (filled version would be shown with CSS)
  };
  
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs px-4 py-2 rounded-lg ${
        isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
      }`}>
        <p>{message.message}</p>
        <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-70">
          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
          {getReadStatusIcon() && (
            <span className={message.read_at ? 'fill-current' : ''}>
              {getReadStatusIcon()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### Chat Modal Component

```typescript
// frontend/src/components/ChatModal.tsx

import React, { useEffect, useState } from 'react';

interface Props {
  chatId: string;
  onClose: () => void;
}

export const ChatModal: React.FC<Props> = ({ chatId, onClose }) => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const userId = useAuthStore(state => state.user?.id);
  
  useEffect(() => {
    // Fetch message history
    fetchChatHistory();
    
    // Mark chat as read when modal opens
    markChatAsRead();
    
    // Subscribe to new messages
    const messageSub = supabase
      .from(`group_chats:${chatId}`)
      .on('INSERT', payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    
    // Subscribe to typing status
    const typingSub = supabase
      .from(`chat:${chatId}`)
      .on('broadcast', { event: 'users_typing' }, (payload) => {
        setTypingUsers(payload.payload.userIds.filter(id => id !== userId));
      })
      .subscribe();
    
    return () => {
      supabase.removeSubscription(messageSub);
      supabase.removeSubscription(typingSub);
    };
  }, [chatId, userId]);
  
  const fetchChatHistory = async () => {
    try {
      const response = await api.get(`/chat/${chatId}/history`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch chat history', error);
    }
  };
  
  const markChatAsRead = async () => {
    try {
      await api.put(`/chat/${chatId}/unread-count/reset`);
    } catch (error) {
      console.error('Failed to mark chat as read', error);
    }
  };
  
  const handleSendMessage = async (messageText: string) => {
    try {
      await api.post('/chat/send-message', {
        chatId,
        message: messageText
      });
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };
  
  const handleTyping = async () => {
    try {
      await api.post(`/chat/${chatId}/typing`);
    } catch (error) {
      console.error('Failed to send typing status', error);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end">
      <div className="bg-white w-full sm:w-96 h-screen sm:h-auto sm:rounded-t-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-bold">Chat</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(msg => (
            <ChatMessage 
              key={msg.id}
              message={msg}
              isOwnMessage={msg.sender_id === userId}
              onMarkAsRead={(messageId) => markMessageAsRead(messageId)}
            />
          ))}
          
          {/* Typing Indicator */}
          {typingUsers.length > 0 && <TypingIndicator userNames={typingUsers} />}
        </div>
        
        {/* Input */}
        <div className="border-t p-4">
          <ChatInput onSend={handleSendMessage} onTyping={handleTyping} />
        </div>
      </div>
    </div>
  );
};
```

---

## Part 2: Push Notification & Bell Icon System

### 1. Database Schema

#### Create notifications table:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- chat, leave, purchase, task, birthday, checkout
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id UUID, -- References chat_id, task_id, leave_request_id, etc.
  action_url VARCHAR(255), -- Frontend route to navigate to
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (user_id, is_read),
  INDEX idx_created_at (created_at DESC)
);
```

#### Add to users table:
```sql
ALTER TABLE users ADD COLUMN push_token VARCHAR(500);
-- Stores FCM token for push notifications
```

### 2. Backend Implementation

#### NotificationService

```typescript
// src/services/NotificationService.ts

export class NotificationService {
  private admin: FirebaseAdminSDK; // or Supabase Push
  
  constructor() {
    // Initialize Firebase Admin SDK
    this.admin = initializeApp(firebaseConfig);
  }
  
  async createAndSendNotification(data: {
    userId: string;
    type: 'chat' | 'leave' | 'purchase' | 'task' | 'birthday' | 'checkout';
    title: string;
    message: string;
    relatedId?: string;
    actionUrl: string;
  }) {
    // 1. Save notification to database
    const notification = await db.notifications.create({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      related_id: data.relatedId,
      action_url: data.actionUrl,
      is_read: false,
      created_at: new Date()
    });
    
    // 2. Get user's push token
    const user = await db.users.findById(data.userId);
    if (!user.push_token) {
      console.log(`No push token for user ${data.userId}`);
      return notification;
    }
    
    // 3. Send push notification
    try {
      await this.sendPushNotification(user.push_token, {
        title: data.title,
        body: data.message,
        icon: this.getIconForType(data.type),
        badge: '/notification-badge.png',
        tag: `notification-${notification.id}`,
        data: {
          notificationId: notification.id,
          actionUrl: data.actionUrl,
          type: data.type
        }
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
    
    // 4. Broadcast notification via Supabase Realtime
    await this.broadcastNotification(data.userId, notification);
    
    return notification;
  }
  
  private async sendPushNotification(token: string, options: {
    title: string;
    body: string;
    icon: string;
    badge: string;
    tag: string;
    data: Record<string, string>;
  }) {
    // Using Firebase Cloud Messaging
    return await this.admin.messaging().send({
      token,
      notification: {
        title: options.title,
        body: options.body,
        imageUrl: options.icon
      },
      webpush: {
        headers: {
          TTL: '3600'
        },
        data: options.data,
        notification: {
          title: options.title,
          body: options.body,
          icon: options.icon,
          badge: options.badge,
          tag: options.tag,
          requireInteraction: false,
          actions: [
            {
              action: 'open',
              title: 'Open'
            }
          ]
        }
      }
    });
  }
  
  async markNotificationAsRead(notificationId: string, userId: string) {
    // Verify ownership
    const notification = await db.notifications.findById(notificationId);
    if (notification.user_id !== userId) {
      throw new Error('Not authorized');
    }
    
    // Mark as read
    await db.notifications.update(notificationId, {
      is_read: true
    });
    
    // Broadcast update
    await this.broadcastReadStatus(userId, notificationId);
  }
  
  async markAllNotificationsAsRead(userId: string) {
    await db.notifications.updateMany(
      { user_id: userId, is_read: false },
      { is_read: true }
    );
    
    // Broadcast update
    await supabase
      .from(`notifications:${userId}`)
      .send('broadcast', {
        event: 'all_marked_read',
        payload: { userId }
      });
  }
  
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.notifications.countWhere({
      user_id: userId,
      is_read: false
    });
    return result;
  }
  
  async getNotifications(userId: string, limit: number = 20, offset: number = 0) {
    return await db.notifications.find(
      { user_id: userId },
      {
        orderBy: { created_at: 'DESC' },
        limit,
        offset
      }
    );
  }
  
  private async broadcastNotification(userId: string, notification: INotification) {
    await supabase
      .from(`notifications:${userId}`)
      .send('broadcast', {
        event: 'new_notification',
        payload: notification
      });
  }
  
  private async broadcastReadStatus(userId: string, notificationId: string) {
    await supabase
      .from(`notifications:${userId}`)
      .send('broadcast', {
        event: 'notification_read',
        payload: { notificationId }
      });
  }
  
  private getIconForType(type: string): string {
    const icons: Record<string, string> = {
      chat: '/icons/chat.png',
      leave: '/icons/leave.png',
      purchase: '/icons/purchase.png',
      task: '/icons/task.png',
      birthday: '/icons/birthday.png',
      checkout: '/icons/checkout.png'
    };
    return icons[type] || '/icons/notification.png';
  }
}
```

#### Backend Endpoints

```typescript
// src/routes/notificationRoutes.ts

router.post('/notifications/subscribe', authenticateUser, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    
    // Save push token
    await db.users.update(userId, { push_token: token });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const notifications = await notificationService.getNotifications(
      userId,
      limit,
      offset
    );
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications/unread-count', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/notifications/:id/read', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await notificationService.markNotificationAsRead(id, userId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/notifications/read-all', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await notificationService.markAllNotificationsAsRead(userId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Frontend Implementation

#### Bell Icon Component

```typescript
// frontend/src/components/BellIcon.tsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const BellIcon: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const userId = useAuthStore(state => state.user?.id);
  
  useEffect(() => {
    if (!userId) return;
    
    // Fetch initial unread count
    fetchUnreadCount();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .from(`notifications:${userId}`)
      .on('broadcast', { event: '*' }, (payload) => {
        if (payload.payload.event === 'new_notification') {
          setUnreadCount(prev => prev + 1);
        } else if (payload.payload.event === 'notification_read') {
          setUnreadCount(prev => Math.max(0, prev - 1));
        } else if (payload.payload.event === 'all_marked_read') {
          setUnreadCount(0);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [userId]);
  
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2"
      >
        <BellSvgIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </div>
        )}
      </button>
      
      {showDropdown && (
        <NotificationDropdown 
          onClose={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};
```

#### Notification Dropdown Panel

```typescript
// frontend/src/components/NotificationDropdown.tsx

import React, { useEffect, useState } from 'react';

interface Props {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<Props> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications?limit=10');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleNotificationClick = async (notification: INotification) => {
    try {
      // Mark as read
      await api.put(`/notifications/${notification.id}/read`);
      
      // Navigate to action URL
      if (notification.action_url) {
        // Trigger animated highlight on target
        sessionStorage.setItem('highlightElement', notification.related_id || '');
        navigate(notification.action_url);
      }
      
      // Remove from local list
      setNotifications(prev => 
        prev.filter(n => n.id !== notification.id)
      );
    } catch (error) {
      console.error('Failed to handle notification click', error);
    }
  };
  
  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };
  
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl z-50">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-bold text-lg">Notifications</h3>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-blue-500 text-sm hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>
      
      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No notifications</div>
        ) : (
          notifications.map(notif => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onClick={() => handleNotificationClick(notif)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const NotificationItem: React.FC<{
  notification: INotification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{notification.title}</h4>
          <p className="text-gray-600 text-sm">{notification.message}</p>
          <p className="text-gray-400 text-xs mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
        )}
      </div>
    </div>
  );
};

function getNotificationIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    chat: <ChatIcon className="w-5 h-5" />,
    leave: <CalendarIcon className="w-5 h-5" />,
    purchase: <ShoppingIcon className="w-5 h-5" />,
    task: <CheckIcon className="w-5 h-5" />,
    birthday: <CakeIcon className="w-5 h-5" />,
    checkout: <LogOutIcon className="w-5 h-5" />
  };
  return icons[type] || <BellIcon className="w-5 h-5" />;
}
```

#### Animated Highlight Hook

```typescript
// frontend/src/hooks/useAnimatedHighlight.ts

export const useAnimatedHighlight = (elementId?: string) => {
  useEffect(() => {
    const highlightId = elementId || sessionStorage.getItem('highlightElement');
    if (!highlightId) return;
    
    const element = document.querySelector(`[data-id="${highlightId}"]`);
    if (!element) return;
    
    // Apply highlight animation
    element.classList.add('animate-highlight');
    
    // Remove after animation completes
    const timer = setTimeout(() => {
      element.classList.remove('animate-highlight');
      sessionStorage.removeItem('highlightElement');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [elementId]);
};

// Add to your global CSS or Tailwind config:
/*
@keyframes highlight {
  0% {
    background-color: rgba(255, 255, 0, 0);
    transform: scale(1);
  }
  50% {
    background-color: rgba(255, 255, 0, 0.3);
  }
  100% {
    background-color: rgba(255, 255, 0, 0);
    transform: scale(1);
  }
}

.animate-highlight {
  animation: highlight 2s ease-in-out;
}
*/
```

#### Service Worker for Push Notifications

```typescript
// frontend/public/service-worker.js

self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.notification.body,
    icon: data.notification.icon,
    badge: data.webpush.notification.badge,
    tag: data.webpush.notification.tag,
    requireInteraction: false,
    data: data.webpush.data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.notification.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  const { actionUrl, notificationId } = event.notification.data;
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Try to find existing window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === actionUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if not found
      return clients.openWindow(actionUrl);
    }).then(() => {
      // Mark notification as read
      fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
    })
  );
});
```

#### App-Level Push Notification Registration

```typescript
// frontend/src/App.tsx or main entry point

useEffect(() => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    registerServiceWorker();
    requestPushPermission();
  }
}, []);

const registerServiceWorker = async () => {
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker registered:', registration);
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

const requestPushPermission = async () => {
  if (Notification.permission === 'granted') {
    await subscribeToPushNotifications();
    return;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPushNotifications();
    }
  }
};

const subscribeToPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
    });
    
    // Send subscription token to backend
    await api.post('/notifications/subscribe', {
      token: subscription.toJSON().endpoint
    });
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
  }
};
```

---

## Integration Checklist

### Chat System
- [ ] Add `read_at` column to `chat_messages`
- [ ] Create `chat_unread_count` table
- [ ] Implement `ChatService` methods
- [ ] Implement `TypingService` with Redis
- [ ] Create chat endpoints (typing, mark-read, unread-count)
- [ ] Create chat badge component
- [ ] Create typing indicator component
- [ ] Create read receipts display
- [ ] Create chat modal with message history

### Notification System
- [ ] Create `notifications` table
- [ ] Add `push_token` column to `users`
- [ ] Set up Firebase Cloud Messaging
- [ ] Implement `NotificationService`
- [ ] Create notification endpoints
- [ ] Create bell icon component
- [ ] Create notification dropdown
- [ ] Implement animated highlight
- [ ] Register service worker for push
- [ ] Add push permission request flow

### Integration Points
- [ ] Trigger notifications from `ChatService` (new messages)
- [ ] Trigger notifications from `LeaveService` (approval/rejection)
- [ ] Trigger notifications from `PurchaseService` (approval/rejection)
- [ ] Trigger notifications from `TaskService` (assignment, due reminders)
- [ ] Add cron jobs for birthday & checkout reminders
- [ ] Test end-to-end flow: Send message → Notification → Navigate → Highlight

---

## Notes
- Use Supabase Realtime for broadcasting (free tier limits apply)
- Use Redis for temporary typing status to avoid database bloat
- Consider rate limiting for typing indicators
- Implement exponential backoff for push notification retries
- Add metrics/logging for notification delivery success rates
