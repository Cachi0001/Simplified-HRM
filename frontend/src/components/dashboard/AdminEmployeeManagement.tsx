import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../ui/Toast';
import { ChevronDown, Users, Check, X } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  role: 'admin' | 'employee' | 'hr';
  status: 'active' | 'pending' | 'rejected';
  created_at: string;
}

interface AdminEmployeeManagementProps {
  darkMode: boolean;
}

export const AdminEmployeeManagement: React.FC<AdminEmployeeManagementProps> = ({ darkMode }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: 'admin' | 'employee' | 'hr' }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'employee' | 'hr'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');

  // Fetch all employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-management'],
    queryFn: async () => {
      const response = await api.get('/employees');
      const employeesData = response.data.data?.employees || [];
      // Validate and normalize employee data
      return employeesData.filter((emp: any) => emp && emp.id).map((emp: any) => ({
        id: emp.id || '',
        full_name: emp.full_name || '',
        email: emp.email || '',
        phone: emp.phone || '',
        department: emp.department || '',
        role: emp.role || 'employee',
        status: emp.status || 'pending',
        created_at: emp.created_at || new Date().toISOString()
      }));
    },
  });

  // Update employee role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ employeeId, newRole }: { employeeId: string; newRole: 'admin' | 'employee' | 'hr' }) => {
      const response = await api.put(`/employees/${employeeId}`, {
        role: newRole
      });
      return response.data;
    },
    onSuccess: (data, { employeeId, newRole }) => {
      addToast('success', `Role updated to ${newRole}`);
      setSelectedRole(prev => {
        const newRoles = { ...prev };
        delete newRoles[employeeId];
        return newRoles;
      });
      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.message || 'Failed to update role');
    }
  });

  // Approve employee mutation
  const approveMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await api.post(`/employees/${employeeId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      addToast('success', 'Employee approved successfully');
      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.message || 'Failed to approve employee');
    }
  });

  // Reject employee mutation
  const rejectMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await api.post(`/employees/${employeeId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      addToast('success', 'Employee rejected');
      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.message || 'Failed to reject employee');
    }
  });

  // Filter and search employees
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter((emp: Employee) => {
      if (!emp || typeof emp !== 'object') return false;
      const fullName = String(emp.full_name || '').toLowerCase();
      const email = String(emp.email || '').toLowerCase();
      const search = String(searchTerm || '').toLowerCase();
      const matchesSearch = fullName.includes(search) || email.includes(search);
      const matchesRole = filterRole === 'all' || emp.role === filterRole;
      const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchTerm, filterRole, filterStatus]);

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
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-20 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6`}>
      {/* Header */}
      <div className="flex items-center space-x-2 mb-6">
        <Users size={24} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
        <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Employee Management
        </h2>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />

        {/* Filter by Role */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className={`px-4 py-2 rounded-lg border ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="hr">HR</option>
          <option value="employee">Employee</option>
        </select>

        {/* Filter by Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className={`px-4 py-2 rounded-lg border ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Results count */}
        <div className={`flex items-center px-4 py-2 rounded-lg ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'}
          </span>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredEmployees.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>No employees found</p>
          </div>
        ) : (
          filteredEmployees.map((employee: Employee) => (
            <div
              key={employee.id}
              className={`rounded-lg border transition-colors ${
                darkMode
                  ? 'border-gray-700 hover:bg-gray-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {/* Main Row */}
              <button
                onClick={() => setExpandedId(expandedId === employee.id ? null : employee.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center space-x-4 flex-1 text-left">
                  <ChevronDown
                    size={20}
                    className={`transform transition-transform ${
                      expandedId === employee.id ? 'rotate-180' : ''
                    } ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  />
                  <div>
                    <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {employee.full_name}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {employee.email}
                    </p>
                  </div>
                </div>

                {/* Role and Status Badges */}
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(employee.role)}`}>
                    {employee.role}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                    {employee.status}
                  </span>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedId === employee.id && (
                <div className={`px-4 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Department
                      </label>
                      <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {employee.department || 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Phone
                      </label>
                      <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {employee.phone || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Current Role
                      </label>
                      <p className={`mt-1 font-semibold capitalize ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {employee.role}
                      </p>
                    </div>
                    <div>
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </label>
                      <p className={`mt-1 font-semibold capitalize ${
                        employee.status === 'active' ? (darkMode ? 'text-green-400' : 'text-green-600') :
                        employee.status === 'pending' ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') :
                        (darkMode ? 'text-red-400' : 'text-red-600')
                      }`}>
                        {employee.status}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 border-t pt-4" style={{ borderTopColor: darkMode ? '#374151' : '#e5e7eb' }}>
                    {/* Pending Approval Actions */}
                    {employee.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMutation.mutate(employee.id)}
                          disabled={approveMutation.isPending}
                          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            approveMutation.isPending
                              ? 'opacity-50 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          <Check size={18} />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(employee.id)}
                          disabled={rejectMutation.isPending}
                          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            rejectMutation.isPending
                              ? 'opacity-50 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          <X size={18} />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}

                    {/* Role Change Section */}
                    <div>
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Change Role To:
                      </label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {(['employee', 'hr', 'admin'] as const).map(role => (
                          <button
                            key={role}
                            onClick={() => setSelectedRole(prev => ({ ...prev, [employee.id]: role }))}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              selectedRole[employee.id] === role
                                ? role === 'admin' ? 'bg-red-600 text-white' :
                                  role === 'hr' ? 'bg-purple-600 text-white' :
                                  'bg-blue-600 text-white'
                                : darkMode
                                ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                          >
                            {role === 'admin' ? '👤 Admin' : role === 'hr' ? '📋 HR' : '👥 Employee'}
                          </button>
                        ))}
                      </div>

                      {selectedRole[employee.id] && (
                        <button
                          onClick={() => updateRoleMutation.mutate({
                            employeeId: employee.id,
                            newRole: selectedRole[employee.id]
                          })}
                          disabled={updateRoleMutation.isPending || selectedRole[employee.id] === employee.role}
                          className={`w-full mt-3 px-4 py-2 rounded-lg font-medium transition-colors ${
                            updateRoleMutation.isPending || selectedRole[employee.id] === employee.role
                              ? 'opacity-50 cursor-not-allowed bg-gray-400 text-gray-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};