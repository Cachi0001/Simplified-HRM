import React, { useState, useEffect } from 'react';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { PendingApprovals } from '../components/dashboard/PendingApprovals';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationManager, triggerNotification, NotificationUtils } from '../components/notifications/NotificationManager';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { notificationService } from '../services/notificationService';
import Logo from '../components/ui/Logo';

export default function AdminDashboard() {
  const [darkMode, setDarkMode] = useState(false);

  // Get current user for notifications
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('status');
      const total = data?.length || 0;
      const active = data?.filter(e => e.status === 'active').length || 0;
      const pending = data?.filter(e => e.status === 'pending').length || 0;
      return { total, active, pending };
    },
  });

  // Initialize push notifications on mount
  useEffect(() => {
    notificationService.initializePushNotifications();
  }, []);

  // Listen for employee signup events (simulate real-time updates)
  useEffect(() => {
    if (!user) return;

    // Simulate receiving notifications for demo purposes
    const demoNotifications = [
      NotificationUtils.employeeSignup('John Doe', '123'),
      NotificationUtils.approvalRequired('Jane Smith', '456'),
      NotificationUtils.profileUpdated('Mike Johnson', '789')
    ];

    // Show demo notifications after a delay
    const timer = setTimeout(() => {
      demoNotifications.forEach((notification, index) => {
        setTimeout(() => {
          triggerNotification(notification);
        }, index * 3000); // Stagger notifications
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo className="h-8 w-auto" />
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Go3net Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            <NotificationBell darkMode={darkMode} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Overview Cards */}
        <section className="mb-8">
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-24 rounded-lg animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
              ))}
            </div>
          ) : (
            <OverviewCards
              total={stats?.total || 0}
              active={stats?.active || 0}
              pending={stats?.pending || 0}
              darkMode={darkMode}
            />
          )}
        </section>

        {/* Pending Approvals */}
        <section>
          <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Pending Approvals
          </h2>
          <PendingApprovals darkMode={darkMode} />
        </section>
      </div>

      {/* Notification Manager - handles toast notifications */}
      <NotificationManager
        userId={user?.id}
        darkMode={darkMode}
        position="top-right"
        maxToasts={5}
      />
    </div>
  );
}
