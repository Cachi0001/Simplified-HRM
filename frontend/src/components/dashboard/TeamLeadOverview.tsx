import { useState, useEffect } from 'react';
import { Users, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface TeamLeadOverviewProps {
  currentUser: any;
  darkMode: boolean;
}

export function TeamLeadOverview({ currentUser, darkMode }: TeamLeadOverviewProps) {
  const [stats, setStats] = useState({
    totalTeamMembers: 0,
    activeTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [currentUser]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Load team members
      const teamResponse = await apiClient.get(`/departments/${currentUser.department_id}/employees`);
      const teamMembers = teamResponse.data || [];
      
      // Load tasks assigned by this team lead
      const tasksResponse = await apiClient.get(`/tasks/assigned-by/${currentUser.id}`);
      const tasks = tasksResponse.data || [];
      
      // Calculate stats
      const activeTasks = tasks.filter((task: any) => 
        task.status === 'pending' || task.status === 'in_progress'
      ).length;
      
      const completedTasks = tasks.filter((task: any) => 
        task.status === 'completed'
      ).length;
      
      const overdueTasks = tasks.filter((task: any) => 
        task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
      ).length;

      // Load pending approvals (leave requests, etc.)
      const approvalsResponse = await apiClient.get(`/approvals/pending/${currentUser.id}`);
      const pendingApprovals = approvalsResponse.data?.length || 0;

      setStats({
        totalTeamMembers: teamMembers.length,
        activeTasks,
        completedTasks,
        overdueTasks,
        pendingApprovals
      });
    } catch (error) {
      console.error('Failed to load team lead stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Team Members',
      value: stats.totalTeamMembers,
      icon: Users,
      color: 'blue',
      description: 'Total team members under your supervision'
    },
    {
      title: 'Active Tasks',
      value: stats.activeTasks,
      icon: Clock,
      color: 'yellow',
      description: 'Tasks currently in progress'
    },
    {
      title: 'Completed Tasks',
      value: stats.completedTasks,
      icon: CheckSquare,
      color: 'green',
      description: 'Tasks completed this month'
    },
    {
      title: 'Overdue Tasks',
      value: stats.overdueTasks,
      icon: AlertCircle,
      color: 'red',
      description: 'Tasks past their due date'
    }
  ];

  if (loading) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Team Overview</h2>
        <button
          onClick={loadStats}
          className={`px-3 py-1 text-sm rounded ${
            darkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const colorClasses = {
            blue: darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-600',
            yellow: darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-50 text-yellow-600',
            green: darkMode ? 'bg-green-900 text-green-300' : 'bg-green-50 text-green-600',
            red: darkMode ? 'bg-red-900 text-red-300' : 'bg-red-50 text-red-600'
          };

          return (
            <div
              key={card.title}
              className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 border ${
                darkMode ? 'border-gray-600' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {stats.pendingApprovals > 0 && (
        <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-orange-900 border-orange-700' : 'bg-orange-50 border-orange-200'} border`}>
          <div className="flex items-center">
            <AlertCircle className={`h-5 w-5 mr-2 ${darkMode ? 'text-orange-300' : 'text-orange-600'}`} />
            <span className={`font-medium ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>
              You have {stats.pendingApprovals} pending approval{stats.pendingApprovals !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}