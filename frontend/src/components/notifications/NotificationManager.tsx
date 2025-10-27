import React, { useState, useEffect } from 'react';
import { ToastNotification } from './ToastNotification';
import { useNotifications } from '@/hooks/useNotifications';
import { Go3netNotification } from '@/types/notification';
import { notificationService } from '@/services/notificationService';

interface NotificationManagerProps {
  userId?: string;
  darkMode?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export function NotificationManager({
  userId,
  darkMode = false,
  position = 'top-right',
  maxToasts = 5
}: NotificationManagerProps) {
  const [toasts, setToasts] = useState<Go3netNotification[]>([]);
  const { showToast } = useNotifications(userId);

  useEffect(() => {
    const handleNewNotification = (notification: Go3netNotification) => {
      setToasts(prev => {
        const exists = prev.find(t => t.id === notification.id);
        if (exists) return prev;

        const newToasts = [notification, ...prev];
        return newToasts.slice(0, maxToasts);
      });
    };

    const handleServiceNotification = (event: CustomEvent) => {
      handleNewNotification(event.detail);
    };

    window.addEventListener('go3net-notification', handleServiceNotification as EventListener);

    return () => {
      window.removeEventListener('go3net-notification', handleServiceNotification as EventListener);
    };
  }, [maxToasts]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleToastClick = (notification: Go3netNotification) => {
    notificationService.markNotificationAsRead(notification.id);
    removeToast(notification.id);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 10}px)`,
            zIndex: 50 + index
          }}
        >
          <ToastNotification
            notification={toast}
            onClose={removeToast}
            darkMode={darkMode}
            position={position}
          />
        </div>
      ))}
    </div>
  );
}

export function triggerNotification(notification: Go3netNotification): void {
  notificationService.showLocalNotification(notification);

  const event = new CustomEvent('go3net-notification', {
    detail: notification
  });
  window.dispatchEvent(event);
}

const NotificationUtils = {
  employeeSignup: (employeeName: string, employeeId: string): Go3netNotification => ({
    id: `signup-${employeeId}-${Date.now()}`,
    type: 'signup',
    priority: 'normal',
    title: 'New Employee Signup',
    message: `${employeeName} has signed up for an account`,
    timestamp: new Date(),
    read: false,
    targetUserId: employeeId,
    actions: [
      { label: 'View Profile', action: 'view', url: `/employee/${employeeId}` },
      { label: 'Approve', action: 'approve', url: '/dashboard#pending-approvals' }
    ],
    source: 'system',
    category: 'employee'
  }),

  approvalRequired: (employeeName: string, employeeId: string): Go3netNotification => ({
    id: `approval-${employeeId}-${Date.now()}`,
    type: 'approval',
    priority: 'high',
    title: 'Approval Required',
    message: `${employeeName} requires approval for their account`,
    timestamp: new Date(),
    read: false,
    targetUserId: employeeId,
    actions: [
      { label: 'Review', action: 'view', url: '/dashboard#pending-approvals' },
      { label: 'Approve', action: 'approve', url: '/dashboard#pending-approvals' }
    ],
    source: 'system',
    category: 'approval'
  }),

  profileUpdated: (employeeName: string, employeeId: string): Go3netNotification => ({
    id: `update-${employeeId}-${Date.now()}`,
    type: 'update',
    priority: 'low',
    title: 'Profile Updated',
    message: `${employeeName} has updated their profile`,
    timestamp: new Date(),
    read: false,
    targetUserId: employeeId,
    actions: [
      { label: 'View Changes', action: 'view', url: `/employee/${employeeId}` }
    ],
    source: 'employee',
    category: 'employee'
  }),

  taskAssigned: (taskTitle: string, employeeId: string): Go3netNotification => ({
    id: `task-${employeeId}-${Date.now()}`,
    type: 'task',
    priority: 'normal',
    title: 'New Task Assigned',
    message: `You have been assigned: ${taskTitle}`,
    timestamp: new Date(),
    read: false,
    targetUserId: employeeId,
    actions: [
      { label: 'View Task', action: 'view', url: '/tasks' },
      { label: 'Mark Complete', action: 'complete', url: '/tasks' }
    ],
    source: 'admin',
    category: 'task'
  }),

  taskCompleted: (taskTitle: string, completedByName: string, assigneeName: string, employeeId: string): Go3netNotification => ({
    id: `task-completed-${employeeId}-${Date.now()}`,
    type: 'success',
    priority: 'normal',
    title: 'Task Completed',
    message: `${completedByName} completed ${taskTitle}.`,
    timestamp: new Date(),
    read: false,
    targetUserId: employeeId,
    actions: [
      { label: 'View Task', action: 'view', url: '/tasks' }
    ],
    source: 'system',
    category: 'task'
  })
};

export { NotificationUtils };
