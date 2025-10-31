/**
 * Service Worker for Push Notifications
 * 
 * Handles:
 * - Web Push API notifications (VAPID-based)
 * - Background message handling
 * - Notification clicks with navigation
 * - Badge/icon management
 * 
 * Setup:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Store public key in frontend/.env as VITE_VAPID_PUBLIC_KEY
 * 3. Store private key in backend/.env as VAPID_PRIVATE_KEY
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Types
interface NotificationData {
  type: 'chat' | 'leave' | 'purchase' | 'task' | 'birthday' | 'checkout';
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  action_url?: string;
  notificationId?: string;
  chatId?: string;
  userId?: string;
  timestamp?: string;
  actionUrl?: string;
}

interface NotificationClickEvent extends ExtendableEvent {
  notification: Notification;
  action?: string;
}

// ============================================================================
// 1. PUSH EVENT HANDLER
// ============================================================================

self.addEventListener('push', (event: PushEvent) => {
  try {
    const data = event.data?.json() as NotificationData;

    if (!data) {
      console.warn('[SW] Push event received with no data');
      return;
    }

    const notificationOptions: NotificationOptions = {
      body: data.message,
      icon: data.icon || '/logo.png',
      badge: data.badge || '/logo.png',
      tag: `notification-${data.notificationId || Date.now()}`, // Prevents duplicates
      requireInteraction: false,
      silent: false,
      // Note: actions property may not be supported in all browsers
      // actions: [
      //   {
      //     action: 'open',
      //     title: 'View',
      //   },
      //   {
      //     action: 'close',
      //     title: 'Close',
      //   },
      // ],
      data: {
        type: data.type,
        action_url: data.action_url || data.actionUrl,
        chatId: data.chatId,
        notificationId: data.notificationId,
        timestamp: data.timestamp || new Date().toISOString(),
      },
    };

    // Customize notification based on type
    switch (data.type) {
      case 'chat':
        notificationOptions.tag = `chat-${data.chatId || 'default'}`;
        notificationOptions.body = `New message: ${data.message}`;
        break;
      case 'task':
        notificationOptions.tag = 'task-notification';
        break;
      case 'leave':
      case 'purchase':
        notificationOptions.requireInteraction = true; // Important: needs user action
        break;
      case 'birthday':
        notificationOptions.body = '🎉 ' + data.message;
        break;
    }

    event.waitUntil(
      self.registration.showNotification(data.title, notificationOptions)
    );

    console.log('[SW] Push notification displayed:', data.title);
  } catch (error) {
    console.error('[SW] Error handling push event:', error);
  }
});

// ============================================================================
// 2. NOTIFICATION CLICK HANDLER
// ============================================================================

self.addEventListener(
  'notificationclick',
  (event: NotificationClickEvent) => {
    try {
      event.notification.close();

      const data = event.notification.data as NotificationData;
      const actionUrl = data.action_url || data.actionUrl || '/';

      // Handle close action
      if (event.action === 'close') {
        console.log('[SW] Notification closed by user');
        return;
      }

      event.waitUntil(
        (async () => {
          try {
            // Find or open window
            const clients = await self.clients.matchAll({
              type: 'window',
              includeUncontrolled: true,
            });

            let targetClient = null;

            // Check if app is already open
            for (const client of clients) {
              if (client.url === new URL(actionUrl, self.location.origin).href) {
                targetClient = client;
                break;
              }
            }

            if (targetClient) {
              // Focus existing window
              await targetClient.focus();
              // Post message to trigger highlight animation
              targetClient.postMessage({
                type: 'NOTIFICATION_CLICK',
                notificationId: data.notificationId,
                chatId: data.chatId,
                actionUrl,
              });
            } else {
              // Open new window
              const newClient = await self.clients.openWindow(actionUrl);
              if (newClient) {
                // Wait for client to be ready before posting message
                setTimeout(() => {
                  newClient.postMessage({
                    type: 'NOTIFICATION_CLICK',
                    notificationId: data.notificationId,
                    chatId: data.chatId,
                    actionUrl,
                  });
                }, 1000);
              }
            }

            // Mark notification as read (API call)
            if (data.notificationId) {
              try {
                const response = await fetch(
                  `/api/notifications/${data.notificationId}/read`,
                  {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${await getAuthToken()}`,
                    },
                  }
                );

                if (!response.ok) {
                  console.warn(
                    `[SW] Failed to mark notification as read: ${response.status}`
                  );
                }
              } catch (apiError) {
                console.warn('[SW] Error calling mark-read API:', apiError);
                // Fail silently - user still gets the click action
              }
            }
          } catch (error) {
            console.error('[SW] Error in notification click handler:', error);
          }
        })()
      );
    } catch (error) {
      console.error('[SW] Critical error in notification click:', error);
    }
  }
);

// ============================================================================
// 3. NOTIFICATION CLOSE HANDLER (Optional)
// ============================================================================

self.addEventListener('notificationclose', (event: Event) => {
  const notificationEvent = event as NotificationClickEvent;
  console.log(
    '[SW] Notification closed:',
    notificationEvent.notification.tag
  );
});

// ============================================================================
// 4. MESSAGE HANDLER (Backend Communication)
// ============================================================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  try {
    const { type, data } = event.data;

    switch (type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;

      case 'CLEAR_NOTIFICATIONS':
        self.registration.getNotifications().then((notifications) => {
          notifications.forEach((notification) => notification.close());
        });
        break;

      case 'SHOW_NOTIFICATION':
        showNotificationFromMessage(data);
        break;

      default:
        console.log('[SW] Unknown message type:', type);
    }
  } catch (error) {
    console.error('[SW] Error handling message:', error);
  }
});

// ============================================================================
// 5. HELPER FUNCTIONS
// ============================================================================

/**
 * Show notification from in-app message
 */
