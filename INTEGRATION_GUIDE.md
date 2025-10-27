# Integration Guide: Chat & Notification System

This guide shows how to integrate the chat and notification system into your existing Go3net codebase.

---

## 1. Backend Service Integration

### Step 1.1: Create ChatService

**File**: `backend/src/services/ChatService.ts`

```typescript
// Add to existing services directory
// This service handles all message operations, read receipts, and unread counting
// See CHAT_NOTIFICATIONS_IMPLEMENTATION.md for full implementation
```

**Dependency Injection** (in your app initialization):
```typescript
// backend/src/server.ts or your app initialization file
import { ChatService } from './services/ChatService';
import { TypingService } from './services/TypingService';

const redisClient = initializeRedis(); // Your Redis setup
const chatService = new ChatService();
const typingService = new TypingService(redisClient);

// Make available to routes/middleware
app.use((req, res, next) => {
  req.chatService = chatService;
  req.typingService = typingService;
  next();
});
```

### Step 1.2: Create TypingService

**File**: `backend/src/services/TypingService.ts`

```typescript
// Uses Redis for temporary typing status storage
// Reduces database queries and provides fast broadcasts
```

**Redis Configuration** (if not already setup):
```typescript
// backend/src/config/redis.ts
import Redis from 'redis';

export const initializeRedis = () => {
  const client = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  });
  
  client.on('error', (err) => {
    console.error('Redis error:', err);
  });
  
  return client;
};
```

### Step 1.3: Create NotificationService

**File**: `backend/src/services/NotificationService.ts`

```typescript
// Handles notification creation, push sending, and broadcasting
// Integrates with Firebase Cloud Messaging for push notifications
```

**Firebase Setup** (if not already setup):
```typescript
// backend/src/config/firebase.ts
import admin from 'firebase-admin';

export const initializeFirebase = () => {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    )
  });
  
  return admin;
};

// Use in server.ts
const firebaseAdmin = initializeFirebase();
```

### Step 1.4: Create Chat Routes

**File**: `backend/src/routes/chatRoutes.ts`

```typescript
// Create new file with chat-related endpoints
// POST   /api/chat/:id/typing
// PUT    /api/chat/messages/:id/mark-read
// GET    /api/chat/unread-count
// PUT    /api/chat/:id/unread-count/reset
```

**Register in main app**:
```typescript
// backend/src/server.ts
import chatRoutes from './routes/chatRoutes';

app.use('/api', chatRoutes);
```

### Step 1.5: Create Notification Routes

**File**: `backend/src/routes/notificationRoutes.ts`

```typescript
// Create new file with notification endpoints
// POST   /api/notifications/subscribe
// GET    /api/notifications
// GET    /api/notifications/unread-count
// PUT    /api/notifications/:id/read
// PUT    /api/notifications/read-all
```

**Register in main app**:
```typescript
// backend/src/server.ts
import notificationRoutes from './routes/notificationRoutes';

app.use('/api', notificationRoutes);
```

### Step 1.6: Trigger Notifications from Existing Services

#### From ChatService (when message is sent)
```typescript
// Inside ChatService.sendMessage()

// Existing code...
await chatService.sendMessage(chatId, senderId, messageText);

// Add notification trigger
if (othersUserIds.length > 0) {
  for (const userId of othersUserIds) {
    await notificationService.createAndSendNotification({
      userId,
      type: 'chat',
      title: 'New message',
      message: messageText.substring(0, 50) + '...',
      relatedId: chatId,
      actionUrl: `/chat/${chatId}`
    });
  }
}
```

#### From LeaveService (on approval/rejection)
```typescript
// In your existing LeaveService

async approveLeaveRequest(leaveId: string) {
  // Existing approval logic...
  
  const leave = await leaveService.approve(leaveId);
  
  // Add notification
  await notificationService.createAndSendNotification({
    userId: leave.employee_id,
    type: 'leave',
    title: 'Leave Request Approved',
    message: `Your leave request from ${leave.start_date} to ${leave.end_date} has been approved.`,
    relatedId: leave.id,
    actionUrl: `/leave/requests/${leave.id}`
  });
}
```

