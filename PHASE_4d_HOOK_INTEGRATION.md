# Phase 4d: Integration Guide - Connecting Realtime Hooks to Components

**Status**: Integration Examples & Implementation Patterns
**Files Included**: ChatPage, ChatBadge, NotificationBell, Header examples
**Estimated Time**: 2-3 hours implementation

---

## 📋 Quick Integration Checklist

```
Priority 1 (Must Have):
- [ ] ChatPage: useRealtimeChat + useRealtimeTyping integration
- [ ] NotificationBell: useRealtimeNotifications + usePushNotifications

Priority 2 (Important):
- [ ] Header: Push notification permission request
- [ ] BottomNavbar: Chat badge with real-time updates
- [ ] ChatMessage: ReadReceipt status display

Priority 3 (Polish):
- [ ] Toast notifications on new messages
- [ ] Notification highlight animation
- [ ] Error boundary for realtime failures
```

---

## 1️⃣ CHAT PAGE - Full Real-Time Chat Integration

### File: `frontend/src/pages/ChatPage.tsx`

**What This Does:**
- Loads chat history + real-time messages via `useRealtimeChat`
- Shows typing indicators for other users via `useRealtimeTyping`
- Marks messages as read via read receipts
- Displays message status (sending → sent → read)

### Implementation

```tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  useRealtimeChat,
  type ChatMessage,
} from '../hooks/useRealtimeChat';
import { useRealtimeTyping } from '../hooks/useRealtimeTyping';
import { ChatMessage as ChatMessageComponent } from '../components/chat/ChatMessage';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { ReadReceipt } from '../components/chat/ReadReceipt';

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Real-time hooks
  const {
    messages,
    sendMessage,
    markMessageAsRead,
    loadChatHistory,
    subscribeToChat,
    unsubscribeFromChat,
    error: chatError,
    isLoading,
  } = useRealtimeChat();

  const {
    typingUsers,
    startTyping,
    stopTyping,
    getTypingText,
  } = useRealtimeTyping();

  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // ========================================================================
  // 1. LOAD CHAT HISTORY & SUBSCRIBE TO REALTIME
  // ========================================================================

  useEffect(() => {
    if (!chatId) return;

    const setupChat = async () => {
      try {
        // Load initial message history
        await loadChatHistory(chatId);
        
        // Subscribe to real-time updates
        subscribeToChat(chatId);

        console.log('[ChatPage] Chat loaded and subscribed:', chatId);
      } catch (error) {
        console.error('[ChatPage] Failed to setup chat:', error);
      }
    };

    setupChat();

    // Cleanup
    return () => {
      unsubscribeFromChat();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, loadChatHistory, subscribeToChat, unsubscribeFromChat]);

  // ========================================================================
  // 2. AUTO-SCROLL TO LATEST MESSAGE
  // ========================================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ========================================================================
  // 3. MARK VISIBLE MESSAGES AS READ
  // ========================================================================

  useEffect(() => {
    const markVisibleAsRead = async () => {
      for (const msg of messages) {
        if (msg.senderId !== getUserId() && !msg.readAt) {
          try {
            await markMessageAsRead(msg.id);
          } catch (error) {
            console.warn('[ChatPage] Failed to mark message as read:', error);
          }
        }
      }
    };

    // Debounce to avoid too many calls
    const timer = setTimeout(markVisibleAsRead, 500);
    return () => clearTimeout(timer);
  }, [messages, markMessageAsRead]);

  // ========================================================================
  // 4. HANDLE TYPING INDICATOR
  // ========================================================================

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setMessageText(text);

    // Notify others that user is typing
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      startTyping(chatId!);
    }

    // Reset typing indicator after 2 seconds of no input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(chatId!);
      }
    }, 2000);
  };

  // ========================================================================
  // 5. SEND MESSAGE
  // ========================================================================

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || !chatId) return;

    try {
      // Stop typing indicator
      setIsTyping(false);
      stopTyping(chatId);
      clearTimeout(typingTimeoutRef.current);

      // Send message (immediately shows with "sending" status)
      await sendMessage(chatId, {
        message: messageText,
        senderId: getUserId(),
      });

      setMessageText('');
    } catch (error) {
      console.error('[ChatPage] Failed to send message:', error);
      // Show error toast
    }
  };

  // ========================================================================
  // 6. RENDER
  // ========================================================================

  const typingText = getTypingText(
    typingUsers,
    Object.keys(typingUsers).length
  );

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h1 className="text-xl font-bold">Chat</h1>
      </div>

      {/* Error Message */}
      {chatError && (
        <div className="p-3 bg-red-100 text-red-700 border-b">
          {chatError}
          <button
            className="ml-2 underline text-sm"
            onClick={() => {
              if (chatId) subscribeToChat(chatId);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="text-center text-gray-500">Loading messages...</div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500">No messages yet</div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <ChatMessageComponent
              message={msg}
              isOwn={msg.senderId === getUserId()}
            />

            {/* Show read receipt for own messages */}
            {msg.senderId === getUserId() && (
              <ReadReceipt
                status={msg.status || 'sending'}
                readAt={msg.readAt}
                senderName={msg.senderName}
              />
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {typingText && (
          <div className="flex items-end space-x-2">
            <TypingIndicator />
            <span className="text-sm text-gray-600 italic">{typingText}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t bg-gray-50 flex gap-2"
      >
        <input
          type="text"
          value={messageText}
          onChange={handleMessageChange}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!messageText.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// Helper to get current user ID
function getUserId(): string {
  try {
    const auth = localStorage.getItem('auth');
    if (!auth) return '';
    return JSON.parse(auth).userId || '';
  } catch {
    return '';
  }
}
```

