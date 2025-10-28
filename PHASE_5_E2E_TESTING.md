# Phase 5: End-to-End Testing & Bug Fixes

**Status**: Complete E2E Testing Framework
**Scope**: Chat, Notifications, Typing Indicators, Read Receipts, Push Notifications
**Estimated Time**: 3-4 hours comprehensive testing

---

## 📊 Test Coverage Matrix

### Real-Time Chat Features

| Feature | Test Case | Expected | Status |
|---------|-----------|----------|--------|
| **Message Sending** | Send message in chat | Message appears with "sending" status | ⬜ |
| **Message Delivery** | Check after 500ms | Status changes to "sent" | ⬜ |
| **Message Reading** | Click message in chat | Status changes to "read" | ⬜ |
| **Typing Indicator** | Type in message input | "User is typing..." appears for others | ⬜ |
| **Typing Expiry** | Stop typing for 2s | Indicator disappears | ⬜ |
| **Multi-User Typing** | 2+ users typing | Shows "Alice and Bob are typing..." | ⬜ |
| **Chat Badge** | Open chat, view | Badge shows unread count | ⬜ |
| **Badge Decrement** | Mark messages read | Badge count decreases | ⬜ |
| **Read Receipt** | Check own message | Shows single/double ✓ icon | ⬜ |

### Push Notifications

| Feature | Test Case | Expected | Status |
|---------|-----------|----------|--------|
| **Permission Request** | App loads | Browser asks for notification permission | ⬜ |
| **Permission Granted** | User clicks "Allow" | Push subscription created | ⬜ |
| **Push Received** | Send from backend | Notification appears in system tray | ⬜ |
| **Push in Background** | Tab inactive | Notification still appears | ⬜ |
| **Push Click** | Click notification | Opens app and navigates to correct page | ⬜ |
| **Notification Badge** | Receive notification | Bell icon shows unread count | ⬜ |
| **Mark as Read** | Click notification | Status changes to read, badge decrements | ⬜ |
| **Clear All** | Click "Clear All" | All marked as read | ⬜ |

### Error Handling

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| **Offline** | Messages queue locally, send when online | ⬜ |
| **Connection Lost** | Show error banner, offer retry | ⬜ |
| **Service Worker Fails** | App still works, fallback to polling | ⬜ |
| **Permission Denied** | Show graceful message, no error spam | ⬜ |
| **Invalid VAPID Key** | Fail gracefully, log error | ⬜ |

---

## 🧪 Manual Testing Procedures

### Test 1: Single-User Chat Flow

**Setup**: Open 1 browser window with app logged in

**Steps**:
1. Navigate to Chat page
2. Select or create a chat
3. Type message: "Hello world"
4. Click Send
5. Wait 500ms

**Expected Results**:
- ✅ Message appears immediately with "sending" status (gray/italic)
- ✅ Status changes to "sent" (normal style)
- ✅ Message stays in correct position
- ✅ Input field clears

**Code to Test**:
```typescript
// In ChatPage.tsx
const msg = await sendMessage(chatId, {
  message: 'Hello world',
  senderId: getUserId(),
});
console.log('[Test] Message status:', msg.status); // Should be 'sending' then 'sent'
```

---

### Test 2: Multi-User Chat Flow

**Setup**: Open 2 browser windows (Chrome + Firefox, or 2 private windows)

**Prerequisites**: Both logged in as different users in same chat

**Steps**:
1. User A: Type message "Hi from A"
2. User A: Click Send
3. User B: Observe chat window
4. User B: Verify message appears
5. User B: Check if "read" status appears on User A's message

**Expected Results**:
- ✅ Message appears on User B within 1-2 seconds
- ✅ User B sees message from User A
- ✅ Read receipt shows ✓ on User A's message when User B views it
- ✅ No duplicates or message loss

**WebSocket Check**:
```javascript
// In browser console
// Should see: "Subscription to chat:chatId established"
// Check Network tab > WS > filter for "wss://supabase"
// Should show active WebSocket connection
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('[Test] Service Workers:', regs);
});
```

---

### Test 3: Typing Indicator

**Setup**: 2 browser windows