#### From PurchaseService (on approval/rejection)
```typescript
// In your existing PurchaseService

async approvePurchaseRequest(purchaseId: string) {
  // Existing approval logic...
  
  const purchase = await purchaseService.approve(purchaseId);
  
  // Add notification
  await notificationService.createAndSendNotification({
    userId: purchase.employee_id,
    type: 'purchase',
    title: 'Purchase Request Approved',
    message: `Your purchase request for ${purchase.item_name} (${purchase.amount}) has been approved.`,
    relatedId: purchase.id,
    actionUrl: `/purchase/requests/${purchase.id}`
  });
}
```

#### From TaskService (on assignment)
```typescript
// In your existing TaskService

async assignTask(taskId: string, assigneeId: string) {
  // Existing assignment logic...
  
  const task = await taskService.assign(taskId, assigneeId);
  
  // Add notification
  await notificationService.createAndSendNotification({
    userId: assigneeId,
    type: 'task',
    title: 'New Task Assigned',
    message: task.title,
    relatedId: task.id,
    actionUrl: `/tasks/${task.id}`
  });
}
```

### Step 1.7: Add Cron Jobs for Reminders

**File**: `backend/src/jobs/cronJobs.ts`

```typescript
import cron from 'node-cron';
import { notificationService } from './services/NotificationService';

// Daily birthday notifications (8 AM)
cron.schedule('0 8 * * *', async () => {
  const today = new Date();
  const birthdayEmployees = await db.employees.find({
    dob: `${today.getMonth() + 1}-${today.getDate()}`
  });
  
  for (const employee of birthdayEmployees) {
    // Notify all employees
    const allEmployees = await db.employees.findAll();
    for (const emp of allEmployees) {
      await notificationService.createAndSendNotification({
        userId: emp.id,
        type: 'birthday',
        title: `Happy Birthday!`,
        message: emp.id === employee.id 
          ? `Happy Birthday, ${employee.first_name}! 🎉`
          : `Today is ${employee.first_name}'s birthday! 🎉`,
        actionUrl: `/employees/${employee.id}`
      });
    }
  }
});

// Daily checkout reminders (6 PM)
cron.schedule('0 18 * * 1-5', async () => { // Mon-Fri only
  const unCheckedOut = await db.attendance.find({
    checked_out_at: null,
    checked_in_at: { $lte: new Date(Date.now() - 8 * 60 * 60 * 1000) } // At least 8 hours ago
  });
  
  for (const attendance of unCheckedOut) {
    await notificationService.createAndSendNotification({
      userId: attendance.employee_id,
      type: 'checkout',
      title: 'Checkout Reminder',
      message: 'Don\'t forget to check out!',
      relatedId: attendance.id,
      actionUrl: '/attendance'
    });
  }
});

// Task due reminders (1 hour before)
cron.schedule('*/5 * * * *', async () => { // Every 5 minutes
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  const upcomingTasks = await db.tasks.find({
    due_date: { 
      $gte: now,
      $lte: oneHourLater
    },
    notified: false
  });
  
  for (const task of upcomingTasks) {
    await notificationService.createAndSendNotification({
      userId: task.assigned_to,
      type: 'task',
      title: 'Task Due Soon',
      message: `"${task.title}" is due at ${task.due_time}`,
      relatedId: task.id,
      actionUrl: `/tasks/${task.id}`
    });
    
    // Mark as notified
    await db.tasks.update(task.id, { notified: true });
  }
});

export { cronJobs };
```

**Initialize in server.ts**:
```typescript
// backend/src/server.ts
import { cronJobs } from './jobs/cronJobs';

