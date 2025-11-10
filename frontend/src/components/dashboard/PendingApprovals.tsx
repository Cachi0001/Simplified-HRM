import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Check, Eye } from 'lucide-react';
import api from '../../lib/api';
import { authService } from '../../services/authService';
import { ApprovalModal } from '../employee/ApprovalModal';
import { Employee } from '../../types/employee';

interface PendingApprovalsProps {
  darkMode?: boolean;
}

const fetchPending = async (): Promise<Employee[]> => {
  try {
    const response = await api.get('/employees/pending');
    const employees = response.data.employees || [];
    
    // Filter out admin users and the current admin user
    const currentUser = authService.getCurrentUserFromStorage();
    const filteredEmployees = employees.filter((emp: any) => {
      // Don't show current user
      if (emp.email === currentUser?.email) return false;
      
      // Only superadmin can see superadmin pending approvals
      if (emp.role === 'superadmin' && currentUser?.role !== 'superadmin') return false;
      
      return true;
    });
    
    return filteredEmployees;
  } catch (error) {
    console.error('Failed to fetch pending approvals:', error);
    return [];
  }
};

export function PendingApprovals({ darkMode = false }: PendingApprovalsProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('admin');
  const queryClient = useQueryClient();

  // Get current user role
  useEffect(() => {
    const user = authService.getCurrentUserFromStorage();
    if (user?.role) {
      setCurrentUserRole(user.role);
    }
  }, []);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pending-employees'],
    queryFn: fetchPending,
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ employeeId, role, reason }: { employeeId: string; role: string; reason?: string }) => {
      const response = await api.post(`/employees/${employeeId}/approve-with-role`, {
        role,
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
      setShowApprovalModal(false);
      setSelectedEmployee(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ employeeId, reason }: { employeeId: string; reason: string }) => {
      const response = await api.post(`/employees/${employeeId}/reject`, {
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      queryClient.invalidateQueries({ queryKey: ['employees-management'] });
      setShowApprovalModal(false);
      setSelectedEmployee(null);
    },
  });

  const openEmployeeModal = (employee: Employee) => {
    // Normalize employee data for ApprovalModal
    const normalizedEmployee: Employee = {
      ...employee,
      id: employee.id || employee._id || '',
      hireDate: employee.hireDate || employee.createdAt,
      createdAt: employee.createdAt
    };
    setSelectedEmployee(normalizedEmployee);
    setShowApprovalModal(true);
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
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-200`}>
        <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex flex-col items-center space-y-3">
            <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
              <Check className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <p className="font-medium">No pending approvals</p>
            <p className="text-sm">All staff requests have been processed</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {pending.map((emp) => (
        <div key={emp.id || emp._id} className={`cursor-pointer hover:shadow-md transition-shadow ${darkMode ? 'text-white' : 'text-gray-900'}`} onClick={() => openEmployeeModal(emp)}>
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-200`}>
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
                      openEmployeeModal(emp);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm md:w-auto"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Review & Approve
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ))}

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
}