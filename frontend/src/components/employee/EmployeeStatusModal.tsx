import React, { useState } from 'react';
import { X, Save, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Employee } from '../../services/employeeService';

interface EmployeeStatusModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (employeeId: string, newStatus: string, reason?: string) => Promise<void>;
  darkMode: boolean;
  currentUserRole: string;
}

export const EmployeeStatusModal: React.FC<EmployeeStatusModalProps> = ({
  employee,
  isOpen,
  onClose,
  onStatusUpdate,
  darkMode,
  currentUserRole
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  React.useEffect(() => {
    if (employee) {
      setSelectedStatus(employee.status || 'pending');
      setReason('');
      setError('');
    }
  }, [employee]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const handleSave = async () => {
    if (!employee) return;
    
    if (selectedStatus === employee.status) {
      setError('Please select a different status to update.');
      return;
    }

    if (selectedStatus === 'rejected' && !reason.trim()) {
      setError('Please provide a reason for rejecting this employee.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onStatusUpdate(employee.id, selectedStatus, reason.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen || !employee) return null;

  const hasStatusChanged = selectedStatus !== employee.status;
  const canUpdateStatus = ['superadmin', 'super-admin', 'admin', 'hr'].includes(currentUserRole);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className={`
          inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform
          ${darkMode ? 'bg-gray-800' : 'bg-white'}
          shadow-xl rounded-lg
        `}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <AlertTriangle className={`h-6 w-6 mr-3 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Update Employee Status
              </h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className={`p-2 rounded-lg ${
                darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Employee Info (Read-only) */}
          <div className={`p-4 rounded-lg mb-6 ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-center mb-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gray-600' : 'bg-gray-200'
              }`}>
                {employee.profile_picture ? (
                  <img 
                    src={employee.profile_picture} 
                    alt={employee.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className={`text-lg font-semibold ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {employee.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="ml-3">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {employee.full_name}
                </h4>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {employee.email}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {employee.role} • {employee.department || 'No Department'}
                </p>
              </div>
            </div>
            
            {/* Current Status */}
            <div className="flex items-center">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Current Status:
              </span>
              <div className={`ml-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(employee.status || 'pending')}`}>
                <div className="flex items-center">
                  {getStatusIcon(employee.status || 'pending')}
                  <span className="ml-1 capitalize">{employee.status || 'pending'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Selection */}
          {canUpdateStatus ? (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  New Status
                </label>
                <div className="space-y-2">
                  {['active', 'pending', 'rejected'].map((status) => (
                    <label
                      key={status}
                      className={`
                        flex items-center p-3 rounded-lg border cursor-pointer transition-all
                        ${selectedStatus === status 
                          ? (darkMode ? 'bg-blue-900 border-blue-600' : 'bg-blue-50 border-blue-300')
                          : (darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-300 hover:bg-gray-50')
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={selectedStatus === status}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        {getStatusIcon(status)}
                        <span className={`ml-3 font-medium capitalize ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {status}
                        </span>
                        {status === 'active' && (
                          <span className={`ml-2 text-sm ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            - Employee can access all features
                          </span>
                        )}
                        {status === 'rejected' && (
                          <span className={`ml-2 text-sm ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            - Employee access will be disabled
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reason (required for rejection) */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Reason {selectedStatus === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    selectedStatus === 'rejected' 
                      ? 'Please provide a reason for rejecting this employee...'
                      : 'Optional reason for status change...'
                  }
                  rows={3}
                  className={`
                    w-full px-3 py-2 rounded-lg border resize-none
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-100 border border-red-300 dark:bg-red-900 dark:border-red-700">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-colors
                    ${darkMode 
                      ? 'bg-gray-600 text-white hover:bg-gray-500' 
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading || !hasStatusChanged}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-colors flex items-center
                    ${hasStatusChanged && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Status
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className={`h-12 w-12 mx-auto mb-4 ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <p className={`text-lg font-medium mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Access Denied
              </p>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                You don't have permission to update employee status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};