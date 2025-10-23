import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services/taskService';
import { employeeService } from '../../services/employeeService';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
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
  Bell
} from 'lucide-react';

interface AdminTasksProps {
  darkMode?: boolean;
}

export function AdminTasks({ darkMode = false }: AdminTasksProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: ''
  });

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Fetch all tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['admin-tasks', searchQuery, statusFilter],
    queryFn: async () => {
      if (searchQuery) {
        return await taskService.searchTasks(searchQuery);
      }
      const response = await taskService.getAllTasks();
      return response.tasks;
    },
  });

  // Fetch employees for assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeeService.getAllEmployees();
      // Filter out admin users for display purposes
      const nonAdminEmployees = response.employees.filter((emp: any) => emp.role !== 'admin');
      return nonAdminEmployees;
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await taskService.createTask(taskData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setShowCreateForm(false);
      setNewTask({ title: '', description: '', assigneeId: '', priority: 'medium', dueDate: '' });
      addToast('success', 'Task created successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.message || 'Failed to create task';
      addToast('error', errorMessage);
    },
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await taskService.updateTaskStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      addToast('success', 'Task status updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to update task status';
      addToast('error', errorMessage);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await taskService.deleteTask(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      addToast('success', 'Task deleted successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to delete task';
      addToast('error', errorMessage);
    },
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

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.assigneeId || !newTask.dueDate) {
      alert('Please fill in all required fields');
      return;
    }

    createTaskMutation.mutate({
      ...newTask,
      dueDate: new Date(newTask.dueDate).toISOString()
    });
  };

  const handleStatusUpdate = (taskId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: taskId, status: newStatus });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Task Management
        </h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
                  id="title"
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
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.department || 'No Department'})
                    </option>
                  ))}
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
                  id="dueDate"
                  label=""
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
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
      <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <Input
                  id="searchInput"
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
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
            const assignedEmployee = employees.find(e => e.id === task.assigneeId);
            return (
              <Card key={task.id || `task-${index}`} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="p-4">
                  {/* Header: Title + Status + Priority */}
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
                  </div>

                  {/* Assignee Section - Prominent */}
                  <div className={`mb-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} border-l-4 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}>
                    <div className={`flex items-center gap-2 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                      <User className="h-4 w-4" />
                      <span className="font-medium">Assigned to:</span>
                      <span className="font-semibold">{assignedEmployee?.fullName || 'Unknown Employee'}</span>
                    </div>
                    {assignedEmployee?.department && (
                      <div className={`text-xs ml-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Department: {assignedEmployee.department}
                      </div>
                    )}
                  </div>

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
                    {/* Status Management - For Admin to see progress */}
                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <div className="flex gap-1">
                        {task.status === 'pending' && (
                          <Button
                            onClick={() => handleStatusUpdate(task.id, 'in_progress')}
                            isLoading={updateStatusMutation.isPending}
                            disabled={updateStatusMutation.isPending || deleteTaskMutation.isPending}
                            className="text-xs py-1"
                          >
                            Mark In Progress
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            onClick={() => handleStatusUpdate(task.id, 'completed')}
                            isLoading={updateStatusMutation.isPending}
                            disabled={updateStatusMutation.isPending || deleteTaskMutation.isPending}
                            className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white text-xs py-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Completion Status Badge */}
                    {task.status === 'completed' && (
                      <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </div>
                    )}

                    {/* Delete Button - Admin only */}
                    <Button
                      onClick={() => handleDeleteTask(task.id)}
                      isLoading={deleteTaskMutation.isPending}
                      disabled={updateStatusMutation.isPending || deleteTaskMutation.isPending}
                      className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white text-xs py-1"
                      title="Delete this task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
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
                {searchQuery ? 'Try a different search term' : 'Create your first task to get started'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
