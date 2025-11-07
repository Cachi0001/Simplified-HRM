import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, User, Shield, Users } from 'lucide-react';
import { Employee } from '../../types/employee';

interface RoleOption {
  value: string;
  label: string;
  description: string;
  disabled: boolean;
  reason?: string;
  icon: React.ComponentType<any>;
}

interface ApprovalModalProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (employeeId: string, role: string, reason?: string) => Promise<void>;
  onReject: (employeeId: string, reason: string) => Promise<void>;
  currentUserRole: string;
  darkMode?: boolean;
}

export function ApprovalModal({
  employee,
  isOpen,
  onClose,
  onApprove,
  onReject,
  currentUserRole,
  darkMode = false
}: ApprovalModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>('employee');
  const [approvalReason, setApprovalReason] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Define role permissions based on current user role
  const getRoleOptions = (): RoleOption[] => {
    const baseRoles: RoleOption[] = [
      {
        value: 'employee',
        label: 'Staff',
        description: 'Basic employee access with standard permissions',
        disabled: false,
        icon: User
      },
      {
        value: 'teamlead',
        label: 'Team Lead',
        description: 'Team leadership role with department task assignment permissions',
        disabled: false,
        icon: Users
      },
      {
        value: 'hr',
        label: 'HR',
        description: 'Human Resources role with employee management permissions',
        disabled: false,
        icon: Users
      },
      {
        value: 'admin',
        label: 'Admin',
        description: 'Administrative role with system management permissions',
        disabled: false,
        icon: Shield
      }
    ];

    // Apply permissions based on current user role
    switch (currentUserRole) {
      case 'superadmin':
        // SuperAdmin can assign all roles
        return baseRoles;

      case 'admin':
        // Admin cannot assign admin role
        return baseRoles.map(role => ({
          ...role,
          disabled: role.value === 'admin',
          reason: role.value === 'admin' ? 'Only SuperAdmin can assign Admin roles' : undefined
        }));

      case 'hr':
        // HR can assign employee, teamlead, admin (but not hr to avoid conflicts)
        return baseRoles.filter(role => role.value !== 'hr');

      default:
        // Default to employee only
        return baseRoles.filter(role => role.value === 'employee');
    }
  };

  const roleOptions = getRoleOptions();

  const handleApprove = async () => {
    if (!selectedRole) return;

    setIsApproving(true);
    try {
      await onApprove(employee.id, selectedRole, approvalReason || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to approve employee:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;

    setIsRejecting(true);
    try {
      await onReject(employee.id, rejectionReason);
      onClose();
    } catch (error) {
      console.error('Failed to reject employee:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'superadmin': darkMode ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-100 text-red-800 border-red-300',
      'admin': darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-700' : 'bg-orange-100 text-orange-800 border-orange-300',
      'hr': darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-700' : 'bg-blue-100 text-blue-800 border-blue-300',
      'employee': darkMode ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[role as keyof typeof colors] || (darkMode ? 'bg-gray-900/30 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-300');
  };

  if (!isOpen) return null;

  // Check if current user can approve this employee
  const canApproveEmployee = () => {
    // Only superadmin can approve superadmin employees
    if (employee.role === 'superadmin' && currentUserRole !== 'superadmin') {
      return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-md rounded-lg shadow-xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <div>
            <h2 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Approve Employee
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-md transition-colors ${darkMode
              ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Employee Info */}
        <div className="p-3">
          <div className="flex items-center space-x-2 mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
              <User className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {employee.fullName}
              </h3>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {employee.email}
              </p>
            </div>
          </div>

          {!canApproveEmployee() ? (
            /* Restriction Message */
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Access Restricted</span>
              </div>
              <p className="text-sm mt-1">
                Only superadmin users can approve or reject superadmin employee registrations.
              </p>
            </div>
          ) : !showRejectForm ? (
            <>
              {/* Role Selection */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Assign Role
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {roleOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <div
                        key={option.value}
                        className={`relative rounded-lg border p-3 cursor-pointer transition-all ${option.disabled
                          ? darkMode
                            ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : selectedRole === option.value
                            ? darkMode
                              ? 'border-blue-500 bg-blue-900/20'
                              : 'border-blue-500 bg-blue-50'
                            : darkMode
                              ? 'border-gray-600 hover:border-gray-500'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        onClick={() => !option.disabled && setSelectedRole(option.value)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-md ${selectedRole === option.value
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : darkMode
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-gray-100 text-gray-600'
                            }`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                {option.label}
                              </h4>
                              {selectedRole === option.value && (
                                <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                              {option.description}
                            </p>
                            {option.disabled && option.reason && (
                              <p className="text-xs text-red-500 mt-1 flex items-center space-x-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>{option.reason}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={selectedRole === option.value}
                          onChange={() => !option.disabled && setSelectedRole(option.value)}
                          disabled={option.disabled}
                          className="sr-only"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Approval Reason */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Approval Reason (Optional)
                </label>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  placeholder="Add a note about this approval..."
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleApprove}
                  disabled={isApproving || !selectedRole}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{isApproving ? 'Approving...' : `Approve as ${roleOptions.find(r => r.value === selectedRole)?.label}`}</span>
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={isApproving}
                  className={`px-4 py-2 border rounded-md font-medium transition-colors flex items-center space-x-2 ${darkMode
                    ? 'border-red-600 text-red-400 hover:bg-red-900/20'
                    : 'border-red-600 text-red-600 hover:bg-red-50'
                    }`}
                >
                  <XCircle className="h-4 w-4" />
                  <span>Reject</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Rejection Form */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this employee..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  required
                />
              </div>

              {/* Rejection Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  <XCircle className="h-5 w-5" />
                  <span>{isRejecting ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  disabled={isRejecting}
                  className={`px-6 py-3 border rounded-md font-medium transition-colors ${darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}