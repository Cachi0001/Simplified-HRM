import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../../services/employeeService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Users, Building, Edit, Check, X } from 'lucide-react';

interface AdminDepartmentsProps {
  darkMode?: boolean;
}

const COMMON_DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Customer Service',
  'Product',
  'Design',
  'Legal'
];

export function AdminDepartments({ darkMode = false }: AdminDepartmentsProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [newDepartment, setNewDepartment] = useState<string>('');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [customDepartment, setCustomDepartment] = useState('');

  const queryClient = useQueryClient();

  // Fetch all employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeeService.getAllEmployees();
      // Filter out admin users for display purposes
      const nonAdminEmployees = response.employees.filter((emp: any) => emp.role !== 'admin');
      return nonAdminEmployees;
    },
  });

  // Assign department mutation
  const assignDepartmentMutation = useMutation({
    mutationFn: async ({ employeeId, department }: { employeeId: string; department: string }) => {
      return await employeeService.assignDepartment(employeeId, department);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAssignForm(false);
      setSelectedEmployee('');
      setNewDepartment('');
      setCustomDepartment('');
    },
  });

  const handleAssignDepartment = () => {
    if (!selectedEmployee || !newDepartment) {
      alert('Please select an employee and department');
      return;
    }

    assignDepartmentMutation.mutate({
      employeeId: selectedEmployee,
      department: newDepartment
    });
  };

  const handleQuickAssign = (employeeId: string, department: string) => {
    assignDepartmentMutation.mutate({ employeeId, department });
  };

  const addCustomDepartment = () => {
    if (customDepartment.trim()) {
      setNewDepartment(customDepartment.trim());
      setCustomDepartment('');
    }
  };

  const employeesWithoutDepartment = employees.filter(emp => !emp.department);
  const employeesWithDepartment = employees.filter(emp => emp.department);

  return (
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Department Management
          </h2>
        </div>
        <Button onClick={() => setShowAssignForm(!showAssignForm)}>
          <Edit className="h-4 w-4 mr-2" />
          Assign Department
        </Button>
      </div>

      {/* Assign Department Form */}
      {showAssignForm && (
        <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-6">
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Assign Department
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Select Employee</option>
                  {employeesWithoutDepartment.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} (No Department)
                    </option>
                  ))}
                  {employeesWithDepartment.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Department *
                </label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Select Department</option>
                  {COMMON_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Department Input */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Or add custom department
              </label>
              <div className="flex gap-2">
                <Input
                  id="customDepartment"
                  label="Custom Department"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  placeholder="Enter custom department name"
                  className="flex-1"
                />
                <Button onClick={addCustomDepartment}>
                  Add
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleAssignDepartment} disabled={assignDepartmentMutation.isPending}>
                <Check className="h-4 w-4 mr-2" />
                Assign Department
              </Button>
              <Button
                onClick={() => {
                  setShowAssignForm(false);
                  setSelectedEmployee('');
                  setNewDepartment('');
                  setCustomDepartment('');
                }}
                disabled={assignDepartmentMutation.isPending}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Assignment */}
      <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Quick Department Assignment
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {COMMON_DEPARTMENTS.map(dept => (
              <Button
                key={dept}
                onClick={() => {
                  const employee = employeesWithoutDepartment[0];
                  if (employee) {
                    handleQuickAssign(employee.id, dept);
                  } else {
                    alert('No employees without departments found');
                  }
                }}
                disabled={employeesWithoutDepartment.length === 0}
                className={`text-xs ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {dept}
              </Button>
            ))}
          </div>

          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            💡 Click any department button to quickly assign it to the first employee without a department
          </p>
        </div>
      </Card>

      {/* Department Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees Without Department */}
        <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className={`h-5 w-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                No Department ({employeesWithoutDepartment.length})
              </h3>
            </div>

            {employeesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-12 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                ))}
              </div>
            ) : employeesWithoutDepartment.length > 0 ? (
              <div className="space-y-2">
                {employeesWithoutDepartment.map(emp => (
                  <div key={emp.id} className={`p-3 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {emp.fullName}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {emp.email}
                        </p>
                      </div>
                      <Badge className={darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-800'}>
                        Unassigned
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Check className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <p className="font-medium">All employees have departments!</p>
              </div>
            )}
          </div>
        </Card>

        {/* Department Distribution */}
        <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Department Distribution
              </h3>
            </div>

            {employeesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-8 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {COMMON_DEPARTMENTS.map(dept => {
                  const count = employeesWithDepartment.filter(emp => emp.department === dept).length;
                  if (count === 0) return null;

                  return (
                    <div key={`common-${dept}`} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {dept}
                      </span>
                      <Badge className={darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}>
                        {count}
                      </Badge>
                    </div>
                  );
                })}

                {/* Custom departments */}
                {Array.from(new Set(employeesWithDepartment
                  .map(emp => emp.department)
                  .filter(dept => dept && !COMMON_DEPARTMENTS.includes(dept))
                )).map(dept => {
                  const count = employeesWithDepartment.filter(emp => emp.department === dept).length;
                  return (
                    <div key={`custom-${dept}`} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {dept}
                      </span>
                      <Badge className={darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800'}>
                        {count}
                      </Badge>
                    </div>
                  );
                })}

                {employeesWithDepartment.length === 0 && (
                  <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Building className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className="font-medium">No departments assigned yet</p>
                    <p className="text-sm">Start assigning departments to see the distribution</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
