import { useState } from 'react';
import {
  User,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  MoreVertical,
  Shield,
  Users,
  Building
} from 'lucide-react';

interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: 'employee' | 'hr' | 'admin' | 'super-admin';
  status: 'active' | 'pending' | 'rejected';
  department?: string;
  hireDate: string;
  createdAt: string;
  profilePicture?: string;
}

interface EmployeeCardProps {
  employee: Employee;
  currentUserRole: string;
  onApprove?: (employeeId: string) => void;
  onReject?: (employeeId: string) => void;
  onEdit?: (employeeId: string) => void;
  darkMode?: boolean;
}

export function EmployeeCard({
  employee,
  currentUserRole,
  onApprove,
  onReject,
  onEdit,
  darkMode = false
}: EmployeeCardProps) {
  const [showActions, setShowActions] = useState(false);

  const getRoleColor = (role: string) => {
    const colors = {
      'super-admin': darkMode ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-100 text-red-800 border-red-300',
      'admin': darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-700' : 'bg-orange-100 text-orange-800 border-orange-300',
      'hr': darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-700' : 'bg-blue-100 text-blue-800 border-blue-300',
      'employee': darkMode ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[role as keyof typeof colors] || (darkMode ? 'bg-gray-900/30 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-300');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'active': darkMode ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-green-100 text-green-800 border-green-300',
      'pending': darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-700' : 'bg-orange-100 text-orange-800 border-orange-300',
      'rejected': darkMode ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status as keyof typeof colors] || (darkMode ? 'bg-gray-900/30 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-300');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super-admin':
      case 'admin':
        return Shield;
      case 'hr':
        return Users;
      default:
        return User;
    }
  };

  const canApprove = employee.status === 'pending' && ['hr', 'admin', 'super-admin'].includes(currentUserRole);
  const canEdit = ['admin', 'super-admin'].includes(currentUserRole) ||
    (currentUserRole === 'hr' && !['admin', 'super-admin'].includes(employee.role));

  const RoleIcon = getRoleIcon(employee.role);

  return (
    <div className={`rounded-lg border p-6 transition-all duration-200 hover:shadow-md ${
      darkMode 
        ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      {/* Header with Avatar and Actions */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            {employee.profilePicture ? (
              <img
                src={employee.profilePicture}
                alt={employee.fullName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className={`h-6 w-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </div>

          {/* Name and Email */}
          <div>
            <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {employee.fullName}
            </h3>
            <div className="flex items-center space-x-1 text-sm">
              <Mail className={`h-3 w-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {employee.email}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className={`p-2 rounded-md transition-colors ${
              darkMode
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showActions && (
            <div className={`absolute right-0 top-10 w-48 rounded-md shadow-lg border z-10 ${
              darkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}>
              <div className="py-1">
                {canEdit && (
                  <button
                    onClick={() => {
                      onEdit?.(employee.id);
                      setShowActions(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors ${
                      darkMode
                        ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Employee</span>
                  </button>
                )}
                {canApprove && (
                  <>
                    <button
                      onClick={() => {
                        onApprove?.(employee.id);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        onReject?.(employee.id);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm flex items-center space-x-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role and Status Badges */}
      <div className="flex items-center space-x-2 mb-4">
        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(employee.role)}`}>
          <RoleIcon className="h-3 w-3" />
          <span className="capitalize">{employee.role.replace('admin', 'Admin')}</span>
        </div>
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(employee.status)}`}>
          <span className="capitalize">{employee.status}</span>
        </div>
      </div>

      {/* Department */}
      {employee.department && (
        <div className="flex items-center space-x-1 mb-3">
          <Building className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {employee.department}
          </span>
        </div>
      )}

      {/* Join Date and Last Active */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1">
          <Calendar className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Hired: {new Date(employee.hireDate).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Created: {new Date(employee.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Quick Actions for Pending Employees */}
      {canApprove && (
        <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onApprove?.(employee.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center space-x-1"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Approve</span>
          </button>
          <button
            onClick={() => onReject?.(employee.id)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center space-x-1"
          >
            <XCircle className="h-4 w-4" />
            <span>Reject</span>
          </button>
        </div>
      )}

      {/* Click outside to close actions menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}