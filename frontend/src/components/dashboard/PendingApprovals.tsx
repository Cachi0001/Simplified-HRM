import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Check, X } from 'lucide-react';
import { triggerNotification, NotificationUtils } from '../notifications/NotificationManager';
import { notificationService } from '../../services/notificationService';

interface PendingApprovalsProps {
  darkMode?: boolean;
}

const fetchPending = async () => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, email, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Pending approvals query error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch pending approvals:', error);
    // Return empty array for demo purposes when database is not available
    return [];
  }
};

export function PendingApprovals({ darkMode = false }: PendingApprovalsProps) {
  const queryClient = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pending-employees'],
    queryFn: fetchPending,
    refetchInterval: 30000, // Refetch every 30 seconds for realtime updates
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      // First get employee details
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update status to active
      const { error } = await supabase
        .from('employees')
        .update({ status: 'active' })
        .eq('id', id);
      if (error) throw error;

      return employee;
    },
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ['pending-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });

      // Send approval notification to employee
      if (employee) {
        triggerNotification({
          id: `approval-${employee.id}-${Date.now()}`,
          type: 'info' as any,
          priority: 'normal',
          title: 'Account Approved!',
          message: `Your account has been approved by admin. Welcome to Go3net!`,
          timestamp: new Date(),
          read: false,
          targetUserId: employee.id,
          actions: [{ label: 'Login', action: 'login', url: '/auth' }],
          source: 'admin',
          category: 'employee' as any
        });

        // Also send push notification if service is available
        notificationService.sendPushNotification(employee.id, {
          id: `approval-${employee.id}-${Date.now()}`,
          type: 'info' as any,
          priority: 'normal',
          title: 'Account Approved!',
          message: `Your account has been approved. Welcome to Go3net!`,
          timestamp: new Date(),
          read: false,
          targetUserId: employee.id,
          actions: [{ label: 'Login', action: 'login', url: '/auth' }],
          source: 'admin',
          category: 'employee' as any
        });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
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

  if (pending.length === 0) {
    return (
      <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex flex-col items-center space-y-3">
            <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
              <Check className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <p className="font-medium">No pending approvals</p>
            <p className="text-sm">All employee requests have been processed</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((emp) => (
        <Card key={emp.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center`}>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {emp.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {emp.full_name}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {emp.email}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Applied {new Date(emp.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => approveMutation.mutate(emp.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={() => rejectMutation.mutate(emp.id)}
                  disabled={rejectMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
