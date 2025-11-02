import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Plus, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useToast } from '../components/ui/Toast';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { EmployeeCard } from '../components/employee/EmployeeCard';
import { ApprovalModal } from '../components/employee/ApprovalModal';
import Logo from '../components/ui/Logo';
import api from '../lib/api';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'hr' | 'admin' | 'super-admin';
  status: 'active' | 'pending' | 'rejected';
  department?: string;
  hireDate: string;
  createdAt: string;
  profilePicture?: string;
}

interface EmployeeManagementPageProps {
  darkMode?: boolean;
}

export default function EmployeeManagementPage() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: null as string | null,
    status: null as string | null,
    department: null as string | null,
  });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Get current user
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      if (user) {
        // Check if user has permission to access this page
        if (!['hr', 'admin', 'super-admin'].includes(user.role)) {
          setError('Access denied. You do not have permission to view this page.');
          return;
        }
        setCurrentUser(user);
      } else {
        setError('Authentication required');
      }
    } catch (err) {
      console.error('Error getting current user:', err);
      setError('Failed to load user data');
    }
  }, []);

  // Fetch employees data
  const { data: employees = [], isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ['employees-management'],
    queryFn: async () => {
      const response = await api.get('/employees');
      return response.data.data?.employees || [];
    },
    enabled: !!currentUser,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Filter employees based on search and filters
  const filteredEmployees = employees.filter((employee: Employee) => {
    const matchesSearch = !searchQuery || 
      employee.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = !filters.role || employee.role === filters.role;
    const matchesStatus = !filters.status || employee.status === filters.status;
    const matchesDepartment = !filters.department || employee.department === filters.department;

    return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
  });

  // Get unique departments for filter dropdown
  const departments = [...new Set(employees.map((emp: Employee) => emp.department).filter(Boolean))];

  // Handle employee approval
  const handleApproveEmployee = async (employeeId: string, role: string, reason?: string) => {
    try {
      const response = await api.post(`/employees/${employeeId}/approve-with-role`, {
        role,
        reason: reason || 'Approved via Employee Management'
      });

      if (response.data?.status === 'success') {
        addToast('success', `Employee approved successfully with ${role} role`);
        // Invalidate and refetch the employees data
        queryClient.invalidateQueries({ queryKey: ['employees-management'] });
      }
    } catch (error: any) {
      console.error('Failed to approve employee:', error);
      const message = error.response?.data?.message || 'Failed to approve employee';
      addToast('error', message);
      throw error;
    }
  };

  // Handle employee rejection
  const handleRejectEmployee = async (employeeId: string, reason: string) => {
    try {
      const response = await api.post(`/employees/${employeeId}/reject`, {
        reason
      });

      if (response.data?.status === 'success') {
        addToast('success', 'Employee rejected successfully');
        // Invalidate and refetch the employees data
        queryClient.invalidateQueries({ queryKey: ['employees-management'] });
      }
    } catch (error: any) {
      console.error('Failed to reject employee:', error);
      const message = error.response?.data?.message || 'Failed to reject employee';
      addToast('error', message);
      throw error;
    }
  };

  // Open approval modal
  const openApprovalModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsApprovalModalOpen(true);
  };

  // Close approval modal
  const closeApprovalModal = () => {
    setSelectedEmployee(null);
    setIsApprovalModalOpen(false);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo className="h-8 w-auto" />
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Employee Management
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage employees and approvals
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            <NotificationBell darkMode={darkMode} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Employees
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {employees.length}
                </p>
              </div>
              <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <Users className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Active
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {employees.filter((emp: Employee) => emp.status === 'active').length}
                </p>
              </div>
              <div className={`p-2 rounded-full ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <UserCheck className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Pending
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {employees.filter((emp: Employee) => emp.status === 'pending').length}
                </p>
              </div>
              <div className={`p-2 rounded-full ${darkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                <Clock className={`h-4 w-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Filtered
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {filteredEmployees.length}
                </p>
              </div>
              <div className={`p-2 rounded-full ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <Filter className={`h-4 w-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`rounded-lg border p-6 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* Role Filter */}
            <select
              value={filters.role || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value || null }))}
              className={`w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Roles</option>
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
              <option value="super-admin">Super Admin</option>
            </select>

            {/* Status Filter */}
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || null }))}
              className={`w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Department Filter */}
            <select
              value={filters.department || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value || null }))}
              className={`w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || filters.role || filters.status || filters.department) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilters({ role: null, status: null, department: null });
                }}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Employee List */}
        <div className={`rounded-lg border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Employees ({filteredEmployees.length})
            </h2>
            <button
              onClick={() => refetch()}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4`}></div>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className={`mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                {employees.length === 0 ? 'No employees found' : 'No employees match your filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee: Employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  currentUserRole={currentUser.role}
                  onApprove={() => openApprovalModal(employee)}
                  onReject={() => openApprovalModal(employee)}
                  onEdit={(employeeId) => {
                    addToast('info', 'Edit functionality will be implemented in a future task');
                  }}
                  darkMode={darkMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />

      {/* Approval Modal */}
      {selectedEmployee && (
        <ApprovalModal
          employee={selectedEmployee}
          isOpen={isApprovalModalOpen}
          onClose={closeApprovalModal}
          onApprove={handleApproveEmployee}
          onReject={handleRejectEmployee}
          currentUserRole={currentUser.role}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}