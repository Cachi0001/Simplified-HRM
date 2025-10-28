import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../ui/Toast';
import { Check, X, Clock, ChevronDown } from 'lucide-react';

interface LeaveRequest {
  _id: string;
  employee_id: string;
  employeeName?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface AdminLeaveRequestsProps {
  darkMode: boolean;
}

export const AdminLeaveRequests: React.FC<AdminLeaveRequestsProps> = ({ darkMode }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Fetch leave requests
  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['admin-leave-requests'],
    queryFn: async () => {
      const response = await api.get('/leave-requests');
      return response.data.data || response.data || [];
    },
  });

  // Approve leave request
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.put(`/leave-requests/${requestId}`, { status: 'approved' });
      return response.data;
    },
    onSuccess: () => {
      addToast('success', 'Leave request approved');
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.message || 'Failed to approve leave request');
    }
  });

  // Reject leave request
  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.put(`/leave-requests/${requestId}`, { status: 'rejected' });
      return response.data;
    },
    onSuccess: () => {
      addToast('success', 'Leave request rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.message || 'Failed to reject leave request');
    }
  });

  const filteredRequests = leaveRequests.filter((req: LeaveRequest) =>
    filterStatus === 'all' || req.status === filterStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days;
  };

  return (
    <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          📄 Leave Requests
        </h2>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
          {filteredRequests.length}
        </span>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'approved', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className={`inline-block h-8 w-8 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin ${
            darkMode ? 'border-gray-600' : ''
          }`} />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No leave requests found
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request: LeaveRequest) => (
            <div
              key={request._id}
              className={`border rounded-lg overflow-hidden transition-all ${
                darkMode
                  ? 'border-gray-700 bg-gray-700/50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* Request Header */}
              <button
                onClick={() => setExpandedId(expandedId === request._id ? null : request._id)}
                className={`w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity ${
                  darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    request.status === 'approved' ? 'bg-green-100' :
                    request.status === 'rejected' ? 'bg-red-100' :
                    'bg-yellow-100'
                  }`}>
                    {request.status === 'approved' && <Check className="w-5 h-5 text-green-600" />}
                    {request.status === 'rejected' && <X className="w-5 h-5 text-red-600" />}
                    {request.status === 'pending' && <Clock className="w-5 h-5 text-yellow-600" />}
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {request.employeeName || 'Unknown'}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {formatDate(request.start_date)} - {formatDate(request.end_date)} ({getDaysDuration(request.start_date, request.end_date)} days)
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${expandedId === request._id ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Request Details */}
              {expandedId === request._id && (
                <div className={`border-t p-4 ${darkMode ? 'border-gray-600 bg-gray-600/30' : 'border-gray-200 bg-gray-100'}`}>
                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Reason
                    </label>
                    <p className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-800'}`}>
                      {request.reason || 'No reason provided'}
                    </p>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => approveMutation.mutate(request._id)}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(request._id)}
                        disabled={rejectMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};