// Start cron jobs when server starts
cronJobs;
console.log('Cron jobs initialized');
```

---

## 2. Frontend Component Integration

### Step 2.1: Add Chat Badge to Layout

**File**: `frontend/src/layouts/MainLayout.tsx`

```typescript
import { ChatBadge } from '@/components/ChatBadge';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen">
      {/* Sidebar/Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <Logo />
        <div className="flex gap-4">
          <ChatBadge /> {/* Add here */}
          <BellIcon /> {/* Add notification bell */}
          <UserMenu />
        </div>
      </header>
      
      {/* Main content */}
      <main>{children}</main>
    </div>
  );
};
```

### Step 2.2: Add Bell Icon Component

**File**: `frontend/src/components/BellIcon.tsx`

```typescript
// Create this component as shown in CHAT_NOTIFICATIONS_IMPLEMENTATION.md
```

### Step 2.3: Create Notification Dropdown

**File**: `frontend/src/components/NotificationDropdown.tsx`

```typescript
// Create this component as shown in CHAT_NOTIFICATIONS_IMPLEMENTATION.md
```

### Step 2.4: Add to Chat Modal

**File**: `frontend/src/components/ChatModal.tsx` (if exists) or create new

```typescript
// Add typing indicator component
// Add read receipt display in messages
// Add unread counter reset on open
```

### Step 2.5: Create Service Worker

**File**: `frontend/public/service-worker.js`

```typescript
// Copy from CHAT_NOTIFICATIONS_IMPLEMENTATION.md
// This handles push notifications in background
```

**Register in App.tsx**:
```typescript
// frontend/src/App.tsx

useEffect(() => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.error('Service Worker registration failed', err));
  }
  
  // Request push notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);
```

### Step 2.6: Add Push Token Registration Hook

**File**: `frontend/src/hooks/usePushNotifications.ts`

```typescript
export const usePushNotifications = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      registerPushNotifications();
    }
  }, []);
  
  const registerPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
      });
      
      // Send to backend
      await api.post('/notifications/subscribe', {
        token: subscription.toJSON().endpoint
      });
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }
};

// Use in App.tsx
usePushNotifications();
```

### Step 2.7: Add Animated Highlight Hook

**File**: `frontend/src/hooks/useAnimatedHighlight.ts`

```typescript
// Copy from CHAT_NOTIFICATIONS_IMPLEMENTATION.md
// Add to Tailwind config for animation
```

**Add to Tailwind config**:
```typescript
// frontend/tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      keyframes: {
        highlight: {
          '0%': { backgroundColor: 'rgba(255, 255, 0, 0)', transform: 'scale(1)' },
          '50%': { backgroundColor: 'rgba(255, 255, 0, 0.3)' },
          '100%': { backgroundColor: 'rgba(255, 255, 0, 0)', transform: 'scale(1)' }
        }
      },
      animation: {
        highlight: 'highlight 2s ease-in-out'
      }
    }
  }
};
```

---

## 3. Database Migration

### Step 3.1: Create Migration File

**File**: `database/migrations/002_chat_notifications.sql`

```sql
-- Add read_at to chat_messages
ALTER TABLE chat_messages ADD COLUMN read_at TIMESTAMPTZ NULL;

-- Create chat_unread_count table
CREATE TABLE chat_unread_count (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  unread_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, chat_id)
);

CREATE INDEX idx_chat_unread_user_id ON chat_unread_count(user_id);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  action_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Add push_token to users
ALTER TABLE users ADD COLUMN push_token VARCHAR(500);
```

### Step 3.2: Run Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase dashboard
# Copy the SQL above into the SQL editor and run
```

---

## 4. Environment Configuration

### Backend (.env.production)

```env
# Firebase Cloud Messaging
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
FIREBASE_PROJECT_ID=your-project-id

# Redis (for typing indicators)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Frontend (.env.production)

```env
# Firebase Cloud Messaging
REACT_APP_VAPID_PUBLIC_KEY=your-vapid-public-key

