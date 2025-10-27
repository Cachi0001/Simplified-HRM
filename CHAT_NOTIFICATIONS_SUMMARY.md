# Chat & Notification System - Quick Reference

## 📋 What You Asked For

### Chat Features (Real-Life Chat App Mirror)
✅ **Typing Indicator**: Shows "User is typing..." with animated dots
✅ **Read Receipts**: Show ✓ (sent), ✓✓ (delivered), ✓✓ (read-filled)
✅ **Unread Message Counter**: Red badge on chat icon (only visible >0)
✅ **Counter Logic**: Decreases when messages viewed, disappears at 0
✅ **Click to View**: Click chat card → open modal → view messages

### Notification Features (Perfect & Seamless)
✅ **Push Notifications**: Browser push with FCM integration
✅ **Bell Icon**: Red badge with unread count (only visible >0)
✅ **Click to Navigate**: Notification click → navigate to relevant page
✅ **Animated Highlight**: Target card pulses/flashes (1-2 seconds)
✅ **Seamless Integration**: Works with push notifications & in-app notifications

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Chat Badge    │ Bell Icon    │ Typing Indicator      │   │
│  │ Unread Count  │ Red Badge    │ Read Receipts        │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                 │                  │                │
│  Real-time Updates via Supabase Realtime                     │
│         │                 │                  │                │
└─────────┼─────────────────┼──────────────────┼────────────────┘
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼────────────────┐
│                  BACKEND (Node.js)                             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ ChatService        │ NotificationService            │    │
│  │ • Send Message     │ • Create Notification         │    │
│  │ • Mark Read        │ • Send Push                    │    │
│  │ • Track Typing     │ • Mark as Read                 │    │
│  │ • Count Unread     │ • Get Unread Count             │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Redis (Typing)     │ PostgreSQL      │ Firebase     │    │
│  │ TTL: 2 seconds     │ (Persistence)   │ (Push API)   │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Changes

### New Tables

#### `chat_unread_count`
```sql
user_id (UUID) → references users
chat_id (UUID) → references group_chats
unread_count (INT) → starts at 0
updated_at (TIMESTAMPTZ)
```

#### `notifications`
```sql
id (UUID) PRIMARY KEY
user_id (UUID) → references users
type: 'chat' | 'leave' | 'purchase' | 'task' | 'birthday' | 'checkout'
title (VARCHAR)
message (TEXT)
related_id (UUID) → chat_id, task_id, etc
action_url (VARCHAR) → frontend route to navigate
is_read (BOOLEAN) → default FALSE
created_at (TIMESTAMPTZ)
expires_at (TIMESTAMPTZ) → 30 days default
```

### Modified Tables

#### `chat_messages`
```sql
ADD COLUMN read_at TIMESTAMPTZ NULL
-- When message was read by recipient
```

#### `users`
```sql
ADD COLUMN push_token VARCHAR(500)
-- Browser FCM token for push notifications
```

---

## 🔄 Real-Time Flow

### Message Sent
```
User A sends message
    ↓
1. Insert into chat_messages (read_at = NULL)
2. Get all participants except sender
3. Increment unread_count for each participant
4. Broadcast via Supabase Realtime
5. Send notification if recipients not in active chat
    ↓
User B sees:
  • Chat badge updates (+1 unread)
  • Notification appears
  • Push notification (if background)
```

### Message Read
```
User B opens chat / reads message
    ↓
1. Call mark-read endpoint
2. Update message.read_at = NOW()
3. Decrement unread_count for User B
4. Broadcast read status to all participants
    ↓
User A sees:
  • Double check mark ✓✓ changes to filled ✓✓
  • Own message shows as read
```

### Notification Clicked
```
User B clicks notification
    ↓
1. Navigate to action_url (e.g., /tasks/123)
2. Mark notification as read
3. Find target element (data-id="related_id")
4. Apply pulse/flash animation (1-2s)
    ↓
User sees animated highlight on the card
```

---

## 🎯 Key Implementation Details

### Typing Indicator (Redis)
- **Storage**: `typing:{chatId}:{userId}` with 2-second TTL
- **Broadcast**: Send list of typing users every keystroke
- **UI**: Show "User X is typing..." with animated dots
- **Auto-hide**: After 3 seconds inactivity

### Read Receipts
- **Single ✓**: Message sent (read_at is NULL)
- **Double ✓✓**: Message delivered (read_at is NULL but received)
- **Double ✓✓ (filled)**: Message read (read_at has timestamp)
- **Display**: Only on own messages, right-aligned

