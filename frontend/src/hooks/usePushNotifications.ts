/**
 * Hook: usePushNotifications
 * 
 * Manages Web Push API integration:
 * - Service Worker registration
 * - VAPID subscription management
 * - Push token storage and retrieval
 * - Permission handling
 * 
 * Usage:
 * const { isSupported, permission, subscribe, unsubscribe } = usePushNotifications();
 */

import { useEffect, useState, useCallback } from 'react';

// Types
export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  permission: NotificationPermission | null;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionResponse {
  success: boolean;
  message?: string;
  endpoint?: string;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    permission: null,
    isSubscribed: false,
    isLoading: false,
    error: null,
  });

  // ========================================================================
  // 1. CHECK BROWSER SUPPORT
  // ========================================================================

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const hasServiceWorkerSupport =
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          'Notification' in window;

        if (!hasServiceWorkerSupport) {
          console.warn(
            '[Push] This browser does not support Web Push API'
          );
          setState((prev) => ({ ...prev, isSupported: false }));
          return;
        }

        setState((prev) => ({ ...prev, isSupported: true }));

        // Register service worker
        try {
          const registration = await navigator.serviceWorker.register(
            '/src/sw.ts',
            {
              scope: '/',
            }
          );

          console.log('[Push] Service Worker registered:', registration);

          setState((prev) => ({ ...prev, isRegistered: true }));

          // Check current permission
          const currentPermission = Notification.permission;
          setState((prev) => ({ ...prev, permission: currentPermission }));

          // Check if already subscribed
          const subscription =
            await registration.pushManager.getSubscription();
          setState((prev) => ({
            ...prev,
            isSubscribed: subscription !== null,
          }));
        } catch (registrationError) {
          console.error(
            '[Push] Service Worker registration failed:',
            registrationError
          );
          setState((prev) => ({
            ...prev,
            isRegistered: false,
            error: 'Failed to register service worker',
          }));
        }
      } catch (error) {
        console.error('[Push] Support check failed:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    checkSupport();
  }, []);

  // ========================================================================
  // 2. REQUEST PERMISSION
  // ========================================================================

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isSupported) {
        console.warn('[Push] Web Push API not supported');
        return false;
      }

      if (Notification.permission === 'granted') {
        setState((prev) => ({ ...prev, permission: 'granted' }));
        return true;
      }

      if (Notification.permission === 'denied') {
        console.warn('[Push] Push notifications denied by user');
        setState((prev) => ({
          ...prev,
          permission: 'denied',
          error: 'Push notifications denied. Enable in browser settings.',
        }));
        return false;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission === 'granted') {
        console.log('[Push] User granted push notification permission');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Push] Error requesting permission:', error);
      const errorMsg =
        error instanceof Error ? error.message : 'Permission request failed';
      setState((prev) => ({ ...prev, error: errorMsg }));
      return false;
    }
  }, [state.isSupported]);

  // ========================================================================
  // 3. SUBSCRIBE TO PUSH
  // ========================================================================

  const subscribe = useCallback(async (): Promise<SubscriptionResponse> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Check support and permission
      if (!state.isSupported) {
        throw new Error('Web Push API not supported');
      }

      const hasPermission = await requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission not granted');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key
      const vapidPublicKey =
        import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      // Convert VAPID key to Uint8Array
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Create subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as BufferSource,
      });

      console.log('[Push] Subscribed to push:', subscription);

      // Get subscription JSON
      const subscriptionJSON = subscription.toJSON();

      // Send to backend to save
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/employees/push-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            pushToken: subscriptionJSON,
            endpoint: subscription.endpoint,
          }),
        }
      );

      if (!response.ok) {
        console.warn(
          '[Push] Backend push token save failed:',
          response.status
        );
        // Still consider it success if subscribed locally
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }));

      return {
        success: true,
        message: 'Successfully subscribed to push notifications',
        endpoint: subscription.endpoint,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Subscription failed';
      console.error('[Push] Subscription error:', errorMsg);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }));
      return {
        success: false,
        message: errorMsg,
      };
    }
  }, [state.isSupported, requestPermission]);

  // ========================================================================
  // 4. UNSUBSCRIBE FROM PUSH
  // ========================================================================

  const unsubscribe = useCallback(
    async (): Promise<SubscriptionResponse> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        if (!state.isSupported) {
          throw new Error('Web Push API not supported');
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription =
          await registration.pushManager.getSubscription();

        if (!subscription) {
          throw new Error('Not currently subscribed');
        }

        // Unsubscribe locally
        await subscription.unsubscribe();

        // Notify backend
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/employees/push-token`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${getAuthToken()}`,
              },
            }
          );
        } catch (backendError) {
          console.warn('[Push] Backend unsubscribe failed:', backendError);
        }

        setState((prev) => ({
          ...prev,
          isSubscribed: false,
          isLoading: false,
        }));

        return {
          success: true,
          message: 'Successfully unsubscribed from push notifications',
        };
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unsubscription failed';
        console.error('[Push] Unsubscription error:', errorMsg);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));
        return {
          success: false,
          message: errorMsg,
        };
      }
    },
    [state.isSupported]
  );

  // ========================================================================
  // 5. LISTEN FOR NOTIFICATION CLICKS (Frontend)
  // ========================================================================

  useEffect(() => {
    const handleNotificationClick = (event: MessageEvent) => {
      const { type, notificationId, chatId, actionUrl } = event.data;

      if (type === 'NOTIFICATION_CLICK') {
        console.log('[Push] Notification clicked in app:', {
          notificationId,
          chatId,
          actionUrl,
        });

        // Trigger highlight animation on page
        const highlightEvent = new CustomEvent('notification-highlight', {
          detail: {
            notificationId,
            chatId,
            actionUrl,
          },
        });
        window.dispatchEvent(highlightEvent);

        // Navigate if needed
        if (actionUrl && actionUrl !== window.location.pathname) {
          window.location.href = actionUrl;
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleNotificationClick);

      return () => {
        navigator.serviceWorker.removeEventListener(
          'message',
          handleNotificationClick
        );
      };
    }
  }, []);

  // ========================================================================
  // 6. CLEAR NOTIFICATIONS
  // ========================================================================

  const clearAllNotifications = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_NOTIFICATIONS',
        });
        console.log('[Push] Clear notifications message sent');
      }
    } catch (error) {
      console.error('[Push] Error clearing notifications:', error);
    }
  }, []);

  return {
    // State
    ...state,
    // Actions
    requestPermission,
    subscribe,
    unsubscribe,
    clearAllNotifications,
  };
}

// ========================================================================
// 7. HELPER FUNCTIONS
// ========================================================================

/**
 * Convert VAPID key from Base64URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Get auth token from localStorage (or your auth system)
 */
function getAuthToken(): string {
  try {
    const auth = localStorage.getItem('auth');
    if (!auth) return '';
    const parsed = JSON.parse(auth);
    return parsed.token || '';
  } catch {
    return '';
  }
}

export default usePushNotifications;