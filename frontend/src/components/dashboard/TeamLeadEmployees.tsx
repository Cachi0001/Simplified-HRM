import { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Calendar, Search } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../ui/Toast';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  department_id?: string;
  department_name?: string;
  hire_date?: string;
  status: 'active' | 'inactive';
}

interface TeamLeadEmployeesProps {
  currentUser: any;
  darkMode: boolean;
}

export function TeamLeadEmployees({ currentUser, darkMode }: TeamLeadEmployeesProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    loadDepartmentEmployees();
  }, [currentUser]);

  const loadDepartmentEmployees = async () => {
    try {
      setLoading(true);
      // Load employees from the team lead's department
      const response = await apiClient.get(`/employees/department/${currentUser?.department_id}`);
      
      if (response.status === 'success' && response.data) {
        // Filter out the team lead themselves
        const responseData = response.data as { data?: Employee[] };
        const departmentEmployees = (responseData.data || []).filter(
          (emp: Employee) => emp.id !== currentUser?.id && emp.role === 'employee'
        );
        setEmployees(departmentEmployees);
      }
    } catch (error) {
      addToast('error', 'Failed to load department employees');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Department Employees
          </h2>
        </div>
        <div className="text-sm text-gray-500">
          {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
      </div>

      {/* Employees List */}
      <div className="space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {searchQuery ? 'No employees found matching your search' : 'No employees in your department'}
            </p>
          </div>
        ) : (
          filteredEmployees.map(employee => (
            <div
              key={employee.id}
              className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-650' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {employee.full_name}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      employee.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4" />
                      <span>{employee.email}</span>
                    </div>
                    
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="h-4 w-4" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    
                    {employee.department_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        <span>{employee.department_name}</span>
                      </div>
                    )}
                    
                    {employee.hire_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Hired: {new Date(employee.hire_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}