### Unread Counters

#### Chat Badge
- **Display**: Red circular badge with count
- **Visible**: Only if count > 0
- **Update**: Real-time via Supabase
- **Trigger**: New message (increment), mark-read (decrement)

#### Bell Icon Badge
- **Display**: Red circular badge with count
- **Visible**: Only if count > 0
- **Update**: Real-time via Supabase
- **Trigger**: New notification, mark-read (decrement)

### Animated Highlight
- **Animation**: Pulse or yellow/blue background flash
- **Duration**: 1-2 seconds
- **Trigger**: When navigation from notification
- **Fade**: Smoothly fade out after animation

---

## 📡 API Endpoints

### Chat Endpoints
```
POST   /api/chat/:id/typing                      → Set typing status
PUT    /api/chat/messages/:id/mark-read          → Mark message as read
GET    /api/chat/unread-count                    → Get total unread
PUT    /api/chat/:id/unread-count/reset          → Reset when opening chat
```

### Notification Endpoints
```
POST   /api/notifications/subscribe              → Register push token
GET    /api/notifications                        → Get notifications
GET    /api/notifications/unread-count           → Get unread count
PUT    /api/notifications/:id/read               → Mark as read
PUT    /api/notifications/read-all               → Mark all as read
```

---

## 🔧 Implementation Order

### Phase 1: Database
1. [ ] Add `read_at` to `chat_messages`
2. [ ] Create `chat_unread_count` table
3. [ ] Create `notifications` table
4. [ ] Add `push_token` to `users`

### Phase 2: Backend Services
1. [ ] Implement `ChatService` (message, read, unread logic)
2. [ ] Implement `TypingService` (Redis)
3. [ ] Implement `NotificationService` (create, send, broadcast)
4. [ ] Set up Firebase Cloud Messaging

### Phase 3: Backend Endpoints
1. [ ] Chat endpoints (typing, mark-read, unread-count)
2. [ ] Notification endpoints (subscribe, get, mark-read)

### Phase 4: Frontend Components
1. [ ] Chat Badge component
2. [ ] Typing Indicator component
3. [ ] Read Receipts in messages
4. [ ] Bell Icon component
5. [ ] Notification Dropdown
6. [ ] Animated Highlight
7. [ ] Service Worker

### Phase 5: Integration
1. [ ] Connect ChatService to send notifications
2. [ ] Connect LeaveService to send notifications
3. [ ] Connect PurchaseService to send notifications
4. [ ] Connect TaskService to send notifications
5. [ ] Add cron jobs (birthday, checkout reminders)

---

## 🧪 Testing Checklist

### Chat Features
- [ ] Send message → unread counter increments
- [ ] Open chat → unread counter resets
- [ ] Read message → read receipt shows
- [ ] Type message → typing indicator appears
- [ ] Stop typing → indicator disappears after 3s
- [ ] Multiple users typing → shows all names

### Notification Features
- [ ] Create notification → badge increments
- [ ] Click notification → navigates to page
- [ ] Target card → animates highlight
- [ ] Mark read → badge decrements
- [ ] Mark all read → badge disappears (if 0)
- [ ] Push notification in background → badge increments
- [ ] Click push notification → navigates + highlights

---

## 💡 Best Practices

1. **Rate Limiting**: Limit typing broadcasts to once per keystroke
2. **Pagination**: Load notifications in pages (not all at once)
3. **Error Handling**: Retry failed notifications with exponential backoff
4. **Cleanup**: Expire notifications after 30 days
5. **Performance**: Use indexes on frequently queried columns
6. **Security**: Validate user ownership of notifications/messages
7. **Accessibility**: Ensure animated highlights don't cause seizures

---

## 📚 Documentation Files

- **CHAT_NOTIFICATIONS_IMPLEMENTATION.md**: Detailed code examples & patterns
- **TODO.md**: Updated roadmap with feature checklist
- **.zencoder/rules/repo.md**: System architecture overview

---

## 🚀 Ready to Start?

Follow the **Implementation Order** above and use **CHAT_NOTIFICATIONS_IMPLEMENTATION.md** for detailed code examples.

**Key files to create/modify:**
1. Backend Services: `ChatService.ts`, `TypingService.ts`, `NotificationService.ts`
2. Frontend Components: `ChatBadge.tsx`, `BellIcon.tsx`, `TypingIndicator.tsx`
3. Service Worker: `public/service-worker.js`

Good luck! 🎉
