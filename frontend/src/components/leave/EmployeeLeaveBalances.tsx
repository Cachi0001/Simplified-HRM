import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card } from '../ui/Card';
import { LeaveBalanceManager } from './LeaveBalanceManager';
import { Users, RefreshCw } from 'lucide-react';

interface EmployeeLeaveBalancesProps {
  darkMode?: boolean;
}

export function EmployeeLeaveBalances({ darkMode = false }: EmployeeLeaveBalancesProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: employees, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['employee-leave-balances'],
    queryFn: async () => {
      const response = await api.get('/employees');
      const employeesData = response.data.data || response.data || [];
      
      // Fetch leave balances for each employee
      const employeesWithBalances = await Promise.all(
        employeesData
          .filter((emp: any) => emp.status === 'active' && emp.role !== 'superadmin')
          .map(async (emp: any) => {
            try {
              const balanceResponse = await api.get(`/leave/balances/${emp.id}`);
              const balances = balanceResponse.data.data || [];
              const annualLeave = balances.find((b: any) => b.leave_type === 'Annual Leave');
              
              return {
                ...emp,
                leaveBalance: annualLeave || { remaining_days: 0, total_days: 7, used_days: 7 }
              };
            } catch (error) {
              return {
                ...emp,
                leaveBalance: { remaining_days: 0, total_days: 7, used_days: 7 }
              };
            }
          })
      );
      
      return employeesWithBalances;
    },
  });

  const filteredEmployees = employees?.filter((emp: any) =>
    emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-900/20' : 'bg-blue-100'}`}>
              <Users className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Employee Leave Balances
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage individual employee leave balances
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            disabled={isFetching}
          >
            <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-24 rounded-lg animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
            ))}
          </div>
        ) : filteredEmployees.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredEmployees.map((employee: any) => (
              <LeaveBalanceManager
                key={employee.id}
                employeeId={employee.id}
                employeeName={employee.fullName}
                currentBalance={employee.leaveBalance?.remaining_days || 0}
                darkMode={darkMode}
              />
            ))}
          </div>
        ) : (
          <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>No employees found</p>
          </div>
        )}
      </div>
    </Card>
  );
}
