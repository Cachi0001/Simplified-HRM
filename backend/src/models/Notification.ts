export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'signup' | 'approval' | 'update' | 'task' | 'approval_success';

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
  targetUserId?: string;
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

// Database notification types
export type DatabaseNotificationType = 'chat' | 'leave' | 'purchase' | 'task' | 'birthday' | 'checkout' | 'announcement' | 'checkout_reminder' | 'missed_checkout' | 'late_checkout' | 'daily_summary' | 'system_error' | 'department_broadcast' | 'update' | 'urgent' | 'alert' | 'reminder' | 'profile_update' | 'security_update' | 'leave_request' | 'purchase_request' | 'task_assignment' | 'task_started' | 'approval_decision';

export interface DatabaseNotification {
  id: string;
  user_id: string;
  type: DatabaseNotificationType;
  title: string;
  message: string;
  related_id?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  expires_at: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: DatabaseNotificationType;
  title: string;
  message: string;
  relatedId?: string;
  actionUrl?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  data?: Record<string, any>;
}
