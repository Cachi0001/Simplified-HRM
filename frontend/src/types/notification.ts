export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'signup' | 'approval' | 'update' | 'task';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
}

export interface Go3netNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  targetUserId?: string; // For admin notifications about specific users
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
  source: 'system' | 'admin' | 'employee';
  category: 'dashboard' | 'employee' | 'system' | 'approval' | 'task';
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    notificationId: string;
    type: NotificationType;
    url?: string;
    action?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}
