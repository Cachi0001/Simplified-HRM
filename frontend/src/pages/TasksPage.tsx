import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { employeeService } from '../services/employeeService';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { Calendar, User, Clock, Trash2, ArrowLeft, Plus, Play, Pause, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import Logo from '../components/ui/Logo';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { getDisplayName } from '../utils/userDisplay';

export function TasksPage() {
  const { darkMode, setDarkMode } = useTheme();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  
  const currentUser = authService.getCurrentUserFromStorage();
  const currentUserId = currentUser?.id || (currentUser as any)?._id;
  const isEmployee = currentUser?.role === 'employee';
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const canAssignTasks = ['hr', 'admin', 'teamlead', 'superadmin'].includes(currentUser?.role || '');
  
  // Fetch current employee profile to get the correct employee ID
  const { data: currentEmployeeProfile } = useQuery({
    queryKey: ['current-employee-profile'],
    queryFn: async () => {
      const response = await employeeService.getMyProfile();
      return response;
    },
  });
  
  // Use employeeId from user object if available, otherwise from profile, fallback to user ID
  const currentEmployeeId = currentUser?.employeeId || currentEmployeeProfile?.id || currentUser?.id;
  
  // Default tab: employees only see "assigned-to-me", others see "i-assigned" first
  const [activeTab, setActiveTab] = useState<'assigned-to-me' | 'i-assigned'>(
    isEmployee ? 'assigned-to-me' : 'i-assigned'
  );
  
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string; taskName: string }>({
    isOpen: false,
    taskId: '',
    taskName: ''
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
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    dueDate: formatDateInput(tomorrow),
    dueTime: '' // Optional time field
  });
  const [hasInvalidTime, setHasInvalidTime] = useState(false);

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

  // Fetch ALL tasks to filter for "Tasks I Assigned"
  const { data: allTasks = [], isLoading: assignedTasksLoading } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      console.log('[TasksPage] Fetching all tasks');
      const response = await taskService.getAllTasks();
      console.log('[TasksPage] All tasks response:', response);
      return response.tasks || [];
    },
    enabled: canAssignTasks, // Only fetch for roles that can assign tasks
  });

  // Filter to only show tasks created by current user (using employee_id)
  const assignedTasks = allTasks.filter((task: any) => {
    const taskCreatorId = task.assignedBy || task.assigned_by;
    const matches = taskCreatorId === currentEmployeeId || taskCreatorId === currentUserId;
    
    // Debug logging
    if (allTasks.length > 0) {
      console.log('[Filter Debug]', {
        taskId: task.id,
        taskTitle: task.title,
        taskCreatorId,
        currentEmployeeId,
        currentUserId,
        matches
      });
    }
    
    return matches;
  });
  
  // Log summary
  console.log('[TasksPage Summary]', {
    totalTasks: allTasks.length,
    assignedByMe: assignedTasks.length,
    assignedToMe: myTasks.length,
    currentEmployeeId,
    currentUserId,
    currentUserRole: currentUser?.role
  });

  // Fetch employees for task assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-tasks'],
    queryFn: async () => {
      const response = await employeeService.getAllEmployees();
      
      // Filter based on role
      if (currentUser?.role === 'teamlead') {
        // Team leads see their team members
        return response.filter((emp: any) => 
          emp.role === 'employee' || emp.id === currentEmployeeId
        );
      }
      
      if (currentUser?.role === 'superadmin') {
        return response; // Superadmin can assign to anyone
      }
      
      // HR/Admin can assign to anyone except superadmin
      return response.filter((emp: any) => emp.role !== 'superadmin');
    },
    enabled: canAssignTasks,
  });

  // Handle notification highlight
  useEffect(() => {
    const highlightId = sessionStorage.getItem('highlight_id');
    const highlightType = sessionStorage.getItem('highlight_type');
    
    if (highlightId && highlightType === 'task') {
      // Check if this is a task assigned TO me (employee receiving notification)
      const isAssignedToMe = myTasks.some((task: any) => task.id === highlightId);
      const isAssignedByMe = assignedTasks.some((task: any) => task.id === highlightId);
      
      // Switch to the appropriate tab
      if (isAssignedToMe && activeTab !== 'assigned-to-me') {
        setActiveTab('assigned-to-me');
      } else if (isAssignedByMe && activeTab !== 'i-assigned') {
        setActiveTab('i-assigned');
      }
      
      // Wait for tab switch and tasks to render, then highlight
      if (isAssignedToMe || isAssignedByMe) {
        setTimeout(() => {
          const element = document.getElementById(`task-card-${highlightId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50', 'transition-all');
            
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
              sessionStorage.removeItem('highlight_id');
              sessionStorage.removeItem('highlight_type');
            }, 3000);
          } else {
            // If element not found, clear the session storage to avoid infinite loop
            console.warn('Task card not found for highlight:', highlightId);
            sessionStorage.removeItem('highlight_id');
            sessionStorage.removeItem('highlight_type');
          }
        }, 800); // Increased delay to allow tab switch animation
      }
    }
  }, [myTasks, assignedTasks, activeTab]);

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await taskService.deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
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

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return await taskService.updateTaskStatus(taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      addToast('success', 'Task status updated successfully');
      setUpdatingTaskId(null);
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to update task status';
      addToast('error', errorMessage);
      setUpdatingTaskId(null);
    },
  });

  // Validate task before creation
  const validateTask = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newTask.dueDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Check if date is in the past
    if (selectedDate < today) {
      addToast('error', 'Due date cannot be in the past');
      return false;
    }
    
    // If date is today and time is specified, check if time is in the past
    if (selectedDate.getTime() === today.getTime() && newTask.dueTime) {
      const now = new Date();
      const [hours, minutes] = newTask.dueTime.split(':').map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);
      
      if (selectedTime <= now) {
        addToast('error', 'Due time cannot be in the past. Please select a future time.');
        return false;
      }
    }
    
    return true;
  };

  // Handle time input change with validation
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newTask.dueDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    // If date is today, validate time is not in the past
    if (selectedDate.getTime() === today.getTime() && timeValue) {
      const now = new Date();
      const [hours, minutes] = timeValue.split(':').map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(hours, minutes, 0, 0);
      
      if (selectedTime <= now) {
        addToast('error', 'Cannot select a past time. Please choose a future time.');
        setHasInvalidTime(true);
        return; // Don't update the state
      }
    }
    
    setHasInvalidTime(false);
    setNewTask({ ...newTask, dueTime: timeValue });
  };

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await taskService.createTask(taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      addToast('success', 'Task created successfully');
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        assigneeId: '',
        priority: 'normal',
        dueDate: formatDateInput(tomorrow),
        dueTime: ''
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to create task';
      addToast('error', errorMessage);
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      case 'high': return darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-800';
      case 'normal': return darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
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

  const handleDeleteTask = (task: any) => {
    setDeleteConfirm({
      isOpen: true,
      taskId: task.id,
      taskName: task.title
    });
  };

  const handleDeleteConfirm = () => {
    setDeletingTaskId(deleteConfirm.taskId);
    deleteTaskMutation.mutate(deleteConfirm.taskId);
    setDeleteConfirm({ isOpen: false, taskId: '', taskName: '' });
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId);
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.assigneeId || !newTask.dueDate) {
      addToast('error', 'Please fill in all required fields');
      return;
    }

    // Validate task dates/times
    if (!validateTask()) {
      return;
    }

    // Get current user
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentEmployeeId = currentUser.employee_id || currentUser.id;

    // Check if trying to assign to self
    if (newTask.assigneeId === currentEmployeeId || newTask.assigneeId === currentUser.id) {
      addToast('error', 'Cannot assign tasks to yourself. Please select a different employee.');
      return;
    }

    // Check if trying to assign to superadmin
    const selectedEmployee = employees.find((emp: any) => emp.id === newTask.assigneeId);
    if (selectedEmployee && selectedEmployee.role === 'superadmin') {
      addToast('error', 'Cannot assign tasks to Superadmin. Please select a different employee.');
      return;
    }

    createTaskMutation.mutate({
      ...newTask,
      dueDate: new Date(newTask.dueDate).toISOString()
    });
  };

  const renderTaskCard = (task: any, showProgressControls = false) => {
    const assigneeName = task.assignee_name || 'Unknown Employee';
    const assignedByName = task.assigned_by_name || 'Unknown';
    const taskCreatorId = task.assignedBy || task.assigned_by;
    const taskAssigneeId = task.assigneeId || task.assignee_id;
    const isCreator = taskCreatorId === currentEmployeeId || taskCreatorId === currentUserId;
    const isAssignee = taskAssigneeId === currentEmployeeId || taskAssigneeId === currentUserId;
    
    // Get display names with "You" label
    const displayAssigneeName = getDisplayName(assigneeName, taskAssigneeId, currentUserId, currentEmployeeId);
    const displayAssignedByName = getDisplayName(assignedByName, taskCreatorId, currentUserId, currentEmployeeId);
    
    // Debug logging
    console.log('[TaskCard Debug]', {
      taskId: task.id,
      taskAssigneeId,
      taskCreatorId,
      currentEmployeeId,
      currentUserId,
      isAssignee,
      isCreator,
      showProgressControls,
      status: task.status
    });

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
                onClick={() => handleDeleteTask(task)}
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
                {showProgressControls ? 'Assigned by:' : 'Assigned to:'}
              </span>
              <span className="font-semibold">
                {showProgressControls ? displayAssignedByName : displayAssigneeName}
              </span>
              {((showProgressControls && displayAssignedByName === 'You') || (!showProgressControls && displayAssigneeName === 'You')) && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800'
                }`}>
                  YOU
                </span>
              )}
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

          {/* Progress Controls - only for assignee on "assigned to me" tab */}
          {showProgressControls && isAssignee && task.status !== 'completed' && task.status !== 'cancelled' && (
            <div className="mb-3 flex gap-2 flex-wrap">
              {task.status === 'pending' && (
                <Button
                  onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                  isLoading={updatingTaskId === task.id}
                  disabled={updatingTaskId === task.id}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Task
                </Button>
              )}
              {task.status === 'in_progress' && (
                <>
                  <Button
                    onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                    isLoading={updatingTaskId === task.id}
                    disabled={updatingTaskId === task.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                  <Button
                    onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
                    isLoading={updatingTaskId === task.id}
                    disabled={updatingTaskId === task.id}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className={`flex flex-wrap items-center gap-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Due: {new Date(task.dueDate).toLocaleDateString()}{task.dueTime ? ` at ${task.dueTime}` : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
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

        {/* Superadmin Header with New Task Button */}
        {isSuperAdmin && (
          <div className="mb-6 flex justify-between items-center">
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
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        )}

        {/* New Task Button for other roles with "Tasks I Assigned" tab */}
        {!isEmployee && !isSuperAdmin && activeTab === 'i-assigned' && (
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
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
                {myTasks.map((task) => renderTaskCard(task, true))}
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
                {assignedTasks.map((task) => renderTaskCard(task, false))}
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

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Create New Task
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Title *
                </label>
                <Input
                  id="title"
                  label=""
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Assign to *
                </label>
                <select
                  value={newTask.assigneeId}
                  onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Select employee</option>
                  {employees.map((employee: any) => {
                    const displayName = getDisplayName(
                      employee.full_name,
                      employee.id,
                      currentUserId,
                      currentEmployeeId
                    );
                    const isYou = displayName === 'You';
                    return (
                      <option key={employee.id} value={employee.id}>
                        {isYou ? `${employee.full_name} (YOU - ${employee.role})` : `${employee.full_name} (${employee.role})`}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Due Date *
                </label>
                <Input
                  id="dueDate"
                  label=""
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  min={formatDateInput(new Date())}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Due Time (Optional)
                </label>
                <input
                  id="dueTime"
                  type="time"
                  value={newTask.dueTime}
                  onChange={handleTimeChange}
                  onBlur={(e) => {
                    // Validate on blur as well
                    const timeValue = e.target.value;
                    if (!timeValue) return;
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selectedDate = new Date(newTask.dueDate);
                    selectedDate.setHours(0, 0, 0, 0);
                    
                    if (selectedDate.getTime() === today.getTime()) {
                      const now = new Date();
                      const [hours, minutes] = timeValue.split(':').map(Number);
                      const selectedTime = new Date();
                      selectedTime.setHours(hours, minutes, 0, 0);
                      
                      if (selectedTime <= now) {
                        addToast('error', 'Cannot select a past time. Clearing time field.');
                        setNewTask({ ...newTask, dueTime: '' });
                      }
                    }
                  }}
                  min={newTask.dueDate === formatDateInput(new Date()) ? new Date().toTimeString().slice(0, 5) : undefined}
                  disabled={(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selectedDate = new Date(newTask.dueDate);
                    selectedDate.setHours(0, 0, 0, 0);
                    return selectedDate < today;
                  })()}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selectedDate = new Date(newTask.dueDate);
                    selectedDate.setHours(0, 0, 0, 0);
                    return selectedDate < today ? 'opacity-50 cursor-not-allowed' : '';
                  })()}`}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selectedDate = new Date(newTask.dueDate);
                    selectedDate.setHours(0, 0, 0, 0);
                    return selectedDate < today 
                      ? 'Time input disabled for past dates'
                      : 'Leave empty for end of day (11:59 PM)';
                  })()}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setHasInvalidTime(false);
                }}
                disabled={createTaskMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTask}
                isLoading={createTaskMutation.isPending}
                disabled={createTaskMutation.isPending || hasInvalidTime || !newTask.title || !newTask.assigneeId || !newTask.dueDate}
              >
                Create Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />
      
      {/* Spacer for fixed navbar */}
      <div className="h-20"></div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, taskId: '', taskName: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteConfirm.taskName}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={deletingTaskId === deleteConfirm.taskId}
      />
    </div>
  );
}
