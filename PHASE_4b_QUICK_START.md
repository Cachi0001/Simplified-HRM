# Phase 4b - Quick Start Guide 🚀

## What Was Built

✅ **3 React Hooks** | ✅ **4 Components** | ✅ **Database Migration** | ✅ **Full Types**

---

## 🪝 Hooks (Copy & Paste Ready)

### useChat
```typescript
import { useChat } from '@/hooks/useChat';

const { messages, sendMessage, getChatHistory } = useChat(userId);

// Get messages
await getChatHistory(chatId);

// Send message
await sendMessage(chatId, "Hello!");

// Mark as read
await markMessageAsRead(messageId);
await markChatAsRead(chatId);
```

### useTypingIndicator
```typescript
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

const { typingUsers, startTyping, stopTyping } = useTypingIndicator(userId);

// Start typing (auto-extends 2s TTL)
await startTyping(chatId);

// Stop typing
await stopTyping(chatId);
```

### useChatUnreadCount
```typescript
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';

const { totalUnreadCount, unreadCounts, markChatAsRead } = useChatUnreadCount();

// Get total unread
console.log(totalUnreadCount); // 5

// Mark chat as read
await markChatAsRead(chatId);
```

---

## 🎨 Components (Copy & Paste Ready)

### ChatMessage
```typescript
import { ChatMessage } from '@/components/chat/ChatMessage';

<ChatMessage
  id={msg.id}
  senderName="John"
  content="Hello!"
  timestamp={msg.timestamp}
  isOwn={msg.sender_id === userId}
  readAt={msg.read_at}
  status="read"
/>
```

### ChatBadge
```typescript
import { ChatBadge } from '@/components/chat/ChatBadge';

<div className="relative">
  <ChatIcon />
  <ChatBadge count={totalUnreadCount} />
</div>
```

### TypingIndicator
```typescript
import { TypingIndicator } from '@/components/chat/TypingIndicator';

<TypingIndicator users={typingUsers} />
// Shows: ✍️ John and 2 others are typing...
```

### ReadReceipt
```typescript
import { ReadReceipt } from '@/components/chat/ReadReceipt';

<ReadReceipt 
  status={readAt ? 'read' : 'sent'}
  timestamp={msg.timestamp}
/>
```

---

## 📚 Types

```typescript
import { ChatMessage, GroupChat, UnreadCount } from '@/types/chat';

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  timestamp: string;
  read_at?: string | null;
}

interface UnreadCount {
  chat_id: string;
  unread_count: number;
}
```

---

## 🎯 Common Patterns

### Pattern 1: Display Chat Messages
```typescript
const { messages, getChatHistory } = useChat(userId);

useEffect(() => {
  getChatHistory(chatId);
}, [chatId]);

return (
  <div>
    {messages.map(msg => (
      <ChatMessage key={msg.id} {...msg} isOwn={msg.sender_id === userId} />
    ))}
  </div>
);
```

### Pattern 2: Input with Typing Indicator
```typescript
const { startTyping, stopTyping } = useTypingIndicator(userId);

const handleChange = () => {
  startTyping(chatId); // Auto-extends TTL
};

const handleSend = async (text: string) => {
  await sendMessage(chatId, text);
  await stopTyping(chatId);
};
```

### Pattern 3: Unread Badge
```typescript
const { totalUnreadCount } = useChatUnreadCount();

return (
  <Badge count={totalUnreadCount} />
);
```

### Pattern 4: Mark as Read on Open
```typescript
useEffect(() => {
  const markAsRead = async () => {
    await markChatAsRead(chatId);
    await getChatHistory(chatId);
  };
  markAsRead();
}, [chatId]);
```

---

## 📊 API Endpoints Used

