# Phase 4d: Backend Setup for Push Notifications

**Status**: Backend implementation for Web Push API
**Components**: VAPID keys, endpoints, service
**Estimated Time**: 1-2 hours implementation

---

## 🔑 Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are used to identify your server to push services and to encrypt push messages.

### Option A: Using npm CLI (Recommended)

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Output:
# Public Key: BPxxxxxxxxxxxxxxxxx...
# Private Key: YYYyyyyyyyyyyyyyyy...
```

### Option B: Using Node.js Script

Create `backend/scripts/generate-vapid.js`:

```javascript
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);

// Save to .env:
console.log('\nAdd to .env:');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
```

Run:
```bash
node backend/scripts/generate-vapid.js
```

### Store Keys

**In `backend/.env`** (KEEP PRIVATE):
```env
VAPID_PRIVATE_KEY=YYYyyyyyyyyyyyyyyy...
VAPID_PUBLIC_SUBJECT=mailto:admin@go3nethrm.com
```

**In `frontend/.env`** (CAN BE PUBLIC):
```env
VITE_VAPID_PUBLIC_KEY=BPxxxxxxxxxxxxxxxxx...
VITE_API_URL=http://localhost:3000/api
```

---

## 📦 Step 2: Install Dependencies

```bash
cd backend

# Web Push library (if not already installed)
npm install web-push
npm install --save-dev @types/web-push

# For JWT handling
npm install jsonwebtoken dotenv
```

Update `backend/package.json`:
```json
{
  "dependencies": {
    "web-push": "^3.6.7",
    "express": "^4.x.x",
    "mongoose": "^7.x.x"
  },
  "devDependencies": {
    "@types/web-push": "^3.6.3"
  }
}
```

---

## 🗄️ Step 3: Database Schema Updates

### Add Push Token to Employees Table

If using Supabase SQL:

```sql
-- Add push token field to employees table
ALTER TABLE employees ADD COLUMN push_token jsonb;
ALTER TABLE employees ADD COLUMN push_token_created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE employees ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT true;

-- Create index for push notifications query
CREATE INDEX idx_employees_push_token ON employees(id) 
WHERE push_token IS NOT NULL AND push_notifications_enabled = true;

-- Logs table for debugging push failures
CREATE TABLE push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  notification_id UUID,
  status VARCHAR(20), -- 'pending', 'sent', 'failed'
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE(notification_id, employee_id)
);

CREATE INDEX idx_push_logs_status ON push_notification_logs(status);
CREATE INDEX idx_push_logs_created ON push_notification_logs(created_at DESC);
```

### Add to Notifications Table

Already created in Phase 4c, but verify:

```sql
-- Verify notifications table has all required fields
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'notifications';

-- Should have: id, user_id, type, title, message, is_read, created_at, expires_at
-- If missing any, add them:

ALTER TABLE notifications ADD COLUMN push_sent_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN push_failed BOOLEAN DEFAULT false;
```

---

## 🛠️ Step 4: Create Push Notification Service

Create `backend/src/services/PushNotificationService.ts`:

```typescript
import webpush from 'web-push';
import { Logger } from 'winston';
import { IEmployee } from '../models/IEmployee';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';

interface PushPayload {
  type: 'chat' | 'task' | 'leave' | 'purchase' | 'birthday' | 'checkout';
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  actionUrl?: string;
  notificationId?: string;
  chatId?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  constructor(
    private logger: Logger,
    private notificationRepo: NotificationRepository,
    private employeeRepo: EmployeeRepository
  ) {
    // Configure web-push
    webpush.setVapidDetails(
      process.env.VAPID_PUBLIC_SUBJECT || 'mailto:admin@go3nethrm.com',
      process.env.VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || ''
    );
  }

  // ========================================================================
  // 1. SAVE PUSH TOKEN
  // ========================================================================

  /**
   * Save push subscription from client
   */
  async savePushToken(
    employeeId: string,
    pushToken: PushSubscription
  ): Promise<void> {
    try {
      await this.employeeRepo.updatePushToken(employeeId, pushToken);
      this.logger.info('[Push] Token saved for employee:', {
        employeeId,
        endpoint: pushToken.endpoint.substring(0, 50) + '...',
      });
    } catch (error) {
      this.logger.error('[Push] Failed to save token:', error);
      throw error;
    }
  }

  // ========================================================================
  // 2. REMOVE PUSH TOKEN
  // ========================================================================

  /**
   * Remove push subscription when user unsubscribes
   */
  async removePushToken(employeeId: string): Promise<void> {
    try {
      await this.employeeRepo.clearPushToken(employeeId);
      this.logger.info('[Push] Token removed for employee:', { employeeId });
    } catch (error) {
      this.logger.error('[Push] Failed to remove token:', error);
      throw error;
    }
  }

