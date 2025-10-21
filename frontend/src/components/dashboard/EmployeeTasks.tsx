import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Check, Clock, AlertCircle, CheckSquare } from 'lucide-react';

interface EmployeeTasksProps {
  employeeId: string;
  darkMode?: boolean;
}

const fetchEmployeeTasks = async (employeeId: string) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, status, priority, due_date, created_at, assigned_to')
      .eq('assigned_to', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Employee tasks query error:', error);
      throw error;
    }

    return data || [];
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
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
      if (error) throw error;
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
      {tasks.map((task) => (
        <Card key={task.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(task.status)}
                <div className="flex-1">
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)} ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {task.priority && (
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Priority: {task.priority}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {task.status !== 'completed' && (
                  <Button
                    onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: 'completed' })}
                    disabled={updateTaskStatus.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                )}
                {task.status === 'pending' && (
                  <Button
                    onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: 'in_progress' })}
                    disabled={updateTaskStatus.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                  >
                    Start
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
