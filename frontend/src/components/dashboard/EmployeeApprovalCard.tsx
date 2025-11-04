import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../ui/Toast';
import { Check, X, Edit2, Save, XCircle } from 'lucide-react';

interface Employee {
  id: string;
  _id?: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  role: 'admin' | 'employee' | 'hr';
  status: 'active' | 'pending' | 'rejected';
  created_at: string;
}

interface EmployeeApprovalCardProps {
  employee: Employee;
  darkMode: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}

export const EmployeeApprovalCard: React.FC<EmployeeApprovalCardProps> = ({
  employee,
  darkMode,
  onApprove,
  onReject
}) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: employee.full_name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    department: employee.department || '',
    role: employee.role,
  });

  const employeeId = employee.id || employee._id;
  
  // Check if employee is already processed (approved or rejected)
  const isProcessed = employee.status === 'active' || employee.status === 'rejected';
  const isPending = employee.status === 'pending';

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put(`/employees/${employeeId}`, editData);
      return response.data;
    },
    onSuccess: () => {
      addToast('success', 'Employee updated successfully');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.message || 'Failed to update employee');
    }
  });

  // Approve employee
  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/employees/${employeeId}/approve`);
      return response.data;
    },
    onSuccess: (data) => {
      addToast('success', `${employee.full_name} has been approved and activated successfully`);
      
      // Send notification to the approved employee
      try {
        api.post('/notifications', {
          user_id: employeeId,
          title: '🎉 Account Approved!',
          message: 'Congratulations! Your employee account has been approved and activated. You can now access all system features.',
          type: 'approval',
          data: JSON.stringify({
            type: 'employee_approved',
            approved_by: 'HR Team',
            approved_at: new Date().toISOString()
          })
        });
      } catch (notificationError) {
        console.warn('Failed to send approval notification:', notificationError);
      }

      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
      queryClient.invalidateQueries({ queryKey: ['pending-employees'] });
      onApprove?.();
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.message || 'Failed to approve employee');
    }
  });

  // Reject employee
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/employees/${employeeId}/reject`);
      return response.data;
    },
    onSuccess: (data) => {
      addToast('success', `${employee.full_name} has been rejected`);
      
      // Send notification to the rejected employee
      try {
        api.post('/notifications', {
          user_id: employeeId,
          title: '❌ Account Application Rejected',
          message: 'We regret to inform you that your employee account application has been rejected. Please contact HR for more information.',
          type: 'rejection',
          data: JSON.stringify({
            type: 'employee_rejected',
            rejected_by: 'HR Team',
            rejected_at: new Date().toISOString()
          })
        });
      } catch (notificationError) {
        console.warn('Failed to send rejection notification:', notificationError);
      }

      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
      queryClient.invalidateQueries({ queryKey: ['pending-employees'] });
      onReject?.();
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.message || 'Failed to reject employee');
    }
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'hr':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className={`rounded-lg shadow-md p-6 border-l-4 transition-all duration-200 ${
      isProcessed 
        ? `border-gray-400 ${darkMode ? 'bg-gray-800/60 opacity-75' : 'bg-gray-50 opacity-80'}` 
        : `border-blue-500 ${darkMode ? 'bg-gray-800' : 'bg-white'}`
    } ${isProcessed ? 'cursor-not-allowed' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {employee.full_name || 'Unknown'}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {employee.email}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(employee.status)}`}>
            {employee.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(employee.role)}`}>
            {employee.role}
          </span>
        </div>
      </div>

      {/* Status Banner for Processed Employees */}
      {isProcessed && (
        <div className={`mb-4 p-3 rounded-lg border-l-4 ${
          employee.status === 'active'
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-red-500 bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-center">
            {employee.status === 'active' ? (
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            )}
            <span className={`font-medium ${
              employee.status === 'active'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {employee.status === 'active' ? 'Employee Approved' : 'Employee Rejected'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${
            employee.status === 'active'
              ? 'text-green-700 dark:text-green-300'
              : 'text-red-700 dark:text-red-300'
          }`}>
            This employee has been {employee.status === 'active' ? 'approved and activated' : 'rejected'}. 
            No further actions are required.
          </p>
        </div>
      )}

      {/* Editable Content */}
      {isEditing && !isProcessed ? (
        <div className="space-y-4 mb-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Full Name
            </label>
            <input
              type="text"
              value={editData.full_name}
              onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Email
            </label>
            <input
              type="email"
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Phone
            </label>
            <input
              type="tel"
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Department
            </label>
            <input
              type="text"
              value={editData.department}
              onChange={(e) => setEditData({ ...editData, department: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Role
            </label>
            <select
              value={editData.role}
              onChange={(e) => setEditData({ ...editData, role: e.target.value as 'admin' | 'employee' | 'hr' })}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Edit Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditData({
                  full_name: employee.full_name || '',
                  email: employee.email || '',
                  phone: employee.phone || '',
                  department: employee.department || '',
                  role: employee.role,
                });
              }}
              className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Phone:</span>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {employee.phone || 'Not provided'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department:</span>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {employee.department || 'Not provided'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Joined:</span>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {new Date(employee.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Only show interactive buttons for pending employees */}
        {isPending ? (
          <>
            <button
              onClick={() => setIsEditing(!isEditing)}
              disabled={isProcessed}
              className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isEditing
                  ? darkMode
                    ? 'bg-gray-700 text-gray-200'
                    : 'bg-gray-200 text-gray-800'
                  : darkMode
                  ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              } ${isProcessed ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Edit2 className="w-4 h-4" />
              {isEditing ? 'Editing' : 'Edit'}
            </button>

            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || isEditing || isProcessed}
              className={`flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                isProcessed ? 'cursor-not-allowed' : ''
              }`}
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending || isEditing || isProcessed}
              className={`flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                isProcessed ? 'cursor-not-allowed' : ''
              }`}
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </>
        ) : (
          /* Read-only status display for processed employees */
          <div className="flex-1 flex items-center justify-center">
            <div className={`flex items-center gap-2 py-2 px-4 rounded-lg font-semibold ${
              employee.status === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {employee.status === 'active' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Approved & Active</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Rejected</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};