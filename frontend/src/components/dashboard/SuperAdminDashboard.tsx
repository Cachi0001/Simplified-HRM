import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';

const logger = console;

interface PendingEmployee {
  id: string;
  employee_id: string;
  employee_name: string;
  email: string;
  current_role: string;
  requested_role?: string;
  status: string;
  requested_at: string;
  department?: string;
}

interface ApprovalHistory {
  id: string;
  employee_id: string;
  old_role: string;
  new_role: string;
  changed_by_name: string;
  changed_by_role: string;
  reason: string;
  created_at: string;
}

interface ApprovalHistoryByEmployee {
  [employeeId: string]: ApprovalHistory[];
}

interface DashboardStats {
  totalEmployees: number;
  admins: number;
  hrStaff: number;
  approvalRatio?: string;
}

interface SuperAdminDashboardProps {
  darkMode?: boolean;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ darkMode = false }) => {
  const [pendingEmployees, setPendingEmployees] = useState<PendingEmployee[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryByEmployee>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: string }>({});
  const [approving, setApproving] = useState<{ [key: string]: boolean }>({});
  const [rejecting, setRejecting] = useState<{ [key: string]: boolean }>({});
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    admins: 0,
    hrStaff: 0,
  });

  useEffect(() => {
    loadPendingApprovals();
    // Set up real-time subscription if needed
    const interval = setInterval(loadPendingApprovals, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      logger.info('[SuperAdminDashboard] Loading pending approvals');
      
      // Use the proper API endpoint with authentication
      const response = await api.get('/employees/pending');
      
      if (response.data?.employees) {
        const employees = response.data.employees;
        setPendingEmployees(employees);
        
        // Calculate stats using proper API endpoint
        const statsResponse = await api.get('/employees/stats').catch(() => null);
        if (statsResponse?.data) {
          setStats({
            totalEmployees: statsResponse.data.total || 0,
            admins: employees.filter((emp: any) => emp.current_role === 'admin').length,
            hrStaff: employees.filter((emp: any) => emp.current_role === 'hr').length,
            approvalRatio: `${employees.length} pending`
          });
        }
        
        // Initialize selected roles with current role as default
        const initialRoles: { [key: string]: string } = {};
        employees.forEach((emp: PendingEmployee) => {
          initialRoles[emp.id] = emp.current_role || 'employee';
        });
        setSelectedRole(initialRoles);
      }
      
      setError(null);
      // Clear success message after 3 seconds
      if (successMessage) {
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load pending approvals';
      logger.error('[SuperAdminDashboard] Error loading approvals:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovalHistory = async (employeeId: string) => {
    try {
      logger.info('[SuperAdminDashboard] Loading approval history for:', employeeId);
      
      const response = await api.get(`/employees/approvals/history?employeeId=${employeeId}`);
      
      if (response.data?.data) {
        setApprovalHistory(prev => ({
          ...prev,
          [employeeId]: response.data.data
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load history';
      logger.error('[SuperAdminDashboard] Error loading history:', message);
    }
  };

  const approveEmployee = async (employeeId: string) => {
    try {
      setApproving(prev => ({ ...prev, [employeeId]: true }));
      
      const role = selectedRole[employeeId] || 'employee';
      const employee = pendingEmployees.find(emp => emp.id === employeeId);
      
      logger.info('[SuperAdminDashboard] Approving employee:', { employeeId, role });
      
      const response = await api.post(
        `/employees/${employeeId}/approve-with-role`,
        { 
          role,
          reason: 'Approved by Super-Admin'
        }
      );

      if (response.data?.status === 'success') {
        logger.info('[SuperAdminDashboard] Employee approved successfully');
        setSuccessMessage(`✓ ${employee?.employee_name} approved with ${role} role`);
        setError(null);
        // Remove from pending list
        setPendingEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        // Reload to see updated data
        await loadPendingApprovals();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve employee';
      logger.error('[SuperAdminDashboard] Error approving:', message);
      setError(message);
      setSuccessMessage(null);
    } finally {
      setApproving(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const rejectEmployee = async (employeeId: string) => {
    try {
      if (!rejectReason[employeeId]) {
        setError('Please provide a reason for rejection');
        return;
      }

      setRejecting(prev => ({ ...prev, [employeeId]: true }));
      
      const employee = pendingEmployees.find(emp => emp.id === employeeId);
      
      logger.info('[SuperAdminDashboard] Rejecting employee:', employeeId);
      
      const response = await api.post(
        `/employees/${employeeId}/reject`,
        { 
          reason: rejectReason[employeeId]
        }
      );

      if (response.data?.status === 'success') {
        logger.info('[SuperAdminDashboard] Employee rejected successfully');
        setSuccessMessage(`✓ ${employee?.employee_name} rejected`);
        setError(null);
        setPendingEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        setRejectReason(prev => ({ ...prev, [employeeId]: '' }));
        await loadPendingApprovals();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject employee';
      logger.error('[SuperAdminDashboard] Error rejecting:', message);
      setError(message);
      setSuccessMessage(null);
    } finally {
      setRejecting(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'super-admin': 'bg-red-100 text-red-800 border-red-300',
      'admin': 'bg-orange-100 text-orange-800 border-orange-300',
      'hr': 'bg-blue-100 text-blue-800 border-blue-300',
      'employee': 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const roleOptions = ['employee', 'hr', 'admin', 'super-admin'];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Super Admin Dashboard
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Complete system overview and management
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Pending Approvals
                </p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {pendingEmployees.length}
                </p>
              </div>
              <div className={`p-3 rounded-full ${darkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                <Clock className={`h-6 w-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Employees
                </p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalEmployees}
                </p>
              </div>
              <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <CheckCircle className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Administrators
                </p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.admins}
                </p>
              </div>
              <div className={`p-3 rounded-full ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <AlertCircle className={`h-6 w-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  HR Staff
                </p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.hrStaff}
                </p>
              </div>
              <div className={`p-3 rounded-full ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <AlertCircle className={`h-6 w-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className={`rounded-lg border p-4 mb-6 flex items-start gap-3 ${
            darkMode 
              ? 'bg-green-900 border-green-700 text-green-100' 
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`rounded-lg border p-4 mb-6 flex items-start gap-3 ${
            darkMode 
              ? 'bg-red-900 border-red-700 text-red-100' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Pending Approvals */}
        <div className={`rounded-lg border p-6 mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Pending Approvals ({pendingEmployees.length})
            </h2>
            <button
              onClick={loadPendingApprovals}
              className={`transition-colors ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              disabled={loading}
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className={`inline-block animate-spin mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={32} />
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Loading pending approvals...</p>
            </div>
          ) : pendingEmployees.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle size={48} className={`mx-auto mb-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>All employees have been approved!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={`rounded-lg border p-5 transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 hover:border-gray-500' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Employee Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {employee.employee_name}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {employee.email}
                      </p>
                      {employee.department && (
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Department: <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{employee.department}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (expandedEmployee === employee.id) {
                          setExpandedEmployee(null);
                        } else {
                          setExpandedEmployee(employee.id);
                          loadApprovalHistory(employee.id);
                        }
                      }}
                      className={`transition-colors ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      {expandedEmployee === employee.id ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>

                  {/* Current Role */}
                  <div className="mb-4">
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current Role:</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(employee.current_role)}`}>
                      {employee.current_role}
                    </span>
                  </div>

                  {/* Role Selection */}
                  <div className="mb-4">
                    <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Select Role for Approval:
                    </label>
                    <select
                      value={selectedRole[employee.id] || 'employee'}
                      onChange={(e) => setSelectedRole(prev => ({ ...prev, [employee.id]: e.target.value }))}
                      className={`w-full rounded px-3 py-2 border transition-colors focus:outline-none ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white hover:border-gray-400 focus:border-blue-400' 
                          : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
                      }`}
                    >
                      {roleOptions.map(role => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Approval History (if expanded) */}
                  {expandedEmployee === employee.id && approvalHistory[employee.id] && (
                    <div className={`mb-4 p-4 rounded border ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500' 
                        : 'bg-gray-100 border-gray-300'
                    }`}>
                      <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Approval History
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {approvalHistory[employee.id].length > 0 ? (
                          approvalHistory[employee.id].map((record) => (
                            <div key={record.id} className={`text-sm border-l-2 pl-3 py-2 ${
                              darkMode 
                                ? 'text-gray-300 border-gray-500' 
                                : 'text-gray-700 border-gray-400'
                            }`}>
                              <p className="font-medium">
                                {record.old_role} → {record.new_role}
                              </p>
                              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                By: {record.changed_by_name} ({record.changed_by_role})
                              </p>
                              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                {new Date(record.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No history available</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason (if rejecting) */}
                  {rejecting[employee.id] && (
                    <div className="mb-4">
                      <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Rejection Reason:
                      </label>
                      <textarea
                        value={rejectReason[employee.id] || ''}
                        onChange={(e) => setRejectReason(prev => ({ ...prev, [employee.id]: e.target.value }))}
                        placeholder="Please provide a reason for rejection..."
                        className={`w-full rounded px-3 py-2 border text-sm transition-colors focus:outline-none ${
                          darkMode 
                            ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-red-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500'
                        }`}
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => approveEmployee(employee.id)}
                      disabled={approving[employee.id] || rejecting[employee.id]}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      {approving[employee.id] ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => rejectEmployee(employee.id)}
                      disabled={approving[employee.id] || (rejecting[employee.id] && !rejectReason[employee.id])}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={18} />
                      {rejecting[employee.id] ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;