---

## 2️⃣ NOTIFICATION BELL - Real-Time Notifications

### File: `frontend/src/components/dashboard/NotificationBell.tsx`

**What This Does:**
- Shows unread notification count in red badge
- Opens dropdown with list of notifications
- Marks notifications as read when clicked
- Shows notification type icons (chat, task, leave, etc.)
- Displays timestamp (1h ago, 2m ago, etc.)

### Implementation

```tsx
import { useEffect, useState, useRef } from 'react';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { Bell, X } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'chat' | 'task' | 'leave' | 'purchase';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time notifications
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useRealtimeNotifications();

  // Push notifications
  const { isSupported, permission, subscribe } = usePushNotifications();

  // ========================================================================
  // 1. REQUEST PUSH PERMISSION ON MOUNT
  // ========================================================================

  useEffect(() => {
    const requestPushPermission = async () => {
      if (isSupported && permission === null) {
        try {
          await subscribe();
        } catch (error) {
          console.warn('[NotificationBell] Push subscription failed:', error);
        }
      }
    };

    requestPushPermission();
  }, [isSupported, permission, subscribe]);

  // ========================================================================
  // 2. CLOSE DROPDOWN ON OUTSIDE CLICK
  // ========================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // ========================================================================
  // 3. FORMAT NOTIFICATION TIME
  // ========================================================================

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'unknown';
    }
  };

  // ========================================================================
  // 4. GET NOTIFICATION ICON BY TYPE
  // ========================================================================

  const getNotificationIcon = (
    type: string
  ): React.ReactNode => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 'chat':
        return '💬';
      case 'task':
        return '✓';
      case 'leave':
        return '📅';
      case 'purchase':
        return '🛒';
      case 'birthday':
        return '🎉';
      case 'checkout':
        return '⏰';
      default:
        return '📬';
    }
  };

  // ========================================================================
  // 5. HANDLE NOTIFICATION CLICK
  // ========================================================================

  const handleNotificationClick = async (
    notification: NotificationItem
  ) => {
    try {
      // Mark as read
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      // Navigate if action URL exists
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }

      setIsOpen(false);
    } catch (error) {
      console.error('[NotificationBell] Error clicking notification:', error);
    }
  };

  // ========================================================================
  // 6. RENDER
  // ========================================================================

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() =>
                      handleNotificationClick(
                        notification as NotificationItem
                      )
                    }
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="text-xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t text-center text-xs text-gray-500">
              {unreadCount} unread
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 3️⃣ HEADER - Push Notification Setup

### File: `frontend/src/components/layout/Header.tsx`

**What This Does:**
- Shows notification bell
- Handles push permission requests
- Displays permission status

### Key Addition

```tsx
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { NotificationBell } from '../dashboard/NotificationBell';

export function Header() {
  const { isSupported, permission, subscribe } = usePushNotifications();

  // Request permission on mount or when permission changes
  useEffect(() => {
    const setupNotifications = async () => {
      if (
        isSupported &&
        permission !== 'granted' &&
        permission !== 'denied'
      ) {
        try {
          await subscribe();
        } catch (error) {
          console.warn('[Header] Push setup failed:', error);
        }
      }
    };

    setupNotifications();
  }, [isSupported, permission, subscribe]);

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold">Go3net HR System</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Push Status Indicator */}
        {!isSupported && (
          <span className="text-xs text-gray-500">
            Push notifications not supported
          </span>
        )}

        {/* User Menu */}
        {/* ... existing code ... */}
      </div>
    </header>
  );
}
```

---

## 4️⃣ CHAT BADGE - Unread Chat Counter

### File: `frontend/src/components/chat/ChatBadge.tsx` (Update)

**What This Does:**
- Shows unread message count on chat icon
- Updates in real-time via `useChatUnreadCount`
- Disappears when count is 0

### Implementation

```tsx
import { useChatUnreadCount } from '../../hooks/useChatUnreadCount';

