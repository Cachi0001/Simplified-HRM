import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { employeeService } from '../services/employeeService';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { NotificationManager } from '../components/notifications/NotificationManager';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import Logo from '../components/ui/Logo';
import { authService } from '../services/authService';
import { Task } from '../services/taskService';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Bell,
  Check,
  RefreshCw
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useTokenValidation } from '../hooks/useTokenValidation';

export default function TasksPage() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Get current user
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      if (user) {
        setCurrentUser(user);
        setIsAdmin(user.role === 'admin');
      }
    } catch (err) {
      console.error('Error getting current user:', err);
    }
  }, []);

  // Add token validation to automatically logout on token expiry
  useTokenValidation({
    checkInterval: 2 * 60 * 1000, // Check every 2 minutes
    onTokenExpired: () => {
      console.log('Tasks page token expired, redirecting to login');
    }
  });

  const formatDateInput = (date: Date) => date.toISOString().split('T')[0];
  const tomorrow = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  })();

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: formatDateInput(tomorrow)
  });

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const normalizeId = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value._id) return normalizeId(value._id);
      if (value.id) return normalizeId(value.id);
      if (typeof value.toString === 'function') return value.toString();
    }
    return String(value);
  };

  // Fetch tasks based on user role
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', searchQuery, statusFilter, isAdmin],
    queryFn: async () => {
      if (searchQuery) {
        return await taskService.searchTasks(searchQuery);
      }

      if (isAdmin) {
        const response = await taskService.getAllTasks();
        return response.tasks;
      } else {
        return await taskService.getMyTasks();
      }
    },
    enabled: !!currentUser,
  });

  // Fetch employees for admin task assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      if (!isAdmin) return [];

      const response = await employeeService.getAllEmployees();
      const nonAdminEmployees = response.employees.filter((emp: any) => emp.role !== 'admin');
      return nonAdminEmployees;
    },
    enabled: isAdmin && !!currentUser,
  });

  // Create task mutation (admin only)
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await taskService.createTask(taskData);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateForm(false);
      setNewTask({ title: '', description: '', assigneeId: '', priority: 'medium', dueDate: formatDateInput(tomorrow) });
      addToast('success', 'Task created successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to create task';
      addToast('error', errorMessage);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await taskService.deleteTask(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast('success', 'Task deleted successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to delete task';
      addToast('error', errorMessage);
    },
  });

  // Update task status (employees only)
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return await taskService.updateTaskStatus(taskId, status);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast('success', 'Task status updated successfully');

      // Trigger task completion notification if task was completed
      if (variables.status === 'completed' && !isAdmin) {
        const completedTask = data.task;
        if (completedTask) {
          // The notification should be handled by the backend
          // But we can show a local notification for immediate feedback
          addToast('success', 'Task completed! The assignee has been notified.');
        }
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Failed to update task status';
      addToast('error', message);
    }
  });

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'all') return true;
    return task.status === statusFilter;
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusActionColor = (status: string) => {
    switch (status) {
      case 'completed':
        return darkMode ? 'text-green-400' : 'text-green-600';
      case 'in_progress':
        return darkMode ? 'text-blue-400' : 'text-blue-600';
      case 'pending':
        return darkMode ? 'text-orange-400' : 'text-orange-600';
      default:
        return darkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.assigneeId || !newTask.dueDate) {
      addToast('error', 'Please fill in all required fields');
      return;
    }

    createTaskMutation.mutate({
      ...newTask,
      dueDate: new Date(newTask.dueDate).toISOString()
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleStatusUpdate = (taskId: string, newStatus: string) => {
    updateTaskStatus.mutate({ taskId, status: newStatus });
  };

  // Initialize push notifications
  useEffect(() => {
    if (currentUser) {
      notificationService.initializePushNotifications().catch(err => {
        console.error('Failed to initialize push notifications:', err);
      });
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo className="h-8 w-auto" />
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {isAdmin ? 'Task Management' : 'My Tasks'}
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Welcome back, {currentUser.fullName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            <NotificationBell darkMode={darkMode} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isAdmin ? 'Manage Tasks' : 'My Tasks'}
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {isAdmin ? 'Create and manage tasks for your team' : 'View and update your assigned tasks'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          )}
        </div>

        {/* Create Task Form (Admin Only) */}
        {showCreateForm && isAdmin && (
          <Card className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Create New Task
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Title *
                  </label>
                  <Input
                    id="task-title"
                    label=""
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Assignee *
                  </label>
                  <select
                    value={newTask.assigneeId}
                    onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                    className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => {
                      const value = normalizeId(emp.id);
                      return (
                        <option key={value} value={value}>
                          {emp.fullName} ({emp.department || 'No Department'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Due Date *
                  </label>
                  <Input
                    id="task-due-date"
                    label=""
                    type="date"
                    min={formatDateInput(tomorrow)}
                    value={newTask.dueDate}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const selectedDate = new Date(selected);
                      if (selected && selectedDate < tomorrow) {
                        addToast('error', 'Due date cannot be in the past.');
                        return;
                      }
                      setNewTask({ ...newTask, dueDate: selected });
                    }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description (optional)"
                  rows={3}
                  className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleCreateTask} isLoading={createTaskMutation.isPending} disabled={createTaskMutation.isPending}>
                  Create Task
                </Button>
                <Button
                  onClick={() => setShowCreateForm(false)}
                  disabled={createTaskMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    id="search-input"
                    label=""
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Tasks List */}
        {tasksLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={`skeleton-task-${i}`} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`p-4 h-20 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              </Card>
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="space-y-3">
            {filteredTasks.map((task, index) => {
              // Use the extractId function from taskService for proper type handling
              const extractId = (value: any): string => {
                if (!value) return '';
                if (typeof value === 'string') return value;
                if (typeof value === 'object') {
                  if (value._id) return extractId(value._id);
                  if (value.id) return extractId(value.id);
                  if (typeof value.toString === 'function') return value.toString();
                }
                return String(value);
              };

              const assigneeId = task.assigneeId ? extractId(task.assigneeId) : null;

              const assignedEmployee = isAdmin && assigneeId ? employees.find(e =>
                e.id === assigneeId
              ) : currentUser;

              return (
                <div
                  key={task.id || `task-${index}`}
                  className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl animate-slide-in`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {/* Header: Title + Status + Priority */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusIcon(task.status)}
                          <span className="ml-1">{task.status.replace('_', ' ')}</span>
                        </Badge>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Assignee Section */}
                  {assignedEmployee && (
                    <div className={`mb-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} border-l-4 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}>
                      <div className={`flex items-center gap-2 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                        <User className="h-4 w-4" />
                        <span className="font-medium">Assigned to:</span>
                        <span className="font-semibold">{assignedEmployee.fullName}</span>
                      </div>
                      {assignedEmployee.department && (
                        <div className={`text-xs ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Department: {assignedEmployee.department}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {task.description && (
                    <div className="mb-3">
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {task.description}
                      </p>
                    </div>
                  )}

                  {/* Metadata: Dates */}
                  <div className={`flex items-center gap-4 text-xs mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.status === 'completed' && (
                      <div className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                        <CheckCircle className="h-4 w-4" />
                        Task Completed
                      </div>
                    )}

                    {task.status === 'cancelled' && (
                      <div className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
                        <AlertCircle className="h-4 w-4" />
                        Task Cancelled
                      </div>
                    )}

                    {/* Employee Actions */}
                    {!isAdmin && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {task.status === 'pending' && (
                          <Button
                            onClick={() => handleStatusUpdate(task.id, 'in_progress')}
                            disabled={updateTaskStatus.isPending}
                            isLoading={updateTaskStatus.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Start Task
                          </Button>
                        )}

                        {task.status === 'in_progress' && (
                          <Button
                            onClick={() => handleStatusUpdate(task.id, 'completed')}
                            disabled={updateTaskStatus.isPending}
                            isLoading={updateTaskStatus.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Complete Task
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                      <>
                        <Button
                          onClick={() => handleDeleteTask(task.id)}
                          isLoading={deleteTaskMutation.isPending}
                          disabled={deleteTaskMutation.isPending}
                          className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white text-xs py-1"
                          title="Delete this task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                          <CheckCircle className="h-3 w-3" />
                          Status: {task.status.replace('_', ' ')}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex flex-col items-center space-y-3">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                  <Bell className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <p className="font-medium">No tasks found</p>
                <p className="text-sm">
                  {searchQuery ? 'Try a different search term' : isAdmin ? 'Create your first task to get started' : 'No tasks have been assigned to you yet'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Notification Manager */}
      <NotificationManager
        userId={currentUser?.id}
        darkMode={darkMode}
        position="top-right"
        maxToasts={5}
      />

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />
    </div>
  );
}
