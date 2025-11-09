import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Check, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import LoadingButton from '../components/ui/LoadingButton';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import api from '../lib/api';
import { 
  LeaveRequest, 
  LeaveRequestFormData,
  LeaveRequestResponse,
  transformToBackendFormat,
  transformFromBackendFormat
} from '../types/leave';
import { safeString, safeNumber, safeDateFormat } from '../utils/safeFormatting';

export function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; requestId: string; requestName: string }>({
    isOpen: false,
    requestId: '',
    requestName: ''
  });
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [formData, setFormData] = useState<LeaveRequestFormData>({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'annual',
    notes: ''
  });

  const navigate = useNavigate();
  const { addToast } = useToast();
  const { darkMode } = useTheme();

  useEffect(() => {
    const user = authService.getCurrentUserFromStorage();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUser(user);
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leave/my-requests');
      
      if (response.data.success) {
        setLeaveRequests(response.data.data || []);
      } else {
        throw new Error('Failed to fetch leave requests');
      }
    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
      addToast('error', error.response?.data?.message || error.message || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate || !formData.reason || !formData.type) {
      addToast('error', 'Please fill all required fields');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      addToast('error', 'End date must be after start date');
      return;
    }

    try {
      setSubmitting(true);
      
      // Transform form data to backend format
      const requestData = transformToBackendFormat(formData);
      // Employee ID will be set by the backend from the authenticated user
      
      const response = await api.post('/leave/request', {
        leaveType: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        notes: formData.notes
      });
      
      if (response.data.success) {
        // Refresh the list
        await fetchLeaveRequests();
      } else {
        throw new Error('Failed to create leave request');
      }
      
      // Reset form
      setFormData({ startDate: '', endDate: '', reason: '', type: 'annual', notes: '' });
      setIsCreating(false);
      addToast('success', 'Leave request created successfully');
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create leave request';
      addToast('error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (request: LeaveRequest) => {
    setDeleteConfirm({
      isOpen: true,
      requestId: request.id,
      requestName: `${safeString(request.type, 'Leave')} leave from ${safeDateFormat(request.start_date)} to ${safeDateFormat(request.end_date)}`
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      const response = await api.delete(`/api/leave/requests/${deleteConfirm.requestId}`);
      
      if (response.data.success) {
        setLeaveRequests(leaveRequests.filter(req => req.id !== deleteConfirm.requestId));
        addToast('success', response.data.message || 'Leave request deleted successfully');
        setDeleteConfirm({ isOpen: false, requestId: '', requestName: '' });
      } else {
        throw new Error('Failed to delete leave request');
      }
    } catch (error: any) {
      console.error('Error deleting leave request:', error);
      addToast('error', error.response?.data?.message || error.message || 'Failed to delete leave request');
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setApproving(requestId);
      const response = await api.put(`/api/leave/requests/${requestId}/approve`, {
        comments: 'Approved via dashboard'
      });
      
      if (response.data.success) {
        // Refresh the list to get updated data
        await fetchLeaveRequests();
        addToast('success', response.data.message || 'Leave request approved successfully');
      } else {
        throw new Error('Failed to approve leave request');
      }
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      addToast('error', error.response?.data?.message || error.message || 'Failed to approve leave request');
    } finally {
      setApproving(null);
    }
  };

  const handleRejectClick = (requestId: string) => {
    setShowRejectModal(requestId);
    setRejectReason('');
  };

  const handleRejectConfirm = async () => {
    if (!showRejectModal || !rejectReason.trim()) {
      addToast('error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setRejecting(showRejectModal);
      const response = await api.put(`/api/leave/requests/${showRejectModal}/reject`, {
        reason: rejectReason
      });
      
      if (response.data.success) {
        // Refresh the list to get updated data
        await fetchLeaveRequests();
        addToast('success', response.data.message || 'Leave request rejected');
        setShowRejectModal(null);
        setRejectReason('');
      } else {
        throw new Error('Failed to reject leave request');
      }
    } catch (error: any) {
      console.error('Error rejecting leave request:', error);
      addToast('error', error.response?.data?.message || error.message || 'Failed to reject leave request');
    } finally {
      setRejecting(null);
    }
  };

  const canApproveReject = (request: LeaveRequest) => {
    return currentUser && 
           ['hr', 'admin', 'superadmin'].includes(currentUser.role) && 
           request.status === 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2';
    switch (status) {
      case 'approved':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-yellow-100 text-yellow-800`;
    }
  };

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Leave Requests</h1>
          </div>
          {!isCreating && currentUser?.role !== 'superadmin' && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="h-5 w-5" />
              New Leave Request
            </button>
          )}
        </div>

        {/* Create Form */}
        {isCreating && (
          <div className={`rounded-lg shadow-md p-6 mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create Leave Request</h2>
            <form onSubmit={handleCreateLeaveRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Leave Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="paternity">Paternity Leave</option>
                    <option value="emergency">Emergency Leave</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Reason *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  rows={3}
                  placeholder="Enter reason for leave..."
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  rows={2}
                  placeholder="Any additional information (optional)..."
                />
              </div>
              <div className="flex gap-2">
                <LoadingButton
                  type="submit"
                  loading={submitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                  loadingText="Submitting..."
                >
                  Submit Request
                </LoadingButton>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({ startDate: '', endDate: '', reason: '', type: 'annual', notes: '' });
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                    darkMode 
                      ? 'bg-gray-600 text-white hover:bg-gray-500' 
                      : 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Leave Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading leave requests...</p>
          </div>
        ) : leaveRequests.length === 0 ? (
          <div className={`text-center py-12 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No leave requests found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaveRequests.map((request) => (
              <div
                key={request.id}
                className={`rounded-lg shadow-md hover:shadow-lg transition p-6 ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(safeString(request.status, 'pending'))}
                    <span className={getStatusBadge(safeString(request.status, 'pending'))}>
                      {safeString(request.status, 'pending').charAt(0).toUpperCase() + safeString(request.status, 'pending').slice(1)}
                    </span>
                  </div>
                  {/* Approve/Reject buttons for HR/Admin/SuperAdmin */}
                  {canApproveReject(request) && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={approving === request.id}
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-green-900 text-green-400 hover:bg-green-800 disabled:bg-gray-700 disabled:text-gray-500' 
                            : 'bg-green-100 text-green-600 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400'
                        }`}
                        title="Approve request"
                      >
                        {approving === request.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectClick(request.id)}
                        disabled={rejecting === request.id}
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                          darkMode 
                            ? 'bg-red-900 text-red-400 hover:bg-red-800 disabled:bg-gray-700 disabled:text-gray-500' 
                            : 'bg-red-100 text-red-600 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400'
                        }`}
                        title="Reject request"
                      >
                        {rejecting === request.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Delete button for request owner */}
                  {(currentUser?.id === request.employee_id && request.status === 'pending') && (
                    <button
                      onClick={() => handleDeleteClick(request)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="Delete request"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {request.employee_name && (
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Employee</p>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {safeString(request.employee_name, 'Unknown Employee')}
                        {request.department && (
                          <span className={`ml-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ({safeString(request.department, 'Unknown Department')})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  
                  {request.type && (
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Type</p>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {safeString(request.type, 'leave').charAt(0).toUpperCase() + safeString(request.type, 'leave').slice(1)} Leave
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Period</p>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {safeDateFormat(request.start_date)} - {safeDateFormat(request.end_date)}
                      {request.days_requested && (
                        <span className={`ml-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({safeNumber(request.days_requested, 0)} days)
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reason</p>
                    <p className={`text-sm line-clamp-3 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{safeString(request.reason, 'No reason provided')}</p>
                  </div>

                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Submitted</p>
                    <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {safeDateFormat(request.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, requestId: '', requestName: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Leave Request"
        message={`Are you sure you want to delete this leave request: ${deleteConfirm.requestName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Reject Leave Request
              </h3>
              <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Please provide a reason for rejecting this leave request:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className={`w-full p-3 border rounded-lg resize-none ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                rows={4}
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectReason('');
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={!rejectReason.trim() || rejecting === showRejectModal}
                  className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {rejecting === showRejectModal ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, requestId: '', requestName: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Leave Request"
        message={`Are you sure you want to delete ${deleteConfirm.requestName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />
      
      {/* Spacer for fixed navbar */}
      <div className="h-20"></div>
    </div>
  );
}