interface ChatBadgeProps {
  chatId: string;
  children: React.ReactNode;
}

export function ChatBadge({ chatId, children }: ChatBadgeProps) {
  const { unreadCount } = useChatUnreadCount(chatId);

  return (
    <div className="relative inline-block">
      {children}

      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
}
```

---

## 5️⃣ BOTTOM NAVBAR - Chat Icon Integration

### File: `frontend/src/components/layout/BottomNavbar.tsx` (Update)

**What This Does:**
- Shows total unread message count across all chats
- Chat badge appears on mobile bottom nav

### Key Addition

```tsx
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { useChatUnreadCount } from '../../hooks/useChatUnreadCount';
import { MessageCircle } from 'lucide-react';

export function BottomNavbar() {
  // Get total unread across all chats
  const { unreadCount: totalChatUnread } = useChatUnreadCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <div className="flex justify-around items-center">
        {/* Chat Tab with Badge */}
        <div className="relative p-3">
          <MessageCircle className="w-6 h-6" />
          {totalChatUnread > 0 && (
            <span className="absolute top-1 right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {totalChatUnread}
            </span>
          )}
        </div>

        {/* Other tabs */}
        {/* ... existing code ... */}
      </div>
    </nav>
  );
}
```

---

## 6️⃣ INTEGRATION CHECKLIST

### Phase 4d Setup Steps

```
BEFORE INTEGRATION:
- [ ] .env has VITE_VAPID_PUBLIC_KEY (get from your backend team)
- [ ] Service worker (frontend/src/sw.ts) is built into Vite
- [ ] Backend has /api/employees/push-token POST/DELETE endpoints
- [ ] Backend has /api/notifications/:id/read PUT endpoint
- [ ] Supabase Realtime tables are published (chat_messages, notifications, typing_status)

INTEGRATION STEPS:
- [ ] Add ChatPage component with useRealtimeChat + useRealtimeTyping
- [ ] Add NotificationBell with useRealtimeNotifications
- [ ] Update Header to include NotificationBell
- [ ] Update BottomNavbar to show chat badge
- [ ] Test typing indicator (type in chat, should see other user typing)
- [ ] Test message sending (should appear with status "sending" → "sent" → "read")
- [ ] Test read receipts (click message should mark as read)
- [ ] Test push notifications (send from backend, should appear)
- [ ] Test notification click (should navigate to correct page)
- [ ] Test badge updates (unread count increases/decreases)

TESTING SCENARIOS:
[ ] Scenario 1: Open chat, send message, see it in real-time
[ ] Scenario 2: Two users in chat, one types, other sees typing indicator
[ ] Scenario 3: Receive push notification while tab is inactive
[ ] Scenario 4: Click push notification, navigate to correct page
[ ] Scenario 5: Mark notification as read, badge count decreases
[ ] Scenario 6: Service worker handles offline notifications
[ ] Scenario 7: Permission denied, gracefully handle no notifications
```

---

## 7️⃣ ERROR HANDLING & TROUBLESHOOTING

### Common Issues

**Issue: Typing indicator not showing**
- Check: Supabase table `typing_status` is published for realtime
- Check: `startTyping` is being called with correct chatId
- Check: TTL expiry (2 seconds) is working

**Issue: Messages not appearing in real-time**
- Check: Supabase table `chat_messages` is published for INSERT/UPDATE/DELETE
- Check: User subscribed to correct chatId
- Check: Network tab shows WebSocket connection (look for wss://)

**Issue: Push notifications not working**
- Check: User granted notification permission (check browser settings)
- Check: Service Worker registered successfully (DevTools > Application tab)
- Check: VAPID public key is correct (matches backend private key)
- Check: Browser supports Web Push API

**Issue: Badge not updating**
- Check: Supabase subscription to notifications table
- Check: `is_read` status is being updated on backend
- Check: Real-time event is being broadcast

---

## 8️⃣ NEXT STEPS

**After implementing Phase 4d:**

1. **Phase 5: End-to-End Testing**
   - Comprehensive testing matrix
   - Performance benchmarks
   - Load testing with multiple users

2. **Phase 6: Performance Optimization**
   - Debounce typing indicators
   - Lazy load message history
   - Optimize re-renders

3. **Phase 7: Production Deployment**
   - Environment variable validation
   - Security audit (RLS policies)
   - Monitoring & alerting setup

---

## 📚 Additional Resources

- **Service Worker MDN**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Web Push API**: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- **VAPID Keys Generation**: `npx web-push generate-vapid-keys`
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime

---

**Questions?** Check PHASE_4c_REALTIME_INTEGRATION.md for detailed hook APIs.