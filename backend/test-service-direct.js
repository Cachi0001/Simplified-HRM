const { EmployeeService } = require('./src/services/EmployeeService');
const { SupabaseEmployeeRepository } = require('./src/repositories/implementations/SupabaseEmployeeRepository');
require('dotenv').config();

async function testEmployeeService() {
  try {
    console.log('Testing EmployeeService.getEmployeesForManagement directly...');
    
    const employeeRepository = new SupabaseEmployeeRepository();
    const employeeService = new EmployeeService(employeeRepository);
    
    const employees = await employeeService.getEmployeesForManagement(
      'admin',
      '00000000-0000-0000-0000-000000000000'
    );
    
    console.log('✅ Service method works!');
    console.log('Employee count:', employees.length);
    console.log('Sample employee:', JSON.stringify(employees[0], null, 2));
    
  } catch (error) {
    console.error('❌ Service test error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testEmployeeService();