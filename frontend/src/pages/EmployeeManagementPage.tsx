import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Search, Filter, X, Moon, Sun } from 'lucide-react';
import { Employee, Department, employeeService } from '../services/employeeService';
import { EmployeeCard } from '../components/employee/EmployeeCard';
import { EmployeeEditModal } from '../components/employee/EmployeeEditModal';
import { SearchAndFilters } from '../components/employee/SearchAndFilters';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/ui/Logo';

export const EmployeeManagementPage: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Modal and selection states
  const [showEditModal, setShowEditModal] = useState(false);
  const [managingEmployee, setManagingEmployee] = useState<Employee | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Highlighting from notifications
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState<string | null>(null);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Check authorization
  useEffect(() => {
    const authorizedRoles = ['superadmin', 'admin', 'hr'];
    if (!user || !authorizedRoles.includes(user.role)) {
      navigate('/dashboard', {
        replace: true,
        state: { error: 'You do not have permission to access employee management.' }
      });
      return;
    }
  }, [user, navigate]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Handle highlighting from notifications
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setHighlightedEmployeeId(highlightId);
      // Remove highlight after 5 seconds
      setTimeout(() => {
        setHighlightedEmployeeId(null);
      }, 5000);

      // Scroll to highlighted employee after data loads
      setTimeout(() => {
        const element = document.getElementById(`employee-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [searchParams, employees]);

  // Filter employees when search/filter criteria change
  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, selectedDepartment, selectedRole]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [employeesData, departmentsData] = await Promise.all([
        employeeService.getAllEmployees(),
        employeeService.getDepartments().catch(err => {
          console.error('Failed to load departments:', err);
          return []; // Return empty array if departments fail to load
        })
      ]);

      // Normalize employees to ensure they have an id field
      const normalizedEmployees = employeesData.map(emp => ({
        ...emp,
        id: emp.id || (emp as any)._id || (emp as any).employee_id || ''
      })).filter(emp => emp.id); // Filter out any without valid ID

      setEmployees(normalizedEmployees);
      setDepartments(departmentsData || []);
    } catch (err) {
      setError('Failed to load employee data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.full_name.toLowerCase().includes(term) ||
        emp.email.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (selectedDepartment) {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }

    // Role filter
    if (selectedRole) {
      filtered = filtered.filter(emp => emp.role === selectedRole);
    }

    setFilteredEmployees(filtered);
  };

  const handleManageEmployeeStatus = (employee: Employee) => {
    setManagingEmployee(employee);
    setShowEditModal(true);
  };

  const handleEmployeeUpdate = (updatedEmployee: Employee) => {
    // Validate the updated employee has required fields
    if (!updatedEmployee || !updatedEmployee.id) {
      console.error('Invalid employee data received:', updatedEmployee);
      setShowEditModal(false);
      setManagingEmployee(null);
      // Reload employees to ensure data consistency
      loadData();
      return;
    }

    // Update local state with the updated employee data
    setEmployees(prev =>
      prev.map(emp => {
        // Safety check: ensure emp exists and has an id
        if (!emp || !emp.id) {
          console.warn('Found invalid employee in list:', emp);
          return emp; // Keep the invalid entry for now
        }
        return emp.id === updatedEmployee.id ? updatedEmployee : emp;
      }).filter(emp => emp && emp.id) // Remove any invalid entries
    );

    setShowEditModal(false);
    setManagingEmployee(null);
    
    // Show success message
    console.log('Employee updated successfully');
  };

  const handleSelectEmployee = (employeeId: string, selected: boolean) => {
    if (selected) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedRole('');
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center h-64">
          <div className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <p className="text-lg mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className={`mr-4 p-2 rounded-lg ${darkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <Logo className="h-8 w-8" />

              <div className="flex items-center ml-4">
                <Users className={`h-8 w-8 mr-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Employee Management
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {filteredEmployees.length} of {employees.length} employees
              </span>

              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg ${darkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          departments={departments}
          darkMode={darkMode}
        />

        {/* Active Filters */}
        {(searchTerm || selectedDepartment || selectedRole) && (
          <div className="flex items-center space-x-2 mb-4">
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Active filters:
            </span>
            {searchTerm && (
              <span className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                Search: {searchTerm}
              </span>
            )}
            {selectedDepartment && (
              <span className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                Department: {selectedDepartment}
              </span>
            )}
            {selectedRole && (
              <span className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                Role: {selectedRole}
              </span>
            )}
            <button
              onClick={clearFilters}
              className={`p-1 rounded ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Employee Grid */}
        {filteredEmployees.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No employees found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees
              .filter(employee => employee && employee.id) // Safety filter
              .map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  darkMode={darkMode}
                  isHighlighted={highlightedEmployeeId === employee.id}
                  onStatusManage={handleManageEmployeeStatus}
                  currentUserRole={user?.role || 'employee'}
                  onSelect={handleSelectEmployee}
                  isSelected={selectedEmployees.includes(employee.id)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Status Management Modal */}
      <EmployeeEditModal
        employee={managingEmployee}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setManagingEmployee(null);
        }}
        onSave={handleEmployeeUpdate}
        darkMode={darkMode}
      />
    </div>
  );
};