# API
REACT_APP_API_URL=https://your-backend.vercel.app/api
```

---

## 5. Deployment Checklist

### Backend Deployment (Vercel)

- [ ] Add environment variables (Firebase, Redis, Supabase)
- [ ] Ensure Node.js version supports all dependencies
- [ ] Test endpoints locally before deploying
- [ ] Verify Supabase Realtime is enabled
- [ ] Test push notifications work from production

### Frontend Deployment (Vercel)

- [ ] Add REACT_APP_VAPID_PUBLIC_KEY environment variable
- [ ] Verify service worker is included in build
- [ ] Test push notifications on production URL
- [ ] Verify HTTPS is enabled (required for push)
- [ ] Test notification click handlers work

### Database Deployment

- [ ] Run migrations in production
- [ ] Verify new tables/columns exist
- [ ] Create indexes for performance
- [ ] Backup database before changes

---

## 6. Testing

### Local Testing

1. **Chat Features**:
   ```bash
   # Start backend
   cd backend && npm run dev
   
   # Start frontend
   cd frontend && npm run dev
   
   # Open two browser windows and test:
   # - Send message
   # - Unread counter updates
   # - Mark read
   # - Typing indicator
   ```

2. **Notifications**:
   ```bash
   # Test push notifications
   # Open DevTools → Application → Service Workers
   # Check that service worker is registered
   # Test notification click handlers
   ```

### Production Testing

1. Connect to production backend
2. Send test notifications
3. Verify push notifications arrive
4. Test click handlers navigate correctly
5. Verify highlight animation works

---

## 7. Monitoring & Logging

### Add Logging to Services

```typescript
// In ChatService
logger.info(`Message sent: ${messageId}`, {
  chatId,
  senderId,
  participantCount: othersUserIds.length
});

logger.info(`Unread count incremented for user`, {
  userId,
  chatId,
  newCount
});

// In NotificationService
logger.info(`Notification created`, {
  notificationId: notification.id,
  userId: notification.user_id,
  type: notification.type
});

logger.error(`Push notification failed`, {
  userId,
  error: error.message,
  pushToken: '***masked***'
});
```

### Monitor Performance

- **Chat**: Track message delivery time, read receipt latency
- **Notifications**: Track push delivery success rate, click-through rate
- **Redis**: Monitor typing indicator cache hits/misses
- **Database**: Monitor query performance on new tables

---

## 8. Common Issues & Solutions

### Issue: Typing indicators not showing
- Check Redis connection
- Verify Supabase Realtime is enabled
- Check browser console for errors
- Ensure typing endpoint is being called

### Issue: Push notifications not arriving
- Verify Firebase credentials are correct
- Check push token is being saved to database
- Verify HTTPS is enabled (required for push)
- Check Service Worker is registered
- Verify notification permission was granted

### Issue: Unread count not updating
- Check Supabase Realtime subscription is active
- Verify increment/decrement logic
- Check database values directly
- Monitor real-time broadcasts

### Issue: Highlight animation not working
- Verify Tailwind configuration includes animation
- Check CSS class name is correct
- Verify element has data-id attribute
- Check sessionStorage is being set

---

## 9. Next Steps

1. **Phase 1**: Set up database migrations
2. **Phase 2**: Implement ChatService and NotificationService
3. **Phase 3**: Create API endpoints
4. **Phase 4**: Build React components
5. **Phase 5**: Test end-to-end
6. **Phase 6**: Deploy to production

---

## 📚 Additional Resources

- **CHAT_NOTIFICATIONS_IMPLEMENTATION.md**: Detailed code examples
- **CHAT_NOTIFICATIONS_SUMMARY.md**: Quick reference guide
- **TODO.md**: Updated roadmap with all features
- **Firebase Docs**: https://firebase.google.com/docs/cloud-messaging
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