async function showNotificationFromMessage(data: NotificationData) {
  try {
    const notificationOptions: NotificationOptions = {
      body: data.message,
      icon: data.icon || '/logo.png',
      badge: data.badge || '/logo.png',
      tag: `message-${Date.now()}`,
      data: {
        type: data.type,
        action_url: data.action_url,
      },
    };

    await self.registration.showNotification(data.title, notificationOptions);
  } catch (error) {
    console.error('[SW] Error showing notification from message:', error);
  }
}

/**
 * Get authentication token from storage
 * Note: Service Workers can't access localStorage directly
 * Token is passed via postMessage or stored in IndexedDB
 */
async function getAuthToken(): Promise<string> {
  return new Promise((resolve) => {
    const request = indexedDB.open('go3net-db', 1);

    request.onerror = () => {
      console.warn('[SW] IndexedDB open failed');
      resolve('');
    };

    request.onsuccess = (event) => {
      try {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['auth'], 'readonly');
        const store = transaction.objectStore('auth');
        const query = store.get('token');

        query.onerror = () => resolve('');
        query.onsuccess = () => {
          const result = query.result;
          resolve(result?.token || '');
        };
      } catch (error) {
        console.error('[SW] Error retrieving token:', error);
        resolve('');
      }
    };
  });
}

/**
 * Background sync for offline notifications
 * Queues notifications when user is offline
 */
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncOfflineNotifications());
  }
});

async function syncOfflineNotifications() {
  try {
    const db = await openIndexedDB();
    const notifications = await getOfflineNotifications(db);

    for (const notification of notifications) {
      await self.registration.showNotification(
        notification.title,
        notification.options
      );
      await deleteOfflineNotification(db, notification.id);
    }
  } catch (error) {
    console.error('[SW] Error syncing offline notifications:', error);
  }
}

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('go3net-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getOfflineNotifications(
  db: IDBDatabase
): Promise<
  Array<{ id: string; title: string; options: NotificationOptions }>
> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineNotifications'], 'readonly');
    const store = transaction.objectStore('offlineNotifications');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

function deleteOfflineNotification(
  db: IDBDatabase,
  id: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineNotifications'], 'readwrite');
    const store = transaction.objectStore('offlineNotifications');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================================
// 6. ACTIVATE EVENT (Clean up old caches)
// ============================================================================

self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// ============================================================================
// 7. INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

export { }; // Ensure this is treated as a module