```
POST   /api/chat/send                      (sendMessage)
PATCH  /api/chat/message/:id/read          (markMessageAsRead)
PATCH  /api/chat/:id/read                  (markChatAsRead)
GET    /api/chat/:id/history               (getChatHistory)
GET    /api/chat/unread-count/total        (getTotalUnreadCount)
GET    /api/chat/unread-counts             (getAllUnreadCounts)
GET    /api/chat/:id/unread-count          (getChatUnreadCount)
GET    /api/chat/message/:id/read-receipt  (getReadReceipt)
GET    /api/chat/:id/participants          (getChatParticipants)

POST   /api/typing/start                   (startTyping)
POST   /api/typing/stop                    (stopTyping)
GET    /api/typing/:chatId                 (getTypingUsers)
GET    /api/typing/:chatId/:userId         (isUserTyping)

GET    /api/notifications                  (getNotifications)
GET    /api/notifications/unread           (getUnreadNotifications)
GET    /api/notifications/unread-count     (getUnreadCount)
PATCH  /api/notifications/:id/read         (markAsRead)
PATCH  /api/notifications/mark-all-read    (markAllAsRead)
DELETE /api/notifications/:id              (deleteNotification)
POST   /api/notifications/push-token       (savePushToken)
GET    /api/notifications/push-tokens/:type (getUsersWithPushTokens)
```

---

## 🗄️ Database Schema

### chat_messages (modified)
```sql
ALTER TABLE chat_messages ADD COLUMN read_at TIMESTAMPTZ;
```

### chat_unread_count (new)
```sql
user_id UUID, chat_id UUID, unread_count INT, UNIQUE(user_id, chat_id)
```

### notifications (new)
```sql
id, user_id, type, title, message, related_id, action_url, is_read, created_at, expires_at
```

### typing_status (new)
```sql
chat_id UUID, user_id UUID, started_at TIMESTAMPTZ, expires_at TIMESTAMPTZ (2s TTL)
```

### employees (modified)
```sql
ALTER TABLE employees ADD COLUMN push_token TEXT;
```

---

## ✅ Testing Checklist

- [ ] Import hook in component
- [ ] Call hook in useEffect
- [ ] Component re-renders with data
- [ ] Error state displays correctly
- [ ] Loading state shows while fetching
- [ ] TypeScript has no errors
- [ ] Check browser console for logs

---

## 🐛 Debugging Tips

### Hook not updating?
```typescript
// Check if hook is called on mount
useEffect(() => {
  console.log('Hook mounted');
  getChatHistory(chatId);
}, [chatId]);
```

### Components not rendering?
```typescript
// Check error state
const { error, isLoading } = useChat();
console.log('Error:', error);
console.log('Loading:', isLoading);
```

### Typing indicator not working?
```typescript
// Check auto-stop
// Note: Hook auto-stops after 2s + buffer
// Manual stop not needed unless you want immediate stop
```

### Messages not marked as read?
```typescript
// Make sure to call markChatAsRead when opening
useEffect(() => {
  markChatAsRead(chatId);
}, [chatId, markChatAsRead]);
```

---

## 📖 Full Documentation

- **Complete Guide**: `PHASE_4b_FRONTEND_INTEGRATION.md`
- **Completion Summary**: `PHASE_4b_COMPLETION_SUMMARY.md`
- **Implementation Details**: `PHASE_4b_API_ENDPOINTS_SUMMARY.md`

---

## 🚀 Next: Phase 4c

Coming soon: Supabase Realtime Integration
- Real-time message subscriptions
- Live typing indicators
- Push notifications
- Service worker setup

---

## 💡 Pro Tips

1. **Always handle errors**
   ```typescript
   try {
     await sendMessage(chatId, text);
   } catch (err) {
     console.error('Message failed:', err);
   }
   ```

2. **Use loading states**
   ```typescript
   {isLoading ? <Spinner /> : <Messages />}
   ```

3. **Cleanup on unmount**
   ```typescript
   useEffect(() => {
     return () => {
       // Cleanup code
     };
   }, []);
   ```

4. **Type your props**
   ```typescript
   interface Props {
     chatId: string;
     userId: string;
   }
   ```

---

**Questions?** See the full documentation: `PHASE_4b_FRONTEND_INTEGRATION.md`

**Ready for Phase 4c?** Start here: Supabase Realtime setup guide (coming next)