**Steps**:
1. User A: Focus on message input
2. User A: Type first character "H"
3. User B: Watch User A's chat window
4. User A: Continue typing "Hello..."
5. User A: Stop typing
6. User A & B: Wait 3 seconds

**Expected Results**:
- ✅ As User A types, User B sees animated indicator below messages
- ✅ Text shows "User A is typing..." with animated dots
- ✅ After User A stops, indicator disappears within 3 seconds
- ✅ No leftover "typing" status after sending

**Debug Check**:
```typescript
// In ChatPage.tsx
const { typingUsers, getTypingText } = useRealtimeTyping();
console.log('[Test] Typing users:', typingUsers);
console.log('[Test] Typing text:', getTypingText(typingUsers, Object.keys(typingUsers).length));
// Should show active users and formatted text
```

---

### Test 4: Read Receipts

**Setup**: 2 browser windows

**Steps**:
1. User A: Send message "Can you see this?"
2. User B: Observe User A's message in User B's chat
3. User B: Click on the message
4. User A: Observe the message in their own view
5. Hover over the ✓ symbol

**Expected Results**:
- ✅ Initially shows single ✓ (sent)
- ✅ When User B views message, changes to ✓✓ (delivered)
- ✅ When User B marks read, changes to filled ✓✓ (read)
- ✅ Hover shows "Read by User B at 2:45 PM"
- ✅ Timestamp is accurate

**Code Check**:
```typescript
// In ReadReceipt component
const statuses = {
  'sending': '...',
  'sent': '✓',
  'delivered': '✓✓',
  'read': '✓✓ (filled)',
};
console.log('[Test] Message status:', msg.status);
console.log('[Test] Read by:', msg.readBy); // Should have reader info
```

---

### Test 5: Push Notifications (Desktop)

**Setup**: One browser window, one backend API test tool

**Prerequisites**:
- User granted notification permission
- User is logged in
- Frontend .env has VITE_VAPID_PUBLIC_KEY
- Backend has push token endpoint

**Steps**:
1. User: Minimize or switch away from browser tab
2. Backend: Send test push notification API call:
```bash
POST /api/notifications/send
{
  "userId": "user123",
  "type": "chat",
  "title": "New Message",
  "message": "Test notification from backend",
  "actionUrl": "/chat/123",
  "vapidSubject": "mailto:admin@go3nethrm.com"
}
```
3. User: Wait 2 seconds
4. User: Check system notification tray

**Expected Results**:
- ✅ Browser sends Service Worker registration to backend
- ✅ System notification appears in tray (OS level)
- ✅ Notification shows icon and message
- ✅ Can interact with notification even if tab is inactive

**Browser DevTools Check**:
```javascript
// Application tab > Service Workers
// Should show: "Service Worker registered"

// Console
navigator.serviceWorker.ready.then(reg => {
  console.log('[Test] SW ready:', reg);
  return reg.pushManager.getSubscription();
}).then(sub => {
  console.log('[Test] Push subscription:', sub?.endpoint);
  // Log should show valid endpoint
});
```

---

### Test 6: Notification Bell & Badge

**Setup**: One browser window

**Steps**:
1. Backend: Send notification to user
2. User: Check header notification bell
3. User: Click bell icon
4. User: Observe dropdown
5. User: Click on a notification

**Expected Results**:
- ✅ Bell icon shows red badge with count
- ✅ Badge appears immediately when notification received
- ✅ Clicking bell opens dropdown with all notifications
- ✅ Notifications sorted newest first
- ✅ Clicking notification marks as read
- ✅ Badge count decreases after clicking
- ✅ Unread notifications have blue dot indicator

**State Inspection**:
```typescript
// In NotificationBell.tsx
const { notifications, unreadCount } = useRealtimeNotifications();
console.log('[Test] All notifications:', notifications);
console.log('[Test] Unread count:', unreadCount);
// Count should match visible unread notifications
```

---

### Test 7: Chat Badge & Unread Counter

**Setup**: 2 browser windows

**Steps**:
1. User B: Send message to User A while User A is not viewing chat
2. User A: Check chat list or bottom navbar
3. User A: Observe badge on chat icon
4. User A: Open chat
5. User A: Wait for messages to auto-mark as read

