import React, { useState, useEffect } from 'react';
import { Employee, Department } from '../../services/employeeService';
import { employeeService } from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';

interface EmployeeEditModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  darkMode: boolean;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSave,
  darkMode
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'status' | 'personal'>('fields');

  useEffect(() => {
    if (employee) {
      setFormData({
        department_id: employee.department_id,
        position: employee.position,
        role: employee.role,
        manager_id: employee.manager_id,
        salary: employee.salary,
        status: employee.status
      });
    }
  }, [employee]);

  useEffect(() => {
    if (isOpen) {
      loadDepartmentsAndManagers();
    }
  }, [isOpen]);

  const loadDepartmentsAndManagers = async () => {
    try {
      const departmentsData = await employeeService.getDepartments();
      setDepartments(departmentsData);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setError('Failed to load departments');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'salary' ? (value ? parseFloat(value) : undefined) : value
    }));
  };

  const handleFieldsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setLoading(true);
    setError(null);

    try {
      const result = await employeeService.updateEmployeeFields(employee.id, {
        department_id: formData.department_id,
        position: formData.position,
        role: formData.role,
        manager_id: formData.manager_id,
        salary: formData.salary
      });

      if (result.success) {
        onSave(result.employee);
        onClose();
      } else {
        setError(result.error || 'Failed to update employee');
      }
    } catch (error) {
      handleError(error, 'update employee fields');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !formData.status) return;

    setLoading(true);
    setError(null);

    try {
      const result = await employeeService.updateEmployeeStatus(employee.id, formData.status);
      if (result.success) {
        onSave(result.employee);
        onClose();
      } else {
        setError(result.error || 'Failed to update employee status');
      }
    } catch (error) {
      handleError(error, 'update employee status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen || !employee) return null;

  // Add error boundary for the modal
  const handleError = (error: any, context: string) => {
    console.error(`EmployeeEditModal ${context}:`, error);
    const errorMessage = error?.response?.data?.message || error?.message || `Failed to ${context}`;
    setError(errorMessage);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-xl font-semibold">Edit Employee</h2>
          <p className={`text-sm mt-1 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Manage {employee.full_name}'s work information
          </p>
        </div>

        {/* Employee Info */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {employee.profile_picture_url ? (
                <img
                  src={employee.profile_picture_url}
                  alt={employee.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-600'
                }`}>
                  {employee.full_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{employee.full_name}</p>
              <p className={`text-sm truncate ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {employee.email}
              </p>
              <p className={`text-xs truncate ${
                darkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                ID: {employee.employee_id}
              </p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status || 'active')}`}>
              {(employee.status || 'active').charAt(0).toUpperCase() + (employee.status || 'active').slice(1)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`px-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('fields')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'fields'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              }`}
            >
              Work Information
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'status'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              }`}
            >
              Status Management
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'personal'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              }`}
            >
              Personal Information
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {activeTab === 'fields' && (
            <form onSubmit={handleFieldsSubmit} className="space-y-4">
              {/* Personal Info Notice */}
              <div className={`p-3 rounded border-l-4 border-blue-400 ${
                darkMode ? 'bg-blue-900 bg-opacity-20' : 'bg-blue-50'
              }`}>
                <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                  <strong>Note:</strong> Personal information (name, email, phone) cannot be edited from this interface for security reasons.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Department
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {Array.isArray(departments) && departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Position */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Position
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="e.g., Software Engineer"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select Role</option>
                    <option value="employee">Employee</option>
                    <option value="teamlead">Team Lead</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                    {user?.role === 'superadmin' && (
                      <option value="superadmin">Super Admin</option>
                    )}
                  </select>
                </div>

                {/* Salary */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Salary
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="e.g., 50000"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 text-sm font-medium rounded-md border ${
                    darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Information'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'status' && (
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Employee Status
                </label>
                <select
                  name="status"
                  value={formData.status || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                  <option value="rejected">Rejected</option>
                </select>
                <p className={`text-xs mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {formData.status === 'active' && 'Employee is active and can access the system'}
                  {formData.status === 'pending' && 'Employee account is pending approval'}
                  {formData.status === 'inactive' && 'Employee is temporarily inactive (account disabled)'}
                  {formData.status === 'rejected' && 'Employee application was rejected'}
                </p>
              </div>

              {/* Warning for status changes */}
              {formData.status !== employee.status && (
                <div className={`p-3 rounded border-l-4 ${
                  formData.status === 'rejected' 
                    ? 'bg-red-50 border-red-400 text-red-700' 
                    : formData.status === 'inactive'
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                    : 'bg-blue-50 border-blue-400 text-blue-700'
                }`}>
                  <p className="text-sm font-medium">
                    {formData.status === 'rejected' && 'Warning: This will reject the employee\'s application.'}
                    {formData.status === 'inactive' && 'This will temporarily disable the employee\'s account.'}
                    {formData.status === 'active' && 'This will enable the employee\'s account.'}
                    {formData.status === 'pending' && 'This will set the employee\'s account to pending approval.'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 text-sm font-medium rounded-md border ${
                    darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    formData.status === 'rejected'
                      ? 'bg-red-600 hover:bg-red-700'
                      : formData.status === 'inactive'
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                  disabled={loading || formData.status === employee.status}
                >
                  {loading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-6">
              {/* Personal Information - Read Only */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  📋 This information is managed by the employee and is read-only for administrators.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Full Name
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.full_name || 'Not provided'}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Email Address
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.email || 'Not provided'}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Phone Number
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.phone || 'Not provided'}
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Date of Birth
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'Not provided'}
                  </div>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Address
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.address || 'Not provided'}
                  </div>
                </div>

                {/* Emergency Contact Name */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Emergency Contact Name
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.emergency_contact_name || 'Not provided'}
                  </div>
                </div>

                {/* Emergency Contact Phone */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Emergency Contact Phone
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.emergency_contact_phone || 'Not provided'}
                  </div>
                </div>

                {/* Hire Date */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Hire Date
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'Not provided'}
                  </div>
                </div>

                {/* Last Updated */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Profile Last Updated
                  </label>
                  <div className={`px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {employee.updated_at ? new Date(employee.updated_at).toLocaleString() : 'Not available'}
                  </div>
                </div>
              </div>

              {/* Profile Completion */}
              {employee.profile_completed !== undefined && (
                <div className={`p-4 rounded-lg border ${
                  employee.profile_completed 
                    ? darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
                    : darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    employee.profile_completed 
                      ? darkMode ? 'text-green-400' : 'text-green-800'
                      : darkMode ? 'text-yellow-400' : 'text-yellow-800'
                  }`}>
                    {employee.profile_completed 
                      ? '✓ Profile is complete' 
                      : '⚠ Profile is incomplete - Employee should update their information'}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 text-sm font-medium rounded-md border ${
                    darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};