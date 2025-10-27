import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Check, X, Eye, User } from 'lucide-react';
import { triggerNotification, NotificationUtils } from '../notifications/NotificationManager';
import { notificationService } from '../../services/notificationService';
import api from '../../lib/api';
import { authService } from '../../services/authService';

interface PendingApprovalsProps {
  darkMode?: boolean;
}

interface Employee {
  id: string;
  _id?: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetchPending = async () => {
  try {
    const response = await api.get('/employees/pending');
    const employees = response.data.employees || [];
    
    // Filter out admin users and the current admin user
    const currentUser = authService.getCurrentUserFromStorage();
    const filteredEmployees = employees.filter((emp: Employee) => 
      emp.role === 'employee' && emp.email !== currentUser?.email
    );
    
    return filteredEmployees;
  } catch (error) {
    console.error('Failed to fetch pending approvals:', error);
    return [];
  }
};

export function PendingApprovals({ darkMode = false }: PendingApprovalsProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pending-employees'],
    queryFn: fetchPending,
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const employeeId = employee.id || employee._id;
      if (!employeeId) {
        throw new Error('Employee ID not found');
      }
      const response = await api.post(`/employees/${employeeId}/approve`);
      return { ...response.data, employee };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      setIsModalOpen(false);
      setSelectedEmployee(null);

      // Send approval notification to employee
      if (result.employee) {
        triggerNotification({
          id: `approval-success-${result.employee.id}-${Date.now()}`,
          type: 'approval_success' as any,
          priority: 'normal',
          title: 'Account Approved!',
          message: `Your account has been approved by admin. Welcome to Go3net! Please log in to continue.`,
          timestamp: new Date(),
          read: false,
          targetUserId: result.employee.id,
          actions: [{ label: 'Login', action: 'login', url: '/auth' }],
          source: 'admin',
          category: 'employee'
        });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      const employeeId = employee.id || employee._id;
      if (!employeeId) {
        throw new Error('Employee ID not found');
      }
      await api.post(`/employees/${employeeId}/reject`);
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      setIsModalOpen(false);
      setSelectedEmployee(null);
    },
  });

  const openEmployeeModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
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

  if (pending.length === 0) {
    return (
      <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex flex-col items-center space-y-3">
            <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
              <Check className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <p className="font-medium">No pending approvals</p>
            <p className="text-sm">All employee requests have been processed</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
-        Pending Approvals ({pending.length})
-      </h2>
      {pending.map((emp) => (
        <div key={emp.id || emp._id} className={`cursor-pointer hover:shadow-md transition-shadow ${darkMode ? 'text-white' : 'text-gray-900'}`} onClick={() => openEmployeeModal(emp)}>
          <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center`}>
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {emp.fullName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {emp.fullName}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {emp.email}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Applied {new Date(emp.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Eye className="h-3 w-3" />
                    <span>View Details</span>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:ml-4">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      const employeeId = emp.id || emp._id;
                      if (employeeId) {
                        approveMutation.mutate(emp);
                      }
                    }}
                    disabled={approveMutation.isPending}
                    isLoading={approveMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm md:w-auto"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      const employeeId = emp.id || emp._id;
                      if (employeeId) {
                        rejectMutation.mutate(emp);
                      }
                    }}
                    disabled={rejectMutation.isPending}
                    isLoading={rejectMutation.isPending}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm md:w-auto"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ))}

      {/* Employee Details Modal */}
      {isModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className={`max-w-md w-full mx-4 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Employee Details
                </h3>
                <button
                  onClick={closeModal}
                  className={`text-gray-400 hover:text-gray-600 ${darkMode ? 'text-gray-400 hover:text-gray-200' : ''}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center`}>
                    <User className={`h-6 w-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      fullName: {selectedEmployee.fullName}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedEmployee.email}
                    </p>
                  </div>
                </div>

                <div className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="capitalize">{selectedEmployee.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Department:</span>
                    <span>{selectedEmployee.department || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Position:</span>
                    <span>{selectedEmployee.position || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email Verified:</span>
                    <span className={selectedEmployee.emailVerified ? 'text-green-600' : 'text-red-600'}>
                      {selectedEmployee.emailVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applied:</span>
                    <span>{new Date(selectedEmployee.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}">
                  <Button
                    onClick={() => {
                      const employeeId = selectedEmployee.id || selectedEmployee._id;
                      if (employeeId) {
                        approveMutation.mutate(selectedEmployee);
                      }
                    }}
                    disabled={approveMutation.isPending}
                    isLoading={approveMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white min-h-[40px]"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      const employeeId = selectedEmployee.id || selectedEmployee._id;
                      if (employeeId) {
                        rejectMutation.mutate(selectedEmployee);
                      }
                    }}
                    disabled={rejectMutation.isPending}
                    isLoading={rejectMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white min-h-[40px]"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
