import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services/taskService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Check, Clock, AlertCircle, CheckSquare } from 'lucide-react';

interface EmployeeTasksProps {
  employeeId: string;
  darkMode?: boolean;
}

const fetchEmployeeTasks = async (employeeId: string) => {
  try {
    return await taskService.getMyTasks();
  } catch (error) {
    console.error('Failed to fetch employee tasks:', error);
    return [];
  }
};

export function EmployeeTasks({ employeeId, darkMode = false }: EmployeeTasksProps) {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['employee-tasks', employeeId],
    queryFn: () => fetchEmployeeTasks(employeeId),
    refetchInterval: 30000, // Refetch every 30 seconds for realtime updates
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return await taskService.updateTaskStatus(taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks', employeeId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-4 h-20 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded animate-pulse`} />
          </Card>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex flex-col items-center space-y-3">
            <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
              <CheckSquare className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <p className="font-medium">No tasks assigned</p>
            <p className="text-sm">Tasks assigned to you will appear here</p>
          </div>
        </div>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
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

  return (
    <div className="space-y-4">
      {tasks.map((task, index) => (
        <Card key={task.id || `task-${index}`} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4">
            {/* Header: Title + Status Badge */}
            <div className="mb-2 flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`font-semibold text-base mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)} ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {task.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {task.priority && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'high' ? (darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800') :
                      task.priority === 'medium' ? (darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                      (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                    }`}>
                      {task.priority.toUpperCase()} Priority
                    </span>
                  )}
                </div>
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

            {/* Meta Information */}
            <div className={`text-xs mb-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`flex gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                {task.createdAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created: {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons - Progress Update */}
            <div className="flex gap-2 flex-wrap">
              {task.status === 'pending' && (
                <Button
                  onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: 'in_progress' })}
                  disabled={updateTaskStatus.isPending}
                  isLoading={updateTaskStatus.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm"
                  title="Start working on this task"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Start Task
                </Button>
              )}

              {task.status === 'in_progress' && (
                <Button
                  onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: 'completed' })}
                  disabled={updateTaskStatus.isPending}
                  isLoading={updateTaskStatus.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm"
                  title="Mark this task as completed"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Complete Task
                </Button>
              )}

              {task.status === 'completed' && (
                <div className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                  <Check className="h-4 w-4" />
                  Task Completed
                </div>
              )}

              {task.status === 'cancelled' && (
                <div className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  <AlertCircle className="h-4 w-4" />
                  Task Cancelled
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
