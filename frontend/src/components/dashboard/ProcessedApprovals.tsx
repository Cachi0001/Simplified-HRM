import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Check, XCircle, Eye, Filter, Calendar, User } from 'lucide-react';
import api from '../../lib/api';
import { authService } from '../../services/authService';
import { Employee } from '../../types/employee';

interface ProcessedApprovalsProps {
  darkMode?: boolean;
}

const fetchProcessedEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await api.get('/employees');
    const employees = response.data.employees || [];
    
    // Filter to show only processed employees (approved or rejected)
    const currentUser = authService.getCurrentUserFromStorage();
    const processedEmployees = employees.filter((emp: any) => {
      // Don't show current user
      if (emp.email === currentUser?.email) return false;
      
      // Only show processed employees
      return emp.status === 'active' || emp.status === 'rejected';
    });
    
    return processedEmployees;
  } catch (error) {
    console.error('Failed to fetch processed employees:', error);
    return [];
  }
};

export function ProcessedApprovals({ darkMode = false }: ProcessedApprovalsProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'rejected'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const { data: processedEmployees = [], isLoading } = useQuery({
    queryKey: ['processed-employees'],
    queryFn: fetchProcessedEmployees,
    refetchInterval: 60000, // Refresh every minute
  });

  // Filter employees based on status
  const filteredEmployees = processedEmployees.filter(emp => {
    if (statusFilter === 'all') return true;
    return emp.status === statusFilter;
  });

  const getStatusIcon = (status: string) => {
    return status === 'active' ? (
      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
    );
  };

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

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

  return (
    <div className={`space-y-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Filter Controls */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Processed Employee Applications
            </h3>
            <div className="flex items-center gap-2">
              <Filter className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'rejected')}
                className={`px-3 py-1 rounded border text-sm ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Status</option>
                <option value="active">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Processed
                </span>
                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {processedEmployees.length}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                  Approved
                </span>
                <span className={`font-semibold ${darkMode ? 'text-green-200' : 'text-green-800'}`}>
                  {processedEmployees.filter(emp => emp.status === 'active').length}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                  Rejected
                </span>
                <span className={`font-semibold ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                  {processedEmployees.filter(emp => emp.status === 'rejected').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Processed Employees List */}
      {filteredEmployees.length === 0 ? (
        <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex flex-col items-center space-y-3">
              <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                <User className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <p className="font-medium">No processed applications</p>
              <p className="text-sm">
                {statusFilter === 'all' 
                  ? 'No employee applications have been processed yet'
                  : `No ${statusFilter} employee applications found`
                }
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEmployees.map((emp) => (
            <Card key={emp.id || emp._id} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-200`}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center`}>
                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {emp.fullName?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {emp.fullName}
                        </p>
                        {getStatusIcon(emp.status)}
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {emp.email}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-1`}>
                          <Calendar className="h-3 w-3" />
                          Processed {new Date(emp.updatedAt || emp.createdAt).toLocaleDateString()}
                        </p>
                        {emp.department && (
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {emp.department}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(emp.status)}`}>
                      {emp.status === 'active' ? 'Approved' : 'Rejected'}
                    </span>
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className={`p-2 rounded-md transition-colors ${
                        darkMode 
                          ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                      }`}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-lg shadow-xl ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Employee Details
              </h2>
              <button
                onClick={() => setSelectedEmployee(null)}
                className={`p-2 rounded-md transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center`}>
                  <span className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedEmployee.fullName?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedEmployee.fullName}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedEmployee.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status:</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(selectedEmployee.status)}`}>
                    {selectedEmployee.status === 'active' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Role:</span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {selectedEmployee.role}
                  </span>
                </div>
                {selectedEmployee.department && (
                  <div className="flex justify-between">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department:</span>
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {selectedEmployee.department}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Applied:</span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {new Date(selectedEmployee.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Processed:</span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {new Date(selectedEmployee.updatedAt || selectedEmployee.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}