import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../contexts/ThemeContext';
import api from '../lib/api';
import { 
  LeaveRequest, 
  CreateLeaveRequestData, 
  LeaveRequestFormData,
  LeaveRequestResponse,
  transformToBackendFormat,
  transformFromBackendFormat
} from '../types/leave';

export function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
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
      const response = await api.get('/leave-requests');
      const apiResponse = response.data as LeaveRequestResponse;
      
      if (apiResponse.status === 'error') {
        throw new Error(apiResponse.message || 'Failed to fetch leave requests');
      }
      
      const requests = apiResponse.data?.leaveRequests || [];
      
      // Transform data using the proper transformation function
      const transformedRequests = requests.map(transformFromBackendFormat);
      
      setLeaveRequests(transformedRequests);
    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
      addToast('error', error.message || 'Failed to fetch leave requests');
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
      // Transform form data to backend format
      const requestData = transformToBackendFormat(formData);
      // Employee ID will be set by the backend from the authenticated user
      
      const response = await api.post('/leave-requests', requestData);
      const apiResponse = response.data as LeaveRequestResponse;
      
      if (apiResponse.status === 'error') {
        throw new Error(apiResponse.message || 'Failed to create leave request');
      }
      
      const newRequest = apiResponse.data?.leaveRequest;
      if (!newRequest) {
        throw new Error('No leave request data returned');
      }
      
      // Transform response and add to list
      const transformedRequest = transformFromBackendFormat(newRequest);
      setLeaveRequests([transformedRequest, ...leaveRequests]);
      
      // Reset form
      setFormData({ startDate: '', endDate: '', reason: '', type: 'annual', notes: '' });
      setIsCreating(false);
      addToast('success', 'Leave request created successfully');
    } catch (error: any) {
      console.error('Error creating leave request:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create leave request';
      addToast('error', errorMessage);
    }
  };

  const handleDeleteLeaveRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) {
      return;
    }

    try {
      await api.delete(`/leave-requests/${id}`);
      setLeaveRequests(leaveRequests.filter(req => req.id !== id));
      addToast('success', 'Leave request deleted successfully');
    } catch (error: any) {
      console.error('Error deleting leave request:', error);
      addToast('error', 'Failed to delete leave request');
    }
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
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Submit Request
                </button>
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
                    {getStatusIcon(request.status)}
                    <span className={getStatusBadge(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  {currentUser?.role === 'admin' || currentUser?.role === 'hr' ? null : (
                    <button
                      onClick={() => handleDeleteLeaveRequest(request.id)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="Delete request"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {request.type && (
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Type</p>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {request.type.charAt(0).toUpperCase() + request.type.slice(1)} Leave
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Period</p>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(request.start_date).toLocaleDateString()} -{' '}
                      {new Date(request.end_date).toLocaleDateString()}
                      {request.days_requested && (
                        <span className={`ml-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({request.days_requested} days)
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reason</p>
                    <p className={`text-sm line-clamp-3 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{request.reason}</p>
                  </div>

                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Submitted</p>
                    <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}