  // ========================================================================
  // 3. SEND PUSH TO SINGLE USER
  // ========================================================================

  /**
   * Send push notification to specific employee
   */
  async sendPushToUser(
    employeeId: string,
    payload: PushPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get employee with push token
      const employee = await this.employeeRepo.findById(employeeId);

      if (!employee?.push_token) {
        this.logger.warn('[Push] No push token for employee:', { employeeId });
        return { success: false, error: 'No push subscription' };
      }

      if (!employee.push_notifications_enabled) {
        this.logger.info('[Push] Push notifications disabled for employee:', {
          employeeId,
        });
        return { success: false, error: 'Push notifications disabled' };
      }

      // Send push notification
      const result = await this.sendPush(
        employee.push_token as PushSubscription,
        payload,
        employeeId
      );

      return result;
    } catch (error) {
      this.logger.error('[Push] Failed to send push:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ========================================================================
  // 4. SEND PUSH TO MULTIPLE USERS
  // ========================================================================

  /**
   * Send push notification to multiple users (e.g., all chat participants)
   */
  async sendPushToUsers(
    employeeIds: string[],
    payload: PushPayload
  ): Promise<{
    sent: number;
    failed: number;
    errors: Record<string, string>;
  }> {
    const results = {
      sent: 0,
      failed: 0,
      errors: {} as Record<string, string>,
    };

    for (const employeeId of employeeIds) {
      try {
        const result = await this.sendPushToUser(employeeId, payload);

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          if (result.error) {
            results.errors[employeeId] = result.error;
          }
        }
      } catch (error) {
        results.failed++;
        results.errors[employeeId] =
          error instanceof Error ? error.message : 'Unknown error';
      }
    }

    this.logger.info('[Push] Batch send complete:', results);
    return results;
  }

  // ========================================================================
  // 5. INTERNAL: SEND ACTUAL PUSH
  // ========================================================================

  private async sendPush(
    subscription: PushSubscription,
    payload: PushPayload,
    employeeId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pushPayload = JSON.stringify({
        type: payload.type,
        title: payload.title,
        message: payload.message,
        icon: payload.icon || '/logo.png',
        badge: payload.badge || '/logo.png',
        action_url: payload.actionUrl,
        notificationId: payload.notificationId,
        chatId: payload.chatId,
        timestamp: new Date().toISOString(),
      });

      // Send notification
      await webpush.sendNotification(subscription, pushPayload);

      this.logger.info('[Push] Notification sent:', {
        employeeId,
        title: payload.title,
      });

      return { success: true };
    } catch (error: any) {
      this.logger.error('[Push] Web push failed:', {
        employeeId,
        error: error.message,
        statusCode: error.statusCode,
      });

      // Handle specific errors
      if (error.statusCode === 410) {
        // Gone - subscription is no longer valid
        this.logger.warn('[Push] Subscription expired, removing:', {
          employeeId,
        });
        await this.removePushToken(employeeId);
        return {
          success: false,
          error: 'Subscription expired and removed',
        };
      }

      if (error.statusCode === 404) {
        // Not Found
        this.logger.warn('[Push] Subscription not found, removing:', {
          employeeId,
        });
        await this.removePushToken(employeeId);
        return { success: false, error: 'Subscription not found' };
      }

      return {
        success: false,
        error: `Push failed (${error.statusCode}): ${error.message}`,
      };
    }
  }

  // ========================================================================
  // 6. NOTIFICATION TRIGGERS
  // ========================================================================

  /**
   * Send notification when new chat message received
   */
  async notifyNewChatMessage(
    chatId: string,
    senderName: string,
    message: string,
    recipientIds: string[]
  ): Promise<void> {
    try {
      const payload: PushPayload = {
        type: 'chat',
        title: `Message from ${senderName}`,
        message: message.substring(0, 100), // Truncate long messages
        actionUrl: `/chat/${chatId}`,
        chatId,
      };

      await this.sendPushToUsers(recipientIds, payload);
    } catch (error) {
      this.logger.error('[Push] Chat notification failed:', error);
    }
  }

  /**
   * Send notification for task assignment
   */
  async notifyTaskAssignment(
    taskId: string,
    taskName: string,
    assigneeId: string
  ): Promise<void> {
    try {
      const payload: PushPayload = {
        type: 'task',
        title: 'Task Assigned',
        message: `You have been assigned: ${taskName}`,
        actionUrl: `/tasks/${taskId}`,
      };

      await this.sendPushToUser(assigneeId, payload);
    } catch (error) {
      this.logger.error('[Push] Task notification failed:', error);
    }
  }

