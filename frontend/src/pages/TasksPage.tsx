import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { Calendar, User, Clock, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import Logo from '../components/ui/Logo';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';

export function TasksPage() {
  const { darkMode, setDarkMode } = useTheme();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  
  const currentUser = authService.getCurrentUserFromStorage();
  const currentUserId = currentUser?.id || (currentUser as any)?._id;
  const isEmployee = currentUser?.role === 'employee';
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const canAssignTasks = ['hr', 'admin', 'teamlead', 'superadmin'].includes(currentUser?.role || '');
  
  // Default tab: employees only see "assigned-to-me", others see "i-assigned" first
  const [activeTab, setActiveTab] = useState<'assigned-to-me' | 'i-assigned'>(
    isEmployee ? 'assigned-to-me' : 'i-assigned'
  );
  
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Fetch tasks assigned TO me (not for superadmin)
  const { data: myTasks = [], isLoading: myTasksLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      console.log('[TasksPage] Fetching tasks assigned to me');
      const response = await taskService.getMyTasks();
      console.log('[TasksPage] My tasks response:', response);
      return Array.isArray(response) ? response : [];
    },
    enabled: !isSuperAdmin, // Don't fetch for superadmin
  });

  // Fetch tasks I assigned to others (only for roles that can assign)
  const { data: allTasks = [], isLoading: assignedTasksLoading } = useQuery({
    queryKey: ['tasks-i-assigned'],
    queryFn: async () => {
      console.log('[TasksPage] Fetching all tasks');
      const response = await taskService.getAllTasks();
      console.log('[TasksPage] All tasks response:', response);
      return response.tasks || [];
    },
    enabled: canAssignTasks, // Only fetch for roles that can assign tasks
  });

  // Filter to only show tasks created by current user
  const assignedTasks = allTasks.filter((task: any) => {
    const taskCreatorId = task.assignedBy || task.assigned_by;
    return taskCreatorId === currentUserId;
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await taskService.deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-i-assigned'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      addToast('success', 'Task deleted successfully');
      setDeletingTaskId(null);
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to delete task';
      addToast('error', errorMessage);
      setDeletingTaskId(null);
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      case 'medium': return darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'low': return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800';
      default: return darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800';
      case 'in_progress': return darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800';
      case 'pending': return darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800';
      case 'cancelled': return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      default: return darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setDeletingTaskId(taskId);
      deleteTaskMutation.mutate(taskId);
    }
  };

  const renderTaskCard = (task: any) => {
    const assigneeName = task.assignee_name || 'Unknown Employee';
    const assignedByName = task.assigned_by_name || 'Unknown';
    const taskCreatorId = task.assignedBy || task.assigned_by;
    const isCreator = taskCreatorId === currentUserId;

    return (
      <Card key={task.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className={`font-semibold text-lg mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
            </div>
            {/* Delete button - only for task creator */}
            {isCreator && (
              <button
                onClick={() => handleDeleteTask(task.id)}
                disabled={deletingTaskId === task.id}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-red-400 hover:bg-red-900/20'
                    : 'text-red-600 hover:bg-red-50'
                } disabled:opacity-50`}
                title="Delete task"
              >
                {deletingTaskId === task.id ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

          {/* Assignee/Creator Info */}
          <div className={`mb-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} border-l-4 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}>
            <div className={`flex items-center gap-2 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
              <User className="h-4 w-4" />
              <span className="font-medium">
                {activeTab === 'assigned-to-me' ? 'Assigned by:' : 'Assigned to:'}
              </span>
              <span className="font-semibold">
                {activeTab === 'assigned-to-me' ? assignedByName : assigneeName}
              </span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="mb-3">
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {task.description}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className={`flex items-center gap-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
            {/* Back button - visible on mobile */}
            <Link 
              to="/dashboard" 
              className={`md:hidden p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            
            {/* Logo - hidden on mobile */}
            <Logo className="h-8 w-auto hidden md:block" />
            
            <div className="min-w-0 flex-1">
              <h1 className={`text-lg md:text-xl font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                My Tasks
              </h1>
              <p className={`text-xs md:text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your tasks
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">

        {/* Tabs - Show both tabs for roles that can assign, only "assigned to me" for employees */}
        {isEmployee ? (
          <div className="mb-6">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Tasks Assigned to Me
              {myTasks.length > 0 && (
                <span className={`ml-3 px-3 py-1 rounded-full text-sm ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {myTasks.length}
                </span>
              )}
            </h2>
          </div>
        ) : !isSuperAdmin ? (
          <div className={`flex gap-2 mb-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('i-assigned')}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === 'i-assigned'
                  ? `border-b-2 ${darkMode ? 'border-blue-500 text-blue-400' : 'border-blue-600 text-blue-600'}`
                  : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tasks I Assigned
              {assignedTasks.length > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  activeTab === 'i-assigned'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {assignedTasks.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('assigned-to-me')}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === 'assigned-to-me'
                  ? `border-b-2 ${darkMode ? 'border-blue-500 text-blue-400' : 'border-blue-600 text-blue-600'}`
                  : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tasks Assigned to Me
              {myTasks.length > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  activeTab === 'assigned-to-me'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {myTasks.length}
                </span>
              )}
            </button>
          </div>
        ) : null}

        {/* Superadmin Header */}
        {isSuperAdmin && (
          <div className="mb-6">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Tasks I Assigned
              {assignedTasks.length > 0 && (
                <span className={`ml-3 px-3 py-1 rounded-full text-sm ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {assignedTasks.length}
                </span>
              )}
            </h2>
          </div>
        )}

        {/* Tasks Assigned to Me - Show for employees always, for others when tab is active */}
        {(isEmployee || activeTab === 'assigned-to-me') && !isSuperAdmin && (
          <div>
            {myTasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className={`p-4 h-32 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  </Card>
                ))}
              </div>
            ) : myTasks.length > 0 ? (
              <div className="space-y-3">
                {myTasks.map(renderTaskCard)}
              </div>
            ) : (
              <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p className="font-medium">No tasks assigned to you</p>
                  <p className="text-sm mt-2">You don't have any tasks assigned to you at the moment.</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tasks I Assigned */}
        {(isSuperAdmin || activeTab === 'i-assigned') && (
          <div>
            {assignedTasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className={`p-4 h-32 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  </Card>
                ))}
              </div>
            ) : assignedTasks.length > 0 ? (
              <div className="space-y-3">
                {assignedTasks.map(renderTaskCard)}
              </div>
            ) : (
              <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p className="font-medium">No tasks assigned by you</p>
                  <p className="text-sm mt-2">You haven't assigned any tasks yet.</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />
      
      {/* Spacer for fixed navbar */}
      <div className="h-20"></div>
    </div>
  );
}
