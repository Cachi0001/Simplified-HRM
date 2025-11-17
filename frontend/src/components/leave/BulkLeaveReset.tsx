import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RefreshCw, AlertTriangle, Users } from 'lucide-react';

interface BulkLeaveResetProps {
  darkMode?: boolean;
}

export function BulkLeaveReset({ darkMode = false }: BulkLeaveResetProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const bulkResetMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/leave/reset-all', { year });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate ALL related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['employee-leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setShowConfirm(false);
      
      const affectedCount = data.data?.affected_count || data.data?.employees_affected || 'All';
      alert(`✅ ${data.message || 'Leave balances reset successfully'}\n${affectedCount} employees' leave balances have been reset to 7 days.`);
    },
    onError: (error: any) => {
      alert(`❌ Failed to reset leave balances: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleBulkReset = () => {
    if (showConfirm) {
      bulkResetMutation.mutate();
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-orange-900/20' : 'bg-orange-100'}`}>
            <Users className={`h-6 w-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Bulk Leave Reset
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Reset all employees' leave balances
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            disabled={showConfirm || bulkResetMutation.isPending}
          >
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
          </select>
        </div>

        {!showConfirm ? (
          <Button
            onClick={handleBulkReset}
            variant="outline"
            className="w-full"
            disabled={bulkResetMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${bulkResetMutation.isPending ? 'animate-spin' : ''}`} />
            Reset All Employees
          </Button>
        ) : (
          <div className="space-y-3">
            <div className={`flex items-start gap-3 p-4 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <AlertTriangle className={`h-6 w-6 flex-shrink-0 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
              <div className={`text-sm ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
                <p className="font-bold mb-1">⚠️ WARNING: Bulk Operation</p>
                <p>This will reset ALL active employees' leave balances to 7 days for {year}.</p>
                <p className="mt-2 font-medium">This action cannot be undone!</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBulkReset}
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700"
                isLoading={bulkResetMutation.isPending}
              >
                Yes, Reset All
              </Button>
              <Button
                onClick={() => setShowConfirm(false)}
                variant="outline"
                className="flex-1"
                disabled={bulkResetMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className={`mt-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>💡 Tip: Use this at the start of a new year to reset everyone's leave balance.</p>
          <p className="mt-1">📧 All employees will be notified of the reset.</p>
        </div>
      </div>
    </Card>
  );
}
