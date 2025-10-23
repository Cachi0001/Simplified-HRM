import React from 'react';
import { Card } from '../ui/Card';
import { Users, UserCheck, Clock, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';

interface OverviewCardsProps {
  total: number;
  active: number;
  pending: number;
  darkMode?: boolean;
}

export function OverviewCards({ total, active, pending, darkMode = false }: OverviewCardsProps) {
  // Fetch real notification count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      return await notificationService.getNotifications();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const cards = [
    {
      title: 'Total Employees',
      value: total,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Active',
      value: active,
      icon: UserCheck,
      color: 'text-green-600',
    },
    {
      title: 'Pending Approval',
      value: pending,
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Notifications',
      value: unreadNotificationCount,
      icon: Bell,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} min-h-[100px]`}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {card.title}
                </p>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {card.value}
                </p>
              </div>
              <div className="flex-shrink-0">
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
