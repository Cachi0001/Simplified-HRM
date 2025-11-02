import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../contexts/ThemeContext';
import api from '../lib/api';

interface PurchaseRequest {
  id: string;
  userId: string; // Use consistent userId pattern
  itemName: string;
  description: string;
  quantity: number;
  estimatedCost: number;
  totalAmount?: number;
  urgency?: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'purchased';
  createdAt: string;
  updatedAt: string;
  employeeName?: string;
}

export function PurchaseRequestsPage() {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    quantity: 1,
    estimatedCost: 0,
    urgency: 'medium' as 'low' | 'medium' | 'high'
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
    fetchPurchaseRequests();
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchase-requests');
      const requests = response.data.data || response.data;
      
      // Transform data to match our interface
      const transformedRequests = requests.map((req: any) => ({
        id: req.id || req._id,
        userId: req.user_id || req.employee_id,
        itemName: req.item_name || req.itemName,
        description: req.description,
        quantity: req.quantity,
        estimatedCost: req.estimated_cost || req.estimatedCost,
        totalAmount: req.total_amount || req.totalAmount,
        urgency: req.urgency || 'medium',
        status: req.status,
        createdAt: req.created_at || req.createdAt,
        updatedAt: req.updated_at || req.updatedAt,
        employeeName: req.employee_name || req.employeeName
      }));
      
      setPurchaseRequests(transformedRequests);
    } catch (error: any) {
      console.error('Error fetching purchase requests:', error);
      addToast('error', 'Failed to fetch purchase requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePurchaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.itemName || !formData.description || formData.quantity <= 0 || formData.estimatedCost <= 0) {
      addToast('error', 'Please fill all fields correctly');
      return;
    }

    try {
      // Transform data to match backend expectations
      const requestData = {
        item_name: formData.itemName,
        description: formData.description,
        quantity: formData.quantity,
        estimated_cost: formData.estimatedCost,
        urgency: formData.urgency
      };
      
      const response = await api.post('/purchase-requests', requestData);
      const newRequest = response.data.data || response.data;
      
      // Transform response to match our interface
      const transformedRequest = {
        id: newRequest.id || newRequest._id,
        userId: newRequest.user_id || newRequest.employee_id,
        itemName: newRequest.item_name || newRequest.itemName,
        description: newRequest.description,
        quantity: newRequest.quantity,
        estimatedCost: newRequest.estimated_cost || newRequest.estimatedCost,
        urgency: newRequest.urgency,
        status: newRequest.status,
        createdAt: newRequest.created_at || newRequest.createdAt,
        updatedAt: newRequest.updated_at || newRequest.updatedAt
      };
      
      setPurchaseRequests([transformedRequest, ...purchaseRequests]);
      setFormData({ itemName: '', description: '', quantity: 1, estimatedCost: 0, urgency: 'medium' });
      setIsCreating(false);
      addToast('success', 'Purchase request created successfully');
    } catch (error: any) {
      console.error('Error creating purchase request:', error);
      addToast('error', error.response?.data?.message || 'Failed to create purchase request');
    }
  };

  const handleDeletePurchaseRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this purchase request?')) {
      return;
    }

    try {
      await axios.delete(`/api/purchase-requests/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      setPurchaseRequests(purchaseRequests.filter(req => req._id !== id));
      addToast('success', 'Purchase request deleted successfully');
    } catch (error: any) {
      console.error('Error deleting purchase request:', error);
      addToast('error', 'Failed to delete purchase request');
    }
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
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'purchased':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-yellow-100 text-yellow-800`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Purchase Requests</h1>
          </div>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="h-5 w-5" />
              New Purchase Request
            </button>
          )}
        </div>

        {/* Create Form */}
        {isCreating && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Purchase Request</h2>
            <form onSubmit={handleCreatePurchaseRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) =>
                      setFormData({ ...formData, item_name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Office Chair"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the item and its purpose..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Cost
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimated_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
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
                    setFormData({ item_name: '', description: '', quantity: 1, estimated_cost: 0 });
                  }}
                  className="flex-1 bg-gray-300 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
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
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading purchase requests...</p>
          </div>
        ) : purchaseRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No purchase requests found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchaseRequests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6"
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
                      onClick={() => handleDeletePurchaseRequest(request._id)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="Delete request"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Item</p>
                    <p className="text-lg font-semibold text-gray-900">{request.item_name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-sm text-gray-900 line-clamp-3">{request.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="text-sm font-medium text-gray-900">{request.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Est. Cost</p>
                      <p className="text-sm font-medium text-gray-900">
                        ${request.estimated_cost.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Submitted</p>
                    <p className="text-sm text-gray-900">
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