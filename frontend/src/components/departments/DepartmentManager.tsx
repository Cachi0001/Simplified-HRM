import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, Users, Search, Building,
  UserPlus, UserMinus, Crown, Send, MessageSquare
} from 'lucide-react';
import { departmentService, Department, CreateDepartmentRequest } from '../../services/departmentService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../ui/Toast';
import { useTheme } from '../../contexts/ThemeContext';
import LoadingButton from '../ui/LoadingButton';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

interface DepartmentManagerProps {
  currentUser?: any;
}

export const DepartmentManager: React.FC<DepartmentManagerProps> = ({ currentUser }) => {
  const { addToast } = useToast();
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'members'>('list');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ isOpen: boolean; department: Department | null }>({
    isOpen: false,
    department: null
  });
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [memberRole, setMemberRole] = useState('member');

  // Form state for creating/editing departments
  const [formData, setFormData] = useState<CreateDepartmentRequest>({
    name: '',
    description: '',
    team_lead_id: '',
    type: 'operational'
  });

  // Fetch departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAllDepartments,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch employees for team lead selection
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-for-departments'],
    queryFn: async () => {
      const response = await employeeService.getAllEmployees();
      return response || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch department members when a department is selected
  const { data: departmentMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['department-members', selectedDepartment?.id],
    queryFn: () => selectedDepartment ? departmentService.getDepartmentMembers(selectedDepartment.id) : Promise.resolve([]),
    enabled: !!selectedDepartment,
    staleTime: 1 * 60 * 1000,
  });

  // Create department mutation
  const createMutation = useMutation({
    mutationFn: departmentService.createDepartment,
    onSuccess: () => {
      addToast('success', 'Department created successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      resetForm();
      setActiveTab('list');
    },
    onError: (error: any) => {
      addToast('error', error.message || 'Failed to create department');
    }
  });

  // Update department mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateDepartmentRequest }) =>
      departmentService.updateDepartment(id, data),
    onSuccess: () => {
      addToast('success', 'Department updated successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      resetForm();
      setActiveTab('list');
    },
    onError: (error: any) => {
      addToast('error', error.message || 'Failed to update department');
    }
  });

  // Delete department mutation
  const deleteMutation = useMutation({
    mutationFn: departmentService.deleteDepartment,
    onSuccess: () => {
      addToast('success', 'Department deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowDeleteConfirm({ isOpen: false, department: null });
    },
    onError: (error: any) => {
      addToast('error', error.message || 'Failed to delete department');
    }
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: ({ departmentId, userId, role }: { departmentId: string; userId: string; role: string }) =>
      departmentService.addDepartmentMember(departmentId, { user_id: userId, role }),
    onSuccess: () => {
      addToast('success', 'Member added successfully');
      queryClient.invalidateQueries({ queryKey: ['department-members', selectedDepartment?.id] });
      setShowMemberModal(false);
      setSelectedEmployee('');
      setMemberRole('member');
    },
    onError: (error: any) => {
      addToast('error', error.message || 'Failed to add member');
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ departmentId, userId }: { departmentId: string; userId: string }) =>
      departmentService.removeDepartmentMember(departmentId, userId),
    onSuccess: () => {
      addToast('success', 'Member removed successfully');
      queryClient.invalidateQueries({ queryKey: ['department-members', selectedDepartment?.id] });
    },
    onError: (error: any) => {
      addToast('error', error.message || 'Failed to remove member');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      team_lead_id: '',
      type: 'operational'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast('error', 'Department name is required');
      return;
    }

    if (selectedDepartment) {
      updateMutation.mutate({ id: selectedDepartment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (department: Department) => {
    setFormData({
      name: department.name,
      description: department.description || '',
      team_lead_id: department.team_lead_id || '',
      type: department.type || 'operational'
    });
    setSelectedDepartment(department);
    setActiveTab('create');
  };

  const handleDelete = (department: Department) => {
    setShowDeleteConfirm({ isOpen: true, department });
  };

  const confirmDelete = () => {
    if (showDeleteConfirm.department) {
      deleteMutation.mutate(showDeleteConfirm.department.id);
    }
  };

  const handleViewMembers = (department: Department) => {
    setSelectedDepartment(department);
    setActiveTab('members');
  };

  const handleAddMember = () => {
    if (!selectedDepartment || !selectedEmployee) {
      addToast('error', 'Please select an employee');
      return;
    }

    addMemberMutation.mutate({
      departmentId: selectedDepartment.id,
      userId: selectedEmployee,
      role: memberRole
    });
  };

  const handleRemoveMember = (userId: string) => {
    if (!selectedDepartment) return;

    removeMemberMutation.mutate({
      departmentId: selectedDepartment.id,
      userId
    });
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableEmployees = employees.filter(emp =>
    !departmentMembers.some(member => member.user_id === emp.id)
  );

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Department Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm();
              setSelectedDepartment(null);
              setActiveTab('create');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Department
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {[
          { id: 'list', label: 'Departments', icon: Building },
          { id: 'create', label: selectedDepartment ? 'Edit Department' : 'Create Department', icon: Plus },
          { id: 'members', label: 'Members', icon: Users, disabled: !selectedDepartment }
        ].map(({ id, label, icon: Icon, disabled }) => (
          <button
            key={id}
            onClick={() => !disabled && setActiveTab(id as any)}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${activeTab === id
              ? darkMode
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-blue-600 border-b-2 border-blue-600'
              : disabled
                ? darkMode
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 cursor-not-allowed'
                : darkMode
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
            />
          </div>

          {/* Departments List */}
          {departmentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading departments...
              </p>
            </div>
          ) : filteredDepartments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map((department) => (
                <div
                  key={department.id}
                  className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    } hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {department.name}
                      </h3>
                      {department.description && (
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {department.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(department)}
                        className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(department)}
                        className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                          }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {department.team_lead_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Crown className="w-3 h-3 text-yellow-500" />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {department.team_lead_name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-3 h-3" />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {department.member_count || 0} members
                      </span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleViewMembers(department)}
                        className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        View Members
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {searchQuery ? 'No departments found matching your search' : 'No departments found'}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Department Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                placeholder="Enter department name..."
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Department Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
                  }`}
              >
                <option value="operational">Operational</option>
                <option value="support">Support</option>
                <option value="management">Management</option>
                <option value="technical">Technical</option>
                <option value="creative">Creative</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              placeholder="Enter department description..."
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
              Team Lead (Optional)
            </label>
            <select
              value={formData.team_lead_id}
              onChange={(e) => setFormData(prev => ({ ...prev, team_lead_id: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
                }`}
            >
              <option value="">Select team lead...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <LoadingButton
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              loadingText={selectedDepartment ? "Updating..." : "Creating..."}
            >
              {selectedDepartment ? 'Update Department' : 'Create Department'}
            </LoadingButton>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setSelectedDepartment(null);
                setActiveTab('list');
              }}
              className={`flex-1 px-6 py-2 rounded-lg transition-colors ${darkMode
                ? 'bg-gray-600 text-white hover:bg-gray-500'
                : 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                }`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {activeTab === 'members' && selectedDepartment && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              {selectedDepartment.name} - Members
            </h3>
            <button
              onClick={() => setShowMemberModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          </div>

          {membersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading members...
              </p>
            </div>
          ) : departmentMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentMembers.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {member.user_name}
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {member.role}
                      </p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Joined: {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={removeMemberMutation.isPending}
                      className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                        } disabled:opacity-50`}
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                No members in this department yet
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add Member to {selectedDepartment?.name}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                >
                  <option value="">Select employee...</option>
                  {availableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                    }`}
                >
                  <option value="member">Member</option>
                  <option value="lead">Lead</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="coordinator">Coordinator</option>
                </select>
              </div>
            </div>

            <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex gap-3`}>
              <LoadingButton
                onClick={handleAddMember}
                loading={addMemberMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                loadingText="Adding..."
              >
                Add Member
              </LoadingButton>
              <button
                onClick={() => {
                  setShowMemberModal(false);
                  setSelectedEmployee('');
                  setMemberRole('member');
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${darkMode
                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                  : 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                  }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm.isOpen}
        onClose={() => setShowDeleteConfirm({ isOpen: false, department: null })}
        onConfirm={confirmDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${showDeleteConfirm.department?.name}"? This action cannot be undone and will remove all members from the department.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};