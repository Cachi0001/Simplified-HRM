import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Check, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { purchaseService, PurchaseRequest, CreatePurchaseRequestData } from '../services/purchaseService';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import LoadingButton from '../components/ui/LoadingButton';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { safeString, safeNumber, formatCurrency, safeDateFormat } from '../utils/safeFormatting';

export function PurchaseRequestsPage() {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
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
  const [formData, setFormData] = useState<CreatePurchaseRequestData>({
    itemName: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    urgency: 'normal',
    vendor: '',
    category: '',
    justification: '',
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
  }, []);

  // Fetch purchase requests after currentUser is set
  useEffect(() => {
    if (currentUser) {
      fetchPurchaseRequests();
    }
  }, [currentUser]);

  // Handle notification highlight
  useEffect(() => {
    const highlightId = sessionStorage.getItem('highlight_id');
    const highlightType = sessionStorage.getItem('highlight_type');
    
    if (highlightId && highlightType === 'approval' && purchaseRequests.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`purchase-card-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50', 'transition-all');
          
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
            sessionStorage.removeItem('highlight_id');
            sessionStorage.removeItem('highlight_type');
          }, 3000);
        } else {
          console.warn('Purchase card not found for highlight_id:', highlightId);
        }
      }, 500);
    }
  }, [purchaseRequests]);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      const requests = currentUser && ['hr', 'admin', 'superadmin'].includes(currentUser.role)
        ? await purchaseService.getAllPurchaseRequests()
        : await purchaseService.getMyPurchaseRequests();
      
      setPurchaseRequests(requests);
    } catch (error: any) {
      console.error('Error fetching purchase requests:', error);
      addToast('error', error.message || 'Failed to fetch purchase requests');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (request: PurchaseRequest) => {
    setDeleteConfirm({
      isOpen: true,
      requestId: request.id,
      requestName: `${safeString(request.item_name, 'Purchase')} - ${formatCurrency(safeNumber(request.total_amount, 0))}`
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      const response = await purchaseService.deletePurchaseRequest(deleteConfirm.requestId);
      
      setPurchaseRequests(purchaseRequests.filter(req => req.id !== deleteConfirm.requestId));
      addToast('success', response.message || 'Purchase request deleted successfully');
      setDeleteConfirm({ isOpen: false, requestId: '', requestName: '' });
    } catch (error: any) {
      console.error('Error deleting purchase request:', error);
      addToast('error', error.message || 'Failed to delete purchase request');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreatePurchaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemName || formData.quantity! <= 0 || formData.unitPrice <= 0) {
      addToast('error', 'Please fill all required fields correctly. Unit price must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await purchaseService.createPurchaseRequest(formData);
      
      addToast('success', response.message || 'Purchase request created successfully');
      
      // Refresh the list
      await fetchPurchaseRequests();
      
      // Reset form
      setFormData({ 
        itemName: '', 
        description: '', 
        quantity: 1, 
        unitPrice: 0, 
        urgency: 'normal',
        vendor: '',
        category: '',
        justification: '',
        notes: ''
      });
      setIsCreating(false);
    } catch (error: any) {
      console.error('Error creating purchase request:', error);
      addToast('error', error.message || 'Failed to create purchase request');
    } finally {
      setSubmitting(false);
    }
  };



  const handleApprove = async (requestId: string) => {
    try {
      setApproving(requestId);
      const response = await purchaseService.approvePurchaseRequest(requestId, 'Approved via dashboard');
      
      // Update the request with the returned data
      setPurchaseRequests(prev => 
        prev.map(req => 
          req.id === requestId ? response.data : req
        )
      );
      
      addToast('success', response.message || 'Purchase request approved successfully');
    } catch (error: any) {
      console.error('Error approving purchase request:', error);
      addToast('error', error.message || 'Failed to approve purchase request');
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
      const response = await purchaseService.rejectPurchaseRequest(showRejectModal, rejectReason);
      
      // Update the request with the returned data
      setPurchaseRequests(prev => 
        prev.map(req => 
          req.id === showRejectModal ? response.data : req
        )
      );
      
      addToast('success', response.message || 'Purchase request rejected');
      setShowRejectModal(null);
      setRejectReason('');
    } catch (error: any) {
      console.error('Error rejecting purchase request:', error);
      addToast('error', error.message || 'Failed to reject purchase request');
    } finally {
      setRejecting(null);
    }
  };

  const canApproveReject = (request: PurchaseRequest) => {
    return currentUser && 
           ['hr', 'admin', 'superadmin'].includes(currentUser.role) && 
           request.status === 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'purchased':
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
        return `${baseClass} ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`;
      case 'purchased':
        return `${baseClass} ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`;
      case 'rejected':
        return `${baseClass} ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`;
      default:
        return `${baseClass} ${darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const baseClass = 'px-2 py-1 rounded text-xs font-medium';
    switch (urgency) {
      case 'urgent':
        return `${baseClass} ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`;
      case 'high':
        return `${baseClass} ${darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800'}`;
      case 'normal':
        return `${baseClass} ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`;
      case 'low':
        return `${baseClass} ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`;
      default:
        return `${baseClass} ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`;
    }
  };

  return (
    <div className={`min-h-screen p-6 transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className={`transition-colors duration-200 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className={`text-3xl font-bold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'
              }`}>
              Purchase Requests
            </h1>
          </div>
          {!isCreating && currentUser?.role !== 'superadmin' && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="h-5 w-5" />
              New Purchase Request
            </button>
          )}
        </div>

        {/* Create Form */}
        {isCreating && (
          <div className={`rounded-lg shadow-lg p-6 mb-8 transition-colors duration-200 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
            <h2 className={`text-xl font-bold mb-4 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'
              }`}>
              Create Purchase Request
            </h2>
            <form onSubmit={handleCreatePurchaseRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) =>
                      setFormData({ ...formData, itemName: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    placeholder="e.g., Office Chair"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  rows={3}
                  placeholder="Describe the item and its purpose..."
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Unit Price (₦) *
                </label>
                <div className="relative">
                  <span className={`absolute left-3 top-3 text-lg font-semibold transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    ₦
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })
                    }
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Urgency Level
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Vendor (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.vendor || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    placeholder="e.g., Office Depot"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    placeholder="e.g., Office Supplies"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Total Amount
                  </label>
                  <div className={`px-4 py-2 border rounded-lg transition-all duration-200 ${darkMode
                    ? 'bg-gray-600 border-gray-600 text-gray-300'
                    : 'bg-gray-100 border-gray-300 text-gray-700'
                    }`}>
                    {formatCurrency(formData.unitPrice * formData.quantity)}
                  </div>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Justification (Optional)
                </label>
                <textarea
                  value={formData.justification || ''}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  rows={2}
                  placeholder="Business justification for this purchase..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <LoadingButton
                  type="submit"
                  loading={submitting}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                  loadingText="Submitting..."
                >
                  Submit Request
                </LoadingButton>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({ 
                      itemName: '', 
                      description: '', 
                      quantity: 1, 
                      unitPrice: 0, 
                      urgency: 'normal',
                      vendor: '',
                      category: '',
                      justification: '',
                      notes: ''
                    });
                  }}
                  className={`flex-1 px-6 py-3 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg ${darkMode
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

        {/* Purchase Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
            <p className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              Loading purchase requests...
            </p>
          </div>
        ) : purchaseRequests.length === 0 ? (
          <div className={`text-center py-12 rounded-lg shadow-md transition-colors duration-200 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
            <p className={`transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              No purchase requests found
            </p>
            <p className={`text-sm mt-2 transition-colors duration-200 ${darkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
              Click "New Purchase Request" to create your first request
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchaseRequests.map((request) => (
              <div
                key={request.id}
                id={`purchase-card-${request.id}`}
                className={`rounded-lg shadow-md hover:shadow-xl transition-all duration-200 p-6 border ${darkMode
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <span className={getStatusBadge(request.status)}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    {request.urgency && (
                      <span className={getUrgencyBadge(request.urgency)}>
                        {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)} Priority
                      </span>
                    )}
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
                  {((currentUser?.id === request.employee_id || currentUser?.employee_id === request.employee_id) && request.status === 'pending') && (
                    <button
                      onClick={() => handleDeleteClick(request)}
                      className={`transition-colors duration-200 ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
                        }`}
                      title="Delete request"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Employee Name - Prominent Display */}
                  {request.employee_name && (
                    <div className={`p-3 rounded-lg border-l-4 ${
                      darkMode 
                        ? 'bg-blue-900/20 border-blue-500' 
                        : 'bg-blue-50 border-blue-500'
                    }`}>
                      <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        Requested by
                      </p>
                      <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {safeString(request.employee_name, 'Unknown Employee')}
                      </p>
                      {request.employee_email && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {request.employee_email}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      Item
                    </p>
                    <p className={`text-lg font-semibold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      {safeString(request.item_name, 'No item name')}
                    </p>
                  </div>

                  <div>
                    <p className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      Description
                    </p>
                    <p className={`text-sm line-clamp-3 transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      {safeString(request.description, 'No description provided')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        Quantity
                      </p>
                      <p className={`text-sm font-semibold transition-colors duration-200 ${darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                        {safeNumber(request.quantity, 0)}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        Total Amount
                      </p>
                      <p className={`text-sm font-semibold transition-colors duration-200 ${darkMode ? 'text-green-400' : 'text-green-600'
                        }`}>
                        {formatCurrency(request.total_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className={`text-sm font-medium transition-colors duration-200 ${darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      Submitted
                    </p>
                    <p className={`text-sm transition-colors duration-200 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      {safeDateFormat(request.created_at, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
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
        title="Delete Purchase Request"
        message={`Are you sure you want to delete this purchase request: ${deleteConfirm.requestName}? This action cannot be undone.`}
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
                Reject Purchase Request
              </h3>
              <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Please provide a reason for rejecting this purchase request:
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
        title="Delete Purchase Request"
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