  /**
   * Send notification for leave request status change
   */
  async notifyLeaveStatus(
    requestId: string,
    requesterName: string,
    status: 'approved' | 'rejected',
    recipientId: string
  ): Promise<void> {
    try {
      const payload: PushPayload = {
        type: 'leave',
        title: `Leave Request ${status}`,
        message: `Your leave request has been ${status}`,
        actionUrl: `/leave/${requestId}`,
      };

      await this.sendPushToUser(recipientId, payload);
    } catch (error) {
      this.logger.error('[Push] Leave notification failed:', error);
    }
  }

  /**
   * Send birthday reminder
   */
  async notifyBirthday(
    employeeName: string,
    recipientIds: string[]
  ): Promise<void> {
    try {
      const payload: PushPayload = {
        type: 'birthday',
        title: '🎉 Birthday Reminder',
        message: `Today is ${employeeName}'s birthday!`,
      };

      await this.sendPushToUsers(recipientIds, payload);
    } catch (error) {
      this.logger.error('[Push] Birthday notification failed:', error);
    }
  }

  // ========================================================================
  // 7. HEALTH CHECK
  // ========================================================================

  /**
   * Verify VAPID keys are configured
   */
  verifyVapidConfiguration(): {
    isConfigured: boolean;
    warnings: string[];
  } {
    const warnings = [];

    if (!process.env.VAPID_PUBLIC_KEY) {
      warnings.push('VAPID_PUBLIC_KEY not set');
    }

    if (!process.env.VAPID_PRIVATE_KEY) {
      warnings.push('VAPID_PRIVATE_KEY not set');
    }

    if (!process.env.VAPID_PUBLIC_SUBJECT) {
      warnings.push('VAPID_PUBLIC_SUBJECT not set (using default)');
    }

    return {
      isConfigured: warnings.length === 0,
      warnings,
    };
  }
}

export default PushNotificationService;
```

---

## 🌐 Step 5: Create API Endpoints

Create `backend/src/routes/pushNotificationRoutes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import PushNotificationService from '../services/PushNotificationService';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { Logger } from 'winston';

export function createPushNotificationRoutes(
  logger: Logger,
  pushService: PushNotificationService
) {
  const router = Router();

  // ====================================================================
  // POST /api/employees/push-token - Save push subscription
  // ====================================================================

  router.post(
    '/api/employees/push-token',
    authenticateJWT,
    async (req: Request, res: Response) => {
      try {
        const { pushToken, endpoint } = req.body;
        const employeeId = req.user?.id;

        if (!employeeId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!pushToken || !pushToken.endpoint) {
          return res.status(400).json({ error: 'Invalid push token' });
        }

        await pushService.savePushToken(employeeId, pushToken);

        res.json({
          success: true,
          message: 'Push token saved',
          endpoint: endpoint?.substring(0, 50) + '...',
        });
      } catch (error) {
        logger.error('[Push API] Save token failed:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to save token',
        });
      }
    }
  );

  // ====================================================================
  // DELETE /api/employees/push-token - Remove push subscription
  // ====================================================================

  router.delete(
    '/api/employees/push-token',
    authenticateJWT,
    async (req: Request, res: Response) => {
      try {
        const employeeId = req.user?.id;

        if (!employeeId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        await pushService.removePushToken(employeeId);

        res.json({ success: true, message: 'Push token removed' });
      } catch (error) {
        logger.error('[Push API] Remove token failed:', error);
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'Failed to remove token',
        });
      }
    }
  );

  // ====================================================================
  // POST /api/notifications/send - Admin: Send push notification
  // ====================================================================

  router.post(
    '/api/notifications/send',
    authenticateJWT,
    async (req: Request, res: Response) => {
      try {
        // Check admin permission
        if (req.user?.role !== 'admin') {
          return res.status(403).json({ error: 'Admin only' });
        }

        const { userId, type, title, message, actionUrl } = req.body;

        if (!userId || !type || !title || !message) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await pushService.sendPushToUser(userId, {
          type,
          title,
          message,
          actionUrl,
        });

        if (result.success) {
          res.json({ success: true, message: 'Push sent' });
        } else {
          res.status(400).json({ success: false, error: result.error });
        }
      } catch (error) {
        logger.error('[Push API] Send notification failed:', error);
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'Failed to send notification',
        });
      }
    }
  );

  // ====================================================================
  // GET /api/push-config - Get VAPID public key (public endpoint)
  // ====================================================================

  router.get('/api/push-config', (req: Request, res: Response) => {
    res.json({
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      isConfigured: !!process.env.VAPID_PUBLIC_KEY,
    });
  });

  // ====================================================================
  // GET /api/health/push - Health check
  // ====================================================================

  router.get('/api/health/push', (req: Request, res: Response) => {
    const config = pushService.verifyVapidConfiguration();
    res.json({
      status: config.isConfigured ? 'ok' : 'misconfigured',
      warnings: config.warnings,
    });
  });

  return router;
}
```

---

## 📱 Step 6: Update Employee Repository

Add these methods to `backend/src/repositories/EmployeeRepository.ts`:

```typescript
// Add to EmployeeRepository class

