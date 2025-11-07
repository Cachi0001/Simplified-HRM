import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useToast } from '../ui/Toast';
import { Users, User, Mail, Calendar, Clock, Building, Shield } from 'lucide-react';
import { ApprovalModal } from '../employee/ApprovalModal';
import { authService } from '../../services/authService';

import { Employee } from '../../types/employee';

interface AdminEmployeeManagementProps {
  darkMode: boolean;
}

export const AdminEmployeeManagement = ({ darkMode }: AdminEmployeeManagementProps) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'employee' | 'hr'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('admin');

  // Get current user role
  useEffect(() => {
    const user = authService.getCurrentUserFromStorage();
    if (user?.role) {
      setCurrentUserRole(user.role);
    }
  }, []);

  // Fetch all employees
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['employees-management'],
    queryFn: async () => {
      try {
        console.log('🔍 Making API call to /employees...');
        console.log('🔑 Auth token:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');
        
        const response = await api.get('/employees?limit=100');
        console.log('📡 API Response received:', {
          status: response.status,
          statusText: response.statusText,
          dataKeys: Object.keys(response.data || {}),
          dataType: typeof response.data,
          isArray: Array.isArray(response.data)
        });
        
        // Log the actual structure
        console.log('📊 Full response.data:', response.data);
      
        // Handle different response structures
        let employeesData = [];
        if (response.data?.data && Array.isArray(response.data.data)) {
          // Standard API format: { status: 'success', data: [...] }
          employeesData = response.data.data;
          console.log('✅ Using response.data.data format');
        } else if (Array.isArray(response.data)) {
          // Direct array format
          employeesData = response.data;
          console.log('✅ Using direct array format');
        } else {
          console.log('❌ Unexpected response format:', response.data);
          employeesData = [];
        }
        
        console.log('📋 Processed employees data:', {
          count: employeesData.length,
          firstEmployee: employeesData[0],
          sample: employeesData.slice(0, 2)
        });
        
        // Validate and normalize employee data
        const normalizedEmployees = employeesData.filter((emp: any) => {
          const hasId = emp && (emp.id || emp._id);
          if (!hasId) {
            console.log('⚠️ Employee missing ID:', emp);
          }
          return hasId;
        }).map((emp: any) => {
          const normalized = {
            id: emp.id || emp._id || '',
            fullName: emp.full_name || emp.fullName || '',
            email: emp.email || '',
            phone: emp.phone || '',
            department: emp.department || '',
            role: emp.role || 'employee',
            status: emp.status || 'pending',
            hireDate: emp.hire_date || emp.hireDate || emp.created_at || emp.createdAt || new Date().toISOString(),
            createdAt: emp.created_at || emp.createdAt || new Date().toISOString(),
            profilePicture: emp.profile_picture || emp.profilePicture || undefined
        };
        console.log('Normalized employee:', { original: emp, normalized });
        return normalized;
      });
      
      console.log('Normalized employees:', normalizedEmployees);
      return normalizedEmployees;
      } catch (apiError) {
        console.error('API call failed:', apiError);
        throw apiError;
      }
    },
    retry: 1,
    staleTime: 0, // Always fetch fresh data for debugging
    onError: (error) => {
      console.error('❌ Employee query failed:', error);
      addToast('error', `Failed to load employees: ${error.message}`);
    },
    onSuccess: (data) => {
      console.log('✅ Employee query succeeded:', { count: data?.length, data });
    }
  });

  // Approve employee with role mutation
  const approveMutation = useMutation({
    mutationFn: async ({ employeeId, role, reason }: { employeeId: string; role: string; reason?: string }) => {
      const response = await api.post(`/employees/${employeeId}/approve-with-role`, {
        role,
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      addToast('success', 'Employee approved successfully');
      setShowApprovalModal(false);
      setSelectedEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.error?.message || error.response?.data?.message || 'Failed to approve employee');
    }
  });

  // Reject employee mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ employeeId, reason }: { employeeId: string; reason: string }) => {
      const response = await api.post(`/employees/${employeeId}/reject`, {
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      addToast('success', 'Employee rejected');
      setShowApprovalModal(false);
      setSelectedEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.error?.message || error.response?.data?.message || 'Failed to reject employee');
    }
  });

  // Filter and search employees - SIMPLIFIED FOR DEBUGGING
  const filteredEmployees = useMemo(() => {
    console.log('=== FILTERING DEBUG ===');
    console.log('Raw employees:', employees);
    console.log('Employees count:', employees?.length);
    console.log('Is array?', Array.isArray(employees));
    
    if (!Array.isArray(employees)) {
      console.log('❌ Employees is not an array, returning empty');
      return [];
    }
    
    if (employees.length === 0) {
      console.log('❌ Employees array is empty');
      return [];
    }
    
    // For debugging, let's just return all employees without filtering
    console.log('✅ Returning all employees for debugging');
    return employees;
    
    // Original filtering logic (commented out for debugging)
    /*
    const filtered = employees.filter((emp: Employee) => {
      if (!emp || typeof emp !== 'object') {
        console.log('Invalid employee object:', emp);
        return false;
      }
      
      const fullName = String(emp.fullName || '').toLowerCase();
      const email = String(emp.email || '').toLowerCase();
      const search = String(searchTerm || '').toLowerCase();
      const matchesSearch = fullName.includes(search) || email.includes(search);
      const matchesRole = filterRole === 'all' || emp.role === filterRole;
      const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
    
    return filtered;
    */
  }, [employees, searchTerm, filterRole, filterStatus]);

  // Handle employee approval
  const handleApprove = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      setShowApprovalModal(true);
    }
  };

  // Handle employee rejection
  const handleReject = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      setShowApprovalModal(true);
    }
  };

  // Handle employee view (opens ApprovalModal for role management)
  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowApprovalModal(true);
  };

  // Get role color styling
  const getRoleColor = (role: string) => {
    const colors = {
      'superadmin': darkMode ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-red-100 text-red-800 border-red-300',
      'admin': darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-700' : 'bg-orange-100 text-orange-800 border-orange-300',
      'hr': darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-700' : 'bg-blue-100 text-blue-800 border-blue-300',
      'teamlead': darkMode ? 'bg-purple-900/30 text-purple-400 border-purple-700' : 'bg-purple-100 text-purple-800 border-purple-300',
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
      case 'superadmin':
      case 'admin':
        return Shield;
      case 'hr':
        return Users;
      case 'teamlead':
        return Users;
      default:
        return User;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
        {filteredEmployees.length === 0 ? (
          <div className={`col-span-full text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>No employees found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          filteredEmployees.map((employee: Employee) => (
            <div
              key={employee.id}
              onClick={() => handleViewEmployee(employee)}
              className={`cursor-pointer rounded-lg border p-6 transition-all duration-200 hover:shadow-md ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Employee Card Content */}
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
              </div>

              {/* Role and Status Badges */}
              <div className="flex items-center space-x-2 mb-4">
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(employee.role)}`}>
                  {(() => {
                    const RoleIcon = getRoleIcon(employee.role);
                    return <RoleIcon className="h-3 w-3" />;
                  })()}
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
                {employee.hireDate && (
                  <div className="flex items-center space-x-1">
                    <Calendar className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Hired: {new Date(employee.hireDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Clock className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Created: {new Date(employee.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Click to view indicator */}
              <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-center`}>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Click to view details and manage role
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approval Modal */}
      {selectedEmployee && (
        <ApprovalModal
          employee={selectedEmployee}
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedEmployee(null);
          }}
          onApprove={async (employeeId: string, role: string, reason?: string) => {
            await approveMutation.mutateAsync({ employeeId, role, reason });
          }}
          onReject={async (employeeId: string, reason: string) => {
            await rejectMutation.mutateAsync({ employeeId, reason });
          }}
          currentUserRole={currentUserRole}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};