**Expected Results**:
- ✅ Badge appears on chat icon showing unread count
- ✅ Badge updates immediately when message received
- ✅ Badge disappears when unread count = 0
- ✅ Badge shows correct number (not duplicates)
- ✅ Opening chat auto-marks messages as read

**Unread Count Debug**:
```typescript
// In ChatPage.tsx
const { unreadCount } = useChatUnreadCount(chatId);
console.log('[Test] Current unread:', unreadCount);
// Should decrease as messages are marked read

// After marking message as read
console.log('[Test] After read:', unreadCount); // Should be 0 or decremented
```

---

### Test 8: Offline Handling

**Setup**: One browser window with DevTools open

**Steps**:
1. User: Type message in chat
2. DevTools: Go to Network tab > Throttling
3. DevTools: Select "Offline"
4. User: Send message
5. User: Wait 5 seconds
6. DevTools: Return to Online
7. DevTools: Wait for reconnect

**Expected Results**:
- ✅ Message shows "pending" or "sending" status while offline
- ✅ Error banner appears: "Connection lost - attempting to reconnect"
- ✅ When back online, message sends automatically
- ✅ Status updates to "sent" when online
- ✅ No error spam in console

**Network Simulation**:
```javascript
// DevTools Console
// Simulate offline
navigator.onLine = false; // Note: doesn't actually work in all browsers

// Check connection status
console.log('[Test] Browser online:', navigator.onLine);

// Check Service Worker message queue
navigator.serviceWorker.controller.postMessage({
  type: 'GET_QUEUE',
});
```

---

### Test 9: Error Recovery

**Setup**: One browser window

**Steps**:
1. Browser: Start with normal connection
2. Backend: Stop API server (or simulate error with DevTools)
3. User: Try to send message
4. Wait 5 seconds
5. Backend: Restart API server
6. User: Try again

**Expected Results**:
- ✅ First attempt fails with clear error message
- ✅ Error doesn't crash app or show console errors
- ✅ Retry button available
- ✅ Second attempt succeeds after recovery
- ✅ No duplicate messages

**Error Testing**:
```typescript
// Mock API error in development
const mockErrorResponse = {
  status: 500,
  error: 'Internal Server Error',
};

// Try to catch error handling
try {
  await sendMessage(chatId, { message: 'test' });
} catch (error) {
  console.log('[Test] Error caught:', error);
  // Should show user-friendly message
}
```

---

### Test 10: Performance & Load

**Setup**: 1 browser window

**Steps**:
1. User: Open chat with 100+ messages
2. DevTools: Open Performance tab
3. User: Scroll to load more messages
4. User: Type message (should see indicator)
5. DevTools: Check Performance recording

**Expected Results**:
- ✅ Initial load < 2 seconds
- ✅ Typing indicator appears within 100ms
- ✅ Scroll smooth (60 FPS)
- ✅ No memory leaks (use heap snapshot)
- ✅ Component re-renders optimized

**Performance Check**:
```javascript
// In Console
performance.mark('chat-load-start');
// ... load chat ...
performance.mark('chat-load-end');
performance.measure('chat-load', 'chat-load-start', 'chat-load-end');
console.log(performance.getEntriesByName('chat-load')[0].duration); // Should be < 2000ms

// Check for memory leaks
console.memory; // In Chrome DevTools
// Heap size should be stable after interactions
```

---

## 🔍 Automated Testing Setup

### Jest Unit Tests (If Implementing)

```typescript
// frontend/src/hooks/__tests__/useRealtimeChat.test.ts

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeChat } from '../useRealtimeChat';

describe('useRealtimeChat', () => {
  it('should load chat history', async () => {
    const { result } = renderHook(() => useRealtimeChat());

    act(() => {
      result.current.loadChatHistory('chat123');
    });

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });
  });

  it('should send message with sending status', async () => {
    const { result } = renderHook(() => useRealtimeChat());

    const response = await act(async () => {
      return result.current.sendMessage('chat123', {
        message: 'Hello',
        senderId: 'user1',
      });
    });

    expect(response.status).toBe('sending');
  });

  it('should handle typing indicator', async () => {
    const { result } = renderHook(() => useRealtimeTyping());

    act(() => {
      result.current.startTyping('chat123', 'user1');
    });

    await waitFor(() => {
      expect(Object.keys(result.current.typingUsers).length).toBeGreaterThan(0);
    });
  });
});
```

