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

  // Listen for new notifications from the service
  useEffect(() => {
    const handleNewNotification = (notification: Go3netNotification) => {
      // Add to toasts if not already there
      setToasts(prev => {
        const exists = prev.find(t => t.id === notification.id);
        if (exists) return prev;

        const newToasts = [notification, ...prev];
        return newToasts.slice(0, maxToasts); // Keep only the latest toasts
      });
    };

    // Listen for custom events from the notification service
    const handleServiceNotification = (event: CustomEvent) => {
      handleNewNotification(event.detail);
    };

    window.addEventListener('go3net-notification', handleServiceNotification);

    return () => {
      window.removeEventListener('go3net-notification', handleServiceNotification);
    };
  }, [maxToasts]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleToastClick = (notification: Go3netNotification) => {
    // Mark as read in the service
    notificationService.markNotificationAsRead(notification.id);

    // Remove from local toasts
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

// Helper function to trigger notifications from anywhere in the app
export function triggerNotification(notification: Go3netNotification): void {
  // Show local notification
  notificationService.showLocalNotification(notification);

  // Dispatch custom event for the NotificationManager
  const event = new CustomEvent('go3net-notification', {
    detail: notification
  });
  window.dispatchEvent(event);
}

// Utility functions for common notification types
export const NotificationUtils = {
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
      { label: 'View Task', action: 'view', url: '/employee-dashboard#tasks' },
      { label: 'Mark Complete', action: 'complete', url: '/employee-dashboard#tasks' }
    ],
    source: 'admin',
    category: 'task'
  }),
};
