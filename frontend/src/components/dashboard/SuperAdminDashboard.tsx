import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { AdminDepartments } from './AdminDepartments';
import { AdminTasks } from './AdminTasks';
import { AdminAttendance } from './AdminAttendance';
import { AdminLeaveRequests } from './AdminLeaveRequests';
import { AdminEmployeeManagement } from './AdminEmployeeManagement';
import { NotificationManager } from '../notifications/NotificationManager';
import { ProfileCompletionModal } from '../profile/ProfileCompletionModal';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { authService } from '../../services/authService';

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
  const { showModal, completionPercentage, closeModal } = useProfileCompletion();
  const currentUser = authService.getCurrentUserFromStorage();
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
  const [employeeStats, setEmployeeStats] = useState({
    total: 0,
    active: 0,
    pending: 0
  });

  useEffect(() => {
    loadPendingApprovals();
    loadEmployeeStats();
    // Set up real-time subscription if needed
    const interval = setInterval(() => {
      loadPendingApprovals();
      loadEmployeeStats();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadEmployeeStats = async () => {
    try {
      const response = await api.get('/employees/stats');
      if (response.data) {
        setEmployeeStats({
          total: response.data.total || 0,
          active: response.data.active || 0,
          pending: response.data.pending || 0
        });
      }
    } catch (error) {
      console.error('Failed to load employee stats:', error);
    }
  };

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
        if (statsResponse?.data?.data) {
          const statsData = statsResponse.data.data;
          setStats({
            totalEmployees: statsData.total || 0,
            admins: statsData.by_role?.admin || 0,
            hrStaff: statsData.by_role?.hr || 0,
            approvalRatio: `${statsData.pending || 0} pending`
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
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Super Admin Dashboard
          </h1>
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



        {/* Employee Role Management - Temporarily Disabled */}
        {/* <section className="mb-8">
          <AdminEmployeeManagement darkMode={darkMode} />
        </section> */}

        {/* Leave Requests Management */}
        <section className="mb-8">
          <AdminLeaveRequests darkMode={darkMode} />
        </section>

        {/* Attendance Management */}
        <section className="mb-8">
          <AdminAttendance darkMode={darkMode} />
        </section>

        {/* Task Management */}
        <section className="mb-8">
          <AdminTasks darkMode={darkMode} />
        </section>

        {/* Department Management */}
        <section className="mb-8">
          <AdminDepartments darkMode={darkMode} />
        </section>

        {/* Footer */}
        <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Notification Manager */}
      <NotificationManager />

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        completionPercentage={completionPercentage}
        isOpen={showModal}
        onClose={closeModal}
        userName={currentUser?.fullName || currentUser?.fullName || 'User'}
      />
    </div>
  );
};

export default SuperAdminDashboard;