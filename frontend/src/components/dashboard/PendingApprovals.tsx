import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Check } from 'lucide-react';
import api from '../../lib/api';
import { authService } from '../../services/authService';
import { EmployeeCard } from '../employee/EmployeeCard';
import { EmployeeEditModal } from '../employee/EmployeeEditModal';
import { Employee } from '../../services/employeeService';

interface PendingApprovalsProps {
  darkMode?: boolean;
}

const fetchInactiveEmployees = async (): Promise<Employee[]> => {
  try {
    // Fetch pending employees specifically
    console.log('🔍 Fetching pending employees for approvals...');
    const response = await api.get('/employees/pending');
    const allEmployees = response.data.employees || response.data.data || [];
    
    console.log('📊 Total pending employees fetched:', allEmployees.length);
    
    // Filter out current user and apply role restrictions
    const currentUser = authService.getCurrentUserFromStorage();
    const filteredEmployees = allEmployees.filter((emp: any) => {
      // Don't show current user
      if (emp.email === currentUser?.email) return false;
      
      // Only superadmin can see superadmin pending approvals
      if (emp.role === 'superadmin' && currentUser?.role !== 'superadmin') return false;
      
      return true;
    });
    
    console.log('✅ Pending employees to show:', filteredEmployees.length);
    return filteredEmployees;
  } catch (error) {
    console.error('Failed to fetch inactive employees:', error);
    return [];
  }
};

export function PendingApprovals({ darkMode = false }: PendingApprovalsProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('admin');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('');
  const queryClient = useQueryClient();

  // Get current user info
  useEffect(() => {
    const user = authService.getCurrentUserFromStorage();
    if (user) {
      setCurrentUserRole(user.role || 'admin');
      setCurrentUserId(user.id || '');
      setCurrentEmployeeId(user.employeeId || '');
    }
  }, []);

  const { data: inactiveEmployees = [], isLoading } = useQuery({
    queryKey: ['inactive-employees'],
    queryFn: fetchInactiveEmployees,
    refetchInterval: 30000,
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const response = await api.put(`/employees/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inactive-employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowEditModal(false);
      setSelectedEmployee(null);
    },
  });

  const handleStatusManage = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (employee: Employee) => {
    // EmployeeEditModal will call this with the full employee object
    // We need to extract id and data
    const { id, ...data } = employee;
    await updateEmployeeMutation.mutateAsync({ id, data });
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

  if (inactiveEmployees.length === 0) {
    return (
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-200`}>
        <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex flex-col items-center space-y-3">
            <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
              <Check className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <p className="font-medium">No pending approvals</p>
            <p className="text-sm">All staff have been activated</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inactiveEmployees.map((emp) => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            darkMode={darkMode}
            isHighlighted={false}
            onStatusManage={handleStatusManage}
            onSelect={() => {}} // No selection needed in pending approvals
            isSelected={false}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            currentEmployeeId={currentEmployeeId}
          />
        ))}
      </div>

      {/* Edit Modal for status updates */}
      {selectedEmployee && showEditModal && (
        <EmployeeEditModal
          employee={selectedEmployee}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEmployee(null);
          }}
          onSave={handleUpdateEmployee}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}