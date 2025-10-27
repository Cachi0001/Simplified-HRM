# Phase 3: Complete API Reference Guide

All endpoints require JWT authentication token in header: `Authorization: Bearer {token}`

---

## 📬 Chat API

### Send Message
```
POST /api/chat/send
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "chatId": "string",
  "message": "string"
}

Response: 201 Created
{
  "status": "success",
  "message": "Message sent successfully",
  "data": {
    "message": {
      "id": "string",
      "chat_id": "string",
      "sender_id": "string",
      "message": "string",
      "created_at": "ISO-8601",
      "read_at": null
    }
  }
}
```

### Mark Message as Read
```
PATCH /api/chat/message/{messageId}/read
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "message": "Message marked as read"
}
```

### Mark Chat as Read
```
PATCH /api/chat/{chatId}/read
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "message": "Chat marked as read"
}
```

### Get Chat History
```
GET /api/chat/{chatId}/history?limit=50&offset=0
Authorization: Bearer {token}

Query Parameters:
- limit: number (default: 50, optional)
- offset: number (default: 0, optional)

Response: 200 OK
{
  "status": "success",
  "data": {
    "messages": [
      {
        "id": "string",
        "chat_id": "string",
        "sender_id": "string",
        "message": "string",
        "created_at": "ISO-8601",
        "read_at": "ISO-8601 or null"
      }
    ],
    "count": 50,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Total Unread Count
```
GET /api/chat/unread-count/total
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "totalUnreadCount": 5
  }
}
```

### Get All Unread Counts by Chat
```
GET /api/chat/unread-counts
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "unreadCounts": [
      {
        "chat_id": "string",
        "unread_count": 3
      },
      {
        "chat_id": "string",
        "unread_count": 2
      }
    ]
  }
}
```

### Get Unread Count for Specific Chat
```
GET /api/chat/{chatId}/unread-count
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "unreadCount": 5
  }
}
```

### Get Message Read Receipt
```
GET /api/chat/message/{messageId}/read-receipt
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "readReceipt": {
      "message_id": "string",
      "read_by_users": [
        {
          "user_id": "string",
          "read_at": "ISO-8601"
        }
      ]
    }
  }
}
```

### Get Chat Participants
```
GET /api/chat/{chatId}/participants
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "participants": [
      {
        "id": "string",
        "name": "string",
        "email": "string",
        "avatar": "string or null"
      }
    ],
    "count": 3
  }
}
```

---

## 🔔 Notification API

### Get All Notifications
```
GET /api/notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer {token}

Query Parameters:
- page: number (default: 1, optional)
- limit: number (default: 20, optional)
- unreadOnly: boolean (default: false, optional)

Response: 200 OK
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "string",
        "user_id": "string",
        "type": "chat | task | leave | purchase | birthday | checkout | announcement",
        "title": "string",
        "message": "string",
        "data": "JSON object",
        "read_at": "ISO-8601 or null",
        "created_at": "ISO-8601",
        "expires_at": "ISO-8601"
      }
    ],
    "count": 20,
    "page": 1,
    "limit": 20
  }
}
```

### Get Unread Notifications Only
```
GET /api/notifications/unread
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "string",
        "user_id": "string",
        "type": "chat | task | leave | purchase | birthday | checkout | announcement",
        "title": "string",
        "message": "string",
        "data": "JSON object",
        "read_at": null,
        "created_at": "ISO-8601",
        "expires_at": "ISO-8601"
      }
    ],
    "count": 3
  }
}
```

### Get Unread Notification Count
```
GET /api/notifications/unread-count
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "unreadCount": 5
  }
}
```

### Mark Notification as Read
```
PATCH /api/notifications/{notificationId}/read
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "message": "Notification marked as read"
}
```

### Mark All Notifications as Read
```
PATCH /api/notifications/mark-all-read
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "message": "All notifications marked as read"
}
```

### Delete Notification
```
DELETE /api/notifications/{notificationId}
Authorization: Bearer {token}

Response: 204 No Content
```

### Save Push Token (FCM)
```
POST /api/notifications/push-token
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "pushToken": "firebase_cloud_messaging_token_string"
}

Response: 200 OK
{
  "status": "success",
  "message": "Push token saved successfully"
}
```

### Get Users with Push Tokens
```
GET /api/notifications/push-tokens/{notificationType}
Authorization: Bearer {token}

Path Parameters:
- notificationType: chat | task | leave | purchase | birthday | checkout | announcement

Response: 200 OK
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "string",
        "email": "string",
        "push_token": "string"
      }
    ],
    "count": 5
  }
}
```

---

## ✍️ Typing Indicator API

### Start Typing
```
POST /api/typing/start
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "chatId": "string"
}

Response: 200 OK
{
  "status": "success",
  "message": "Typing indicator started"
}
```

### Stop Typing
```
POST /api/typing/stop
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "chatId": "string"
}

Response: 200 OK
{
  "status": "success",
  "message": "Typing indicator stopped"
}
```

### Get Users Typing in Chat
```
GET /api/typing/{chatId}
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "typingUsers": ["user-id-1", "user-id-2"],
    "count": 2
  }
}
```

### Check if User is Typing
```
GET /api/typing/{chatId}/{userId}
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "success",
  "data": {
    "isTyping": true
  }
}
```

---

## 🔑 Authentication Header Format

All requests require this header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note**: Replace with actual JWT token from login response

---

## ❌ Common Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "chatId, message, and userId are required"
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Access token is required"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Chat not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "An unexpected error occurred"
}
```

---

## 📊 HTTP Status Codes Used

| Code | Meaning | Used For |
|------|---------|----------|
| 200 | OK | Successful GET, PATCH operations |
| 201 | Created | Successful POST operations |
| 204 | No Content | Successful DELETE operations |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Unexpected errors |

---

## 💡 Frontend Integration Tips

### 1. Always Include Token
```typescript
const response = await fetch('/api/chat/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

### 2. Handle Pagination
```typescript
// Get next page of notifications
const page = 2;
const limit = 20;
const response = await fetch(
  `/api/notifications?page=${page}&limit=${limit}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

### 3. Implement Unread Badge
```typescript
// Show unread count
const unreadCount = await fetch('/api/notifications/unread-count', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await unreadCount.json();
console.log(`${data.data.unreadCount} unread notifications`);
```

### 4. Real-time Typing Status
```typescript
// Notify user is typing
await fetch('/api/typing/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ chatId: activeChatId })
});

// Poll for typing users every 500ms
setInterval(async () => {
  const response = await fetch(`/api/typing/${activeChatId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  updateTypingIndicator(data.typingUsers);
}, 500);
```

### 5. Mark Messages as Read
```typescript
// Mark entire chat as read
await fetch(`/api/chat/${chatId}/read`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🔄 Response Structure

All successful responses follow this pattern:
```json
{
  "status": "success",
  "message": "Optional message",
  "data": {
    // Specific endpoint data here
  }
}
```

All error responses follow this pattern:
```json
{
  "status": "error",
  "message": "Error description"
}
```

---

## 🚀 Ready for Production

✅ All endpoints validated
✅ Error handling implemented
✅ Type safety ensured
✅ Logging enabled
✅ Authentication required
✅ CORS configured

Start integrating with your frontend! 🎉