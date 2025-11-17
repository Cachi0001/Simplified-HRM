import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface LeaveBalanceManagerProps {
  employeeId: string;
  employeeName: string;
  currentBalance: number;
  darkMode?: boolean;
}

export function LeaveBalanceManager({
  employeeId,
  employeeName,
  currentBalance,
  darkMode = false
}: LeaveBalanceManagerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/leave/reset/${employeeId}`, {
        year: new Date().getFullYear()
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate ALL related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setShowConfirm(false);
      
      // Show success message
      alert(`✅ ${data.message || 'Leave balance reset successfully'}`);
    },
    onError: (error: any) => {
      alert(`❌ Failed to reset leave balance: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleReset = () => {
    if (showConfirm) {
      resetMutation.mutate();
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Leave Balance Management
          </h4>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {employeeName}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${currentBalance < 3 ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-green-400' : 'text-green-600')}`}>
            {currentBalance}
          </div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            / 7 days
          </div>
        </div>
      </div>

      {!showConfirm ? (
        <Button
          onClick={handleReset}
          variant="outline"
          className="w-full"
          disabled={resetMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
          Reset to 7 Days
        </Button>
      ) : (
        <div className="space-y-2">
          <div className={`flex items-start gap-2 p-3 rounded ${darkMode ? 'bg-yellow-900/20 text-yellow-200' : 'bg-yellow-50 text-yellow-800'}`}>
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Confirm Reset</p>
              <p>This will reset {employeeName}'s leave balance to 7 days for {new Date().getFullYear()}.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="primary"
              className="flex-1"
              isLoading={resetMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Reset
            </Button>
            <Button
              onClick={() => setShowConfirm(false)}
              variant="outline"
              className="flex-1"
              disabled={resetMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
