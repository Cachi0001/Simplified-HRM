import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Department } from '../../services/employeeService';

interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  departments: Department[];
  darkMode: boolean;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  selectedRole,
  onRoleChange,
  departments,
  darkMode
}) => {
  const roles = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'hr', label: 'HR' },
    { value: 'teamlead', label: 'Team Lead' },
    { value: 'employee', label: 'Staff' }
  ];

  return (
    <div className={`
      rounded-lg border p-4 mb-6
      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
    `}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className={`
              absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4
              ${darkMode ? 'text-gray-400' : 'text-gray-500'}
            `} />
            <input
              type="text"
              placeholder="Search by name, email, or position..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`
                w-full pl-10 pr-4 py-2 rounded-lg border
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              `}
            />
          </div>
        </div>

        {/* Department Filter */}
        <div className="lg:w-48">
          <div className="relative">
            <Filter className={`
              absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4
              ${darkMode ? 'text-gray-400' : 'text-gray-500'}
            `} />
            <select
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className={`
                w-full pl-10 pr-8 py-2 rounded-lg border appearance-none
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              `}
            >
              <option value="">All Departments</option>
              {departments && departments.length > 0 ? departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              )) : (
                <option value="" disabled>No departments available</option>
              )}
            </select>
          </div>
        </div>

        {/* Role Filter */}
        <div className="lg:w-48">
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className={`
              w-full px-4 py-2 rounded-lg border appearance-none
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            `}
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Summary */}
      <div className="mt-3 flex items-center justify-between">
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <span className="flex items-center">
            <Filter className="h-4 w-4 mr-1" />
            Use filters to narrow down the staff list
          </span>
        </div>
      </div>
    </div>
  );
};