export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'signup' | 'approval' | 'update' | 'task' | 'approval_success';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
}

export interface NotificationMetadata {
  action_url?: string;
  highlight_id?: string;
  employee_id?: string;
  employee_name?: string;
  leave_request_id?: string;
  purchase_request_id?: string;
  task_id?: string;
  task_title?: string;
  leave_type?: string;
  item_name?: string;
  start_date?: string;
  end_date?: string;
  days_requested?: number;
  total_amount?: number;
  urgency?: string;
  status?: string;
  reason?: string;
  assigned_by?: string;
  assignee_name?: string;
  due_date?: string;
  priority?: string;
  clock_in_time?: string;
  [key: string]: any;
}

export interface Go3netNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp?: Date;
  created_at?: string;
  read: boolean;
  read_at?: string;
  userId?: string;
  user_id?: string;
  targetUserId?: string;
  actions?: NotificationAction[];
  metadata?: NotificationMetadata;
  source?: 'system' | 'admin' | 'employee';
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
