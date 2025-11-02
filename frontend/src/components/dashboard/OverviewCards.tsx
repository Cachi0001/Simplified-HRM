
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
      color: darkMode ? 'text-blue-400' : 'text-blue-600',
      bgColor: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
    },
    {
      title: 'Active',
      value: active,
      icon: UserCheck,
      color: darkMode ? 'text-green-400' : 'text-green-600',
      bgColor: darkMode ? 'bg-green-900/20' : 'bg-green-50',
    },
    {
      title: 'Pending Approval',
      value: pending,
      icon: Clock,
      color: darkMode ? 'text-orange-400' : 'text-orange-600',
      bgColor: darkMode ? 'bg-orange-900/20' : 'bg-orange-50',
    },
    {
      title: 'Notifications',
      value: unreadNotificationCount,
      icon: Bell,
      color: darkMode ? 'text-purple-400' : 'text-purple-600',
      bgColor: darkMode ? 'bg-purple-900/20' : 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} min-h-[120px] transition-colors duration-200`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                {card.title}
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {card.value}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
