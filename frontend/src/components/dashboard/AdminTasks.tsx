import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services/taskService';
import { employeeService } from '../../services/employeeService';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { getDisplayName } from '../../utils/userDisplay';
import { CreateTaskModal, TaskFormData } from '../tasks';
import {
  Plus,
  Search,
  Calendar,
  User,
  Clock,
  CheckCircle,
  Trash2,
  Bell
} from 'lucide-react';

interface AdminTasksProps {
  darkMode?: boolean;
}

export function AdminTasks({ darkMode = false }: AdminTasksProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

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

  // Fetch employees for assignment - Team Leads only see their team
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-tasks'],
    queryFn: async () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await employeeService.getAllEmployees();
      
      // If Team Lead, show their team members + themselves
      if (currentUser.role === 'teamlead') {
        // Use employee_id if available, otherwise use id
        const employeeId = currentUser.employee_id || currentUser.id;
        const teamMembers = response.filter((emp: any) => 
          (emp.team_lead_id === employeeId || emp.manager_id === employeeId) &&
          emp.role === 'employee'
        );
        // Add self to the list
        const self = response.find((emp: any) => 
          emp.id === employeeId || 
          emp.user_id === currentUser.id ||
          emp.id === currentUser.id
        );
        if (self && !teamMembers.find((emp: any) => emp.id === self.id)) {
          teamMembers.unshift(self);
        }
        return teamMembers;
      }
      
      // For HR/Admin/SuperAdmin, show all employees including themselves
      // Only exclude superadmin from being assigned tasks by non-superadmins
      if (currentUser.role === 'superadmin') {
        return response; // Superadmin can assign to anyone
      }
      
      // HR/Admin can assign to anyone except superadmin
      return response.filter((emp: any) => emp.role !== 'superadmin');
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskFormData) => {
      return await taskService.createTask({
        ...taskData,
        dueDate: new Date(taskData.dueDate).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      setShowCreateModal(false);
      addToast('success', 'Task created successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create task';
      addToast('error', errorMessage);
    },
  });

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
      case 'high': 
      case 'urgent': return darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800';
      case 'medium':
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

  const handleCreateTask = (taskData: TaskFormData) => {
    createTaskMutation.mutate(taskData);
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
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

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
            // Use the assignee_name from the database JOIN
            const assigneeName = task.assignee_name || 'Unknown Employee';
            const assignedByName = task.assigned_by_name || 'Unknown';

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
                      <span className="font-semibold">{assigneeName}</span>
                    </div>
                    <div className={`text-xs ml-6 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Created by: {assignedByName}
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

                  {/* Metadata: Dates */}
                  <div className={`flex items-center gap-4 text-xs mb-4 flex-wrap ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}{task.dueTime ? ` at ${task.dueTime}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                      <CheckCircle className="h-3 w-3" />
                      Status: {task.status.replace('_', ' ')}
                    </div>

                    <Button
                      onClick={() => handleDeleteTask(task.id)}
                      isLoading={deleteTaskMutation.isPending}
                      disabled={deleteTaskMutation.isPending}
                      className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white text-xs py-1"
                      title="Delete this task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                      <Clock className="h-3 w-3" />
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
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

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
        employees={employees}
        currentUser={currentUser}
        darkMode={darkMode}
        isSubmitting={createTaskMutation.isPending}
      />
    </div>
  );
}
