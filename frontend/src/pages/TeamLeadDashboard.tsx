import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, CheckSquare, BarChart3, Calendar, MessageSquare, Settings } from 'lucide-react';

const TeamLeadDashboard: React.FC = () => {
  const { user } = useAuth();

  const dashboardCards = [
    {
      title: 'Team Members',
      description: 'Manage your team members and assignments',
      icon: Users,
      color: 'bg-blue-500',
      href: '/team-members'
    },
    {
      title: 'Task Management',
      description: 'Assign and track team tasks',
      icon: CheckSquare,
      color: 'bg-green-500',
      href: '/tasks'
    },
    {
      title: 'Team Performance',
      description: 'View team performance metrics',
      icon: BarChart3,
      color: 'bg-purple-500',
      href: '/team-performance'
    },
    {
      title: 'Schedule Management',
      description: 'Manage team schedules and attendance',
      icon: Calendar,
      color: 'bg-orange-500',
      href: '/team-schedule'
    },
    {
      title: 'Team Chat',
      description: 'Communicate with your team',
      icon: MessageSquare,
      color: 'bg-indigo-500',
      href: '/chat'
    },
    {
      title: 'Settings',
      description: 'Manage your profile and preferences',
      icon: Settings,
      color: 'bg-gray-500',
      href: '/settings'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.fullName || user?.name || 'Team Lead'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your team and track progress from your dashboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckSquare className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">85%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">40h</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-full ${card.color}`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">
                    {card.title}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  {card.description}
                </p>
                <Button 
                  className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                  onClick={() => window.location.href = card.href}
                >
                  Access
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Team Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Task "Website Redesign" completed</p>
                  <p className="text-sm text-gray-600">by John Doe • 2 hours ago</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Completed
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">New task assigned to Sarah Wilson</p>
                  <p className="text-sm text-gray-600">Database optimization • 4 hours ago</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Assigned
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Team meeting scheduled</p>
                  <p className="text-sm text-gray-600">Weekly standup • Tomorrow 9:00 AM</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                  Upcoming
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamLeadDashboard;