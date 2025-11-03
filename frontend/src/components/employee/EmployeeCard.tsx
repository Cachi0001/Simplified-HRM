import React from 'react';
import { User, Mail, Phone, MapPin, Calendar, Settings, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Employee } from '../../services/employeeService';

interface EmployeeCardProps {
  employee: Employee;
  darkMode: boolean;
  isHighlighted: boolean;
  onStatusManage: (employee: Employee) => void;
  onSelect: (employeeId: string, selected: boolean) => void;
  isSelected: boolean;
  currentUserRole: string;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  darkMode,
  isHighlighted,
  onStatusManage,
  onSelect,
  isSelected,
  currentUserRole
}) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'hr':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'teamlead':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'employee':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getWorkTypeColor = (workType: string) => {
    switch (workType) {
      case 'remote':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'hybrid':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'onsite':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div
      id={`employee-${employee.id}`}
      className={`
        relative rounded-lg border p-6 transition-all duration-300 cursor-pointer
        ${darkMode 
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
        }
        ${isHighlighted 
          ? 'ring-2 ring-blue-500 shadow-lg animate-pulse' 
          : 'hover:shadow-md'
        }
        ${isSelected 
          ? 'ring-2 ring-blue-400' 
          : ''
        }
      `}
      onClick={() => onStatusManage(employee)}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-4 right-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(employee.id, e.target.checked);
          }}
          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
      </div>

      {/* Profile Picture */}
      <div className="flex items-center mb-4">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center
          ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}
        `}>
          {employee.profile_picture ? (
            <img
              src={employee.profile_picture}
              alt={employee.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <User className={`h-6 w-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {employee.full_name}
          </h3>
          <div className="flex items-center space-x-2">
            {getStatusIcon(employee.status)}
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {employee.status}
            </span>
          </div>
        </div>
      </div>

      {/* Role and Department */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(employee.role)}`}>
          {employee.role}
        </span>
        {employee.work_type && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWorkTypeColor(employee.work_type)}`}>
            {employee.work_type}
          </span>
        )}
      </div>

      {/* Employee Details */}
      <div className="space-y-2">
        {employee.position && (
          <div className="flex items-center">
            <User className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {employee.position}
            </span>
          </div>
        )}
        
        {employee.department && (
          <div className="flex items-center">
            <MapPin className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {employee.department}
            </span>
          </div>
        )}

        <div className="flex items-center">
          <Mail className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
            {employee.email}
          </span>
        </div>

        {employee.phone && (
          <div className="flex items-center">
            <Phone className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {employee.phone}
            </span>
          </div>
        )}

        {employee.hire_date && (
          <div className="flex items-center">
            <Calendar className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Hired: {new Date(employee.hire_date).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Status Management Button */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {['superadmin', 'super-admin', 'admin', 'hr'].includes(currentUserRole) ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusManage(employee);
            }}
            className={`
              w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium
              ${darkMode 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-orange-600 hover:bg-orange-700 text-white'
              }
              transition-colors duration-200
            `}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Status
          </button>
        ) : (
          <div className={`
            w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium
            ${darkMode 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }
          `}>
            <User className="h-4 w-4 mr-2" />
            View Only
          </div>
        )}
      </div>

      {/* Highlight Effect */}
      {isHighlighted && (
        <div className="absolute inset-0 rounded-lg bg-blue-500 opacity-10 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};