import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Building } from 'lucide-react';
import { useToast } from '../ui/Toast';
import api from '../../lib/api';

interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  manager_name?: string;
  employee_count: number;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: string;
  employee_name: string;
  email: string;
  department?: string;
  role: string;
}

interface AdminDepartmentsProps {
  darkMode?: boolean;
  currentUser?: any;
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-lg border shadow-sm ${className}`}>
    {children}
  </div>
);

export const AdminDepartments: React.FC<AdminDepartmentsProps> = ({ darkMode = false, currentUser }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: ''
  });
  const { addToast } = useToast();

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      // Backend returns { success: true, data: [...] }
      setDepartments(response.data.data || response.data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      addToast('error', 'Failed to fetch departments');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      // Backend returns { success: true, data: [...] }
      setEmployees(response.data.data || response.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      addToast('error', 'Department name is required');
      return;
    }

    try {
      if (editingDepartment) {
        // Update department
        const response = await api.put(`/departments/${editingDepartment.id}`, formData);
        if (response.data.success) {
          await fetchDepartments();
          addToast('success', 'Department updated successfully');
        }
      } else {
        // Create department
        const response = await api.post('/departments', formData);
        if (response.data.success) {
          await fetchDepartments();
          addToast('success', 'Department created successfully');
        }
      }
      
      // Reset form
      setFormData({ name: '', description: '', manager_id: '' });
      setIsCreating(false);
      setEditingDepartment(null);
    } catch (error: any) {
      console.error('Error saving department:', error);
      addToast('error', error.response?.data?.message || 'Failed to save department');
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      manager_id: department.manager_id || ''
    });
    setIsCreating(true);
  };

  const handleDelete = async (departmentId: string) => {
    if (!confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      const response = await api.delete(`/departments/${departmentId}`);
      if (response.data.success) {
        await fetchDepartments();
        addToast('success', 'Department deleted successfully');
      }
    } catch (error: any) {
      console.error('Error deleting department:', error);
      addToast('error', error.response?.data?.message || 'Failed to delete department');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', manager_id: '' });
    setIsCreating(false);
    setEditingDepartment(null);
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="animate-pulse">
          <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/4 mb-4`}></div>
          <div className={`h-32 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Department Management
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className={`p-6 mb-6 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {editingDepartment ? 'Edit Department' : 'Create New Department'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Department Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter department name"
                required
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter department description"
                rows={3}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Department Manager
              </label>
              <select
                value={formData.manager_id}
                onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-600 border-gray-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Select a team lead (optional)</option>
                {employees
                  .filter(emp => emp.role === 'employee' || emp.role === 'teamlead')
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_name} ({emp.role})
                    </option>
                  ))
                }
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingDepartment ? 'Update Department' : 'Create Department'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Departments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((department) => (
          <Card key={department.id} className={`p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Building className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {department.name}
                </h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(department)}
                  className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                    darkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Edit department"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(department.id)}
                  className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                    darkMode ? 'text-red-400 hover:bg-red-900' : 'text-red-600 hover:bg-red-100'
                  }`}
                  title="Delete department"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {department.description && (
              <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {department.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  {department.employee_count} employees
                </span>
              </div>
            </div>
            
            {department.manager_name && (
              <div className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>Manager:</strong> {department.manager_name}
              </div>
            )}
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No departments found. Create your first department to get started.</p>
        </div>
      )}
    </div>
  );
};
