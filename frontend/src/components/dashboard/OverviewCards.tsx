import React from 'react';
import { Card } from '../ui/Card';
import { Users, UserCheck, Clock, Bell } from 'lucide-react';

interface OverviewCardsProps {
  total: number;
  active: number;
  pending: number;
  darkMode?: boolean;
}

export function OverviewCards({ total, active, pending, darkMode = false }: OverviewCardsProps) {
  const cards = [
    {
      title: 'Total Employees',
      value: total,
      icon: Users,
      color: 'text-blue-600',
      bgColor: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      iconBg: darkMode ? 'bg-blue-600' : 'bg-blue-100'
    },
    {
      title: 'Active',
      value: active,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: darkMode ? 'bg-green-900/20' : 'bg-green-50',
      iconBg: darkMode ? 'bg-green-600' : 'bg-green-100'
    },
    {
      title: 'Pending Approval',
      value: pending,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: darkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      iconBg: darkMode ? 'bg-orange-600' : 'bg-orange-100'
    },
    {
      title: 'Notifications',
      value: 3,
      icon: Bell,
      color: 'text-purple-600',
      bgColor: darkMode ? 'bg-purple-900/20' : 'bg-purple-50',
      iconBg: darkMode ? 'bg-purple-600' : 'bg-purple-100'
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {card.title}
                </p>
                <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