---

## 📋 Bug Fix Checklist

### Common Bugs Found & Fixes

```
FOUND: Typing indicator doesn't expire
FIX: Ensure TTL cleanup in useRealtimeTyping
CODE: Add useEffect cleanup for expiry timers

FOUND: Duplicate messages on fast send
FIX: Deduplicate by messageId in hook
CODE: const uniqueMessages = Array.from(new Map(messages.map(m => [m.id, m])).values())

FOUND: Badge shows wrong count
FIX: Recalculate unread from real-time events
CODE: Update state only from Realtime subscription, not optimistic updates

FOUND: Push notification fails silently
FIX: Add error logging and fallback
CODE: Wrap in try-catch with console.error

FOUND: Service Worker doesn't register
FIX: Check sw.ts path in vite.config.ts
CODE: publicDir: 'public', ensure sw.ts is copied

FOUND: Memory leak on unmount
FIX: Cleanup subscriptions in useEffect return
CODE: return () => { unsubscribeFromChat(); }
```

---

## ✅ Sign-Off Checklist

Before marking Phase 5 complete:

```
FUNCTIONALITY:
- [ ] All 10 test scenarios pass
- [ ] No console errors during normal usage
- [ ] No console warnings (except expected third-party)
- [ ] All error cases handled gracefully

PERFORMANCE:
- [ ] Initial chat load < 2 seconds
- [ ] Typing indicator appears < 100ms
- [ ] No noticeable frame drops (60 FPS)
- [ ] Memory heap stable over 10 minutes

BROWSER COMPATIBILITY:
- [ ] Chrome/Edge (v88+)
- [ ] Firefox (v87+)
- [ ] Safari (v15+)
- [ ] Mobile Chrome/Safari

CROSS-USER:
- [ ] Multi-user chat works
- [ ] Real-time updates sync across all users
- [ ] No race conditions
- [ ] Messages appear in correct order

NOTIFICATIONS:
- [ ] Push works on desktop
- [ ] Push works on mobile
- [ ] Clicks navigate correctly
- [ ] Badges update correctly

OFFLINE & ERROR:
- [ ] Offline handling works
- [ ] Recovery on reconnect works
- [ ] Error messages are clear
- [ ] App never crashes

SECURITY:
- [ ] RLS policies prevent unauthorized access
- [ ] JWT tokens managed correctly
- [ ] CORS only allows valid origins
- [ ] No sensitive data in logs
```

---

## 🚀 Phase 5 Completion Criteria

| Criterion | Status |
|-----------|--------|
| All 10 test scenarios complete | ⬜ |
| Performance benchmarks met | ⬜ |
| Bug fixes verified | ⬜ |
| Cross-browser testing done | ⬜ |
| Documentation updated | ⬜ |
| Ready for production | ⬜ |

---

## 📞 When to Escalate Issues

**Escalate if**:
- Message doesn't sync within 5 seconds
- Typing indicator doesn't clear after 5 seconds
- Push notification fails to send after 3 retries
- Service Worker won't register
- App crashes (JS error that prevents usage)

**Debug Steps Before Escalating**:
1. Check browser console for errors
2. Check DevTools Network tab for failed requests
3. Check Supabase logs for failed queries
4. Check Service Worker status (Application tab)
5. Test in incognito/private window
6. Restart browser and try again

---

## 🎯 Next Steps After Phase 5

**If all tests pass**:
1. ✅ Phase 6: Production Deployment
   - Environment variable validation
   - Security audit
   - Performance optimization

2. ✅ Phase 7: Monitoring & Analytics
   - Error tracking (Sentry)
   - Performance monitoring (LogRocket)
   - User analytics

3. ✅ Phase 8: Feature Expansion
   - Video/voice calls
   - File sharing
   - Message reactions

---

**Test Results**: [Add test execution date and summary here]
**Tester Name**: ________________
**Sign-Off**: ________________