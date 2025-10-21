import React from 'react';
import { Card } from '../ui/Card';
import { CheckSquare, Clock, Calendar } from 'lucide-react';

interface EmployeeOverviewCardsProps {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  attendanceDays: number;
  totalHours: number;
  darkMode?: boolean;
}

export function EmployeeOverviewCards({
  totalTasks,
  completedTasks,
  pendingTasks,
  attendanceDays,
  totalHours,
  darkMode = false
}: EmployeeOverviewCardsProps) {
  const cards = [
    {
      title: 'Total Tasks',
      value: totalTasks,
      icon: CheckSquare,
      color: 'text-blue-600',
    },
    {
      title: 'Completed',
      value: completedTasks,
      icon: CheckSquare,
      color: 'text-green-600',
    },
    {
      title: 'Pending',
      value: pendingTasks,
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Attendance Days',
      value: attendanceDays,
      icon: Calendar,
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