/**
 * Update push token for employee
 */
async updatePushToken(
  employeeId: string,
  pushToken: any
): Promise<void> {
  await db.from('employees')
    .update({
      push_token: pushToken,
      push_token_created_at: new Date().toISOString(),
      push_notifications_enabled: true,
    })
    .eq('id', employeeId);
}

/**
 * Clear push token
 */
async clearPushToken(employeeId: string): Promise<void> {
  await db.from('employees')
    .update({
      push_token: null,
      push_notifications_enabled: false,
    })
    .eq('id', employeeId);
}

/**
 * Get all employees with push tokens
 */
async getEmployeesWithPushTokens(): Promise<any[]> {
  const { data } = await db.from('employees')
    .select('id, push_token, email')
    .not('push_token', 'is', null)
    .eq('push_notifications_enabled', true);
  return data || [];
}

/**
 * Find employee by ID (with push token)
 */
async findById(id: string): Promise<any> {
  const { data } = await db.from('employees')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}
```

---

## 🧪 Step 7: Testing Endpoints

### Test Push Subscription

```bash
# Save push token (after user subscribes)
curl -X POST http://localhost:3000/api/employees/push-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pushToken": {
      "endpoint": "https://fcm.googleapis.com/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      }
    }
  }'

# Response:
# { "success": true, "message": "Push token saved" }
```

### Test Sending Push

```bash
# Send test notification (admin only)
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": "user-id-here",
    "type": "chat",
    "title": "Test Notification",
    "message": "This is a test",
    "actionUrl": "/chat/123"
  }'

# Response:
# { "success": true, "message": "Push sent" }
```

### Check Health

```bash
# Check VAPID configuration
curl http://localhost:3000/api/health/push

# Response:
# { "status": "ok", "warnings": [] }
```

---

## 🔐 Step 8: Environment Configuration

### Update `backend/.env`

```env
# ============ PUSH NOTIFICATIONS ============
VAPID_PUBLIC_KEY=BPxxxxxxxxxxxxxxxxx...
VAPID_PRIVATE_KEY=YYYyyyyyyyyyyyyyyy...
VAPID_PUBLIC_SUBJECT=mailto:admin@go3nethrm.com

# Push configuration
PUSH_RETRY_ATTEMPTS=3
PUSH_RETRY_DELAY_MS=1000
PUSH_BATCH_SIZE=50
```

### Update `backend/.env.production`

```env
VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
VAPID_PUBLIC_SUBJECT=${VAPID_PUBLIC_SUBJECT}
PUSH_RETRY_ATTEMPTS=5
```

---

## ✅ Integration Checklist

```
BACKEND SETUP:
- [ ] VAPID keys generated and saved to .env
- [ ] web-push npm package installed
- [ ] PushNotificationService created
- [ ] API endpoints created
- [ ] Employee repository updated
- [ ] Database migration applied
- [ ] Routes registered in server.ts
- [ ] Health check endpoint working

TESTING:
- [ ] Save push token endpoint works
- [ ] Remove push token endpoint works
- [ ] Send push notification endpoint works
- [ ] Health check shows "ok"
- [ ] No console errors
- [ ] Push received on client

DEPLOYMENT:
- [ ] VAPID keys added to Vercel environment variables
- [ ] Database migration executed on production
- [ ] Push endpoints tested on production URL
- [ ] Error handling logs visible in Vercel logs
```

---

## 🐛 Troubleshooting

### "VAPID keys not configured"
- **Cause**: Environment variables not set
- **Fix**: Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env

### "Subscription expired (410)"
- **Cause**: User's push subscription is no longer valid
- **Fix**: Service automatically removes expired tokens; user can re-subscribe

### "Invalid push token format"
- **Cause**: Token doesn't have required structure
- **Fix**: Verify { endpoint, keys: { p256dh, auth } } structure

### "Push notification failed silently"
- **Cause**: VAPID subject mismatch or invalid keys
- **Fix**: Ensure VAPID_PUBLIC_KEY matches VAPID_PRIVATE_KEY pair

---

**Backend Setup Complete!** → Next: Phase 4d Hook Integration & Phase 5 Testing