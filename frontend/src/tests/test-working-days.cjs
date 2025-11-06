#!/usr/bin/env node

/**
 * Working Days Test Script
 * Tests the working days functionality with real database integration
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Go3net Working Days Integration Test');
console.log('======================================\n');

// Test credentials provided by user
const TEST_CREDENTIALS = {
  email: 'kayode@go3net.com.ng',
  password: 'kayode'
};

// API Base URL (try local first, then production)
const API_URLS = [
  'http://localhost:3000',
  'https://go3nethrm-backend.vercel.app'
];

let currentToken = null;
let currentUser = null;

// Helper function to make API requests
async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(currentToken && { 'Authorization': `Bearer ${currentToken}` })
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  console.log(`📡 ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    console.log(`📊 Status: ${response.status}`);
    if (response.ok) {
      console.log('✅ Success');
    } else {
      console.log('❌ Failed');
      console.log('📝 Error:', data);
    }

    return { response, data };
  } catch (error) {
    console.log('❌ Network Error:', error.message);
    return { error };
  }
}

// Test 1: Health Check
async function testHealthCheck(baseUrl) {
  console.log('🏥 Testing Health Check...');
  const { response, data, error } = await makeRequest(`${baseUrl}/api/health`);

  if (error) {
    console.log('❌ Health check failed - API not accessible\n');
    return false;
  }

  if (response.ok) {
    console.log('✅ API is healthy');
    console.log('📊 Environment Status:');
    if (data.envStatus) {
      Object.entries(data.envStatus).forEach(([key, value]) => {
        const status = value === 'SET' || value ? '✅' : '❌';
        console.log(`  ${status} ${key}: ${value}`);
      });
    }
    console.log('');
    return true;
  }

  console.log('❌ Health check failed\n');
  return false;
}

// Test 2: Authentication
async function testAuthentication(baseUrl) {
  console.log('🔐 Testing Authentication...');
  const { response, data, error } = await makeRequest(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(TEST_CREDENTIALS)
  });

  if (error || !response.ok) {
    console.log('❌ Authentication failed');
    return false;
  }

  if (data.data && data.data.accessToken) {
    currentToken = data.data.accessToken;
    currentUser = data.data.user;
    console.log('✅ Authentication successful');
    console.log(`👤 Logged in as: ${currentUser.fullName} (${currentUser.role})`);
    console.log('');
    return true;
  }

  console.log('❌ No access token received');
  return false;
}

// Test 3: Get Current Profile
async function testGetProfile(baseUrl) {
  console.log('👤 Testing Profile Retrieval...');
  const { response, data, error } = await makeRequest(`${baseUrl}/api/employees/me`);

  if (error || !response.ok) {
    console.log('❌ Profile retrieval failed');
    return null;
  }

  const employee = data.data?.employee;
  if (employee) {
    console.log('✅ Profile retrieved successfully');
    console.log(`📋 Employee ID: ${employee.id}`);
    console.log(`📧 Email: ${employee.email}`);
    console.log(`🏢 Department: ${employee.department || 'Not set'}`);
    console.log(`⏰ Current Work Days: ${JSON.stringify(employee.work_days || 'Not set')}`);
    console.log('');
    return employee;
  }

  console.log('❌ No employee data received');
  return null;
}

// Test 4: Update Working Days
async function testUpdateWorkingDays(baseUrl, currentWorkDays) {
  console.log('⚙️ Testing Working Days Update...');

  // Test data
  const testWorkingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const testWorkingHours = { start: '09:00', end: '17:00' };
  const testTimezone = 'UTC';

  console.log('📝 Updating with test data:');
  console.log(`  Work Days: ${JSON.stringify(testWorkingDays)}`);
  console.log(`  Work Hours: ${JSON.stringify(testWorkingHours)}`);
  console.log(`  Timezone: ${testTimezone}`);

  const { response, data, error } = await makeRequest(`${baseUrl}/api/employees/me`, {
    method: 'PUT',
    body: JSON.stringify({
      work_days: testWorkingDays,
      working_hours: testWorkingHours,
      timezone: testTimezone
    })
  });

  if (error || !response.ok) {
    console.log('❌ Working days update failed');
    if (data) {
      console.log('📝 Error details:', data.message || data);
    }
    return false;
  }

  console.log('✅ Working days updated successfully');

  // Verify the update
  console.log('🔍 Verifying update...');
  const verification = await testGetProfile(baseUrl);

  if (verification && verification.work_days) {
    const updatedWorkDays = verification.work_days;
    const matches = JSON.stringify(updatedWorkDays.sort()) === JSON.stringify(testWorkingDays.sort());

    if (matches) {
      console.log('✅ Working days verified successfully');
      console.log(`📊 Updated work days: ${JSON.stringify(updatedWorkDays)}`);
      return true;
    } else {
      console.log('❌ Working days verification failed');
      console.log(`📊 Expected: ${JSON.stringify(testWorkingDays)}`);
      console.log(`📊 Got: ${JSON.stringify(updatedWorkDays)}`);
    }
  } else {
    console.log('❌ Could not verify working days update');
  }

  return false;
}

// Test 5: Database Schema Verification
async function testDatabaseSchema() {
  console.log('🗃️ Verifying Database Schema...');

  const schemaPath = path.join(__dirname, '../../../database/table.sql');

  if (!fs.existsSync(schemaPath)) {
    console.log('❌ Database schema file not found');
    return false;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  // Check for work_days column
  if (schemaContent.includes('work_days jsonb')) {
    console.log('✅ work_days column found in schema');

    // Check for default value
    if (schemaContent.includes('["monday", "tuesday", "wednesday", "thursday", "friday"]')) {
      console.log('✅ Default work_days value found');
      return true;
    } else {
      console.log('⚠️ Default work_days value not found');
      return true; // Still valid, just no default
    }
  } else {
    console.log('❌ work_days column not found in schema');
    return false;
  }
}

// Test 6: Frontend Component Integration
async function testFrontendIntegration() {
  console.log('🎨 Testing Frontend Integration...');

  const componentPath = path.join(__dirname, '../components/settings/WorkingDaysConfig.tsx');

  if (!fs.existsSync(componentPath)) {
    console.log('❌ WorkingDaysConfig component not found');
    return false;
  }

  const componentContent = fs.readFileSync(componentPath, 'utf8');

  const checks = [
    { name: 'work_days field usage', pattern: 'work_days' },
    { name: 'API endpoint call', pattern: '/employees/me' },
    { name: 'Working hours handling', pattern: 'working_hours' },
    { name: 'Timezone support', pattern: 'timezone' },
    { name: 'Validation logic', pattern: 'validateConfig' }
  ];

  let passedChecks = 0;

  checks.forEach(check => {
    if (componentContent.includes(check.pattern)) {
      console.log(`✅ ${check.name} found`);
      passedChecks++;
    } else {
      console.log(`❌ ${check.name} missing`);
    }
  });

  console.log(`📊 Frontend integration: ${passedChecks}/${checks.length} checks passed`);
  return passedChecks === checks.length;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Working Days Integration Tests...\n');

  const results = {
    healthCheck: false,
    authentication: false,
    profileRetrieval: false,
    workingDaysUpdate: false,
    databaseSchema: false,
    frontendIntegration: false
  };

  // Test database schema first
  results.databaseSchema = await testDatabaseSchema();
  console.log('');

  // Test frontend integration
  results.frontendIntegration = await testFrontendIntegration();
  console.log('');

  // Test API endpoints
  for (const baseUrl of API_URLS) {
    console.log(`🌐 Testing API at: ${baseUrl}`);
    console.log(''.padEnd(50, '-'));

    // Health check
    const healthOk = await testHealthCheck(baseUrl);
    if (!healthOk) {
      console.log(`⏭️ Skipping remaining tests for ${baseUrl}\n`);
      continue;
    }
    results.healthCheck = true;

    // Authentication
    const authOk = await testAuthentication(baseUrl);
    if (!authOk) {
      console.log(`⏭️ Skipping authenticated tests for ${baseUrl}\n`);
      continue;
    }
    results.authentication = true;

    // Profile retrieval
    const profile = await testGetProfile(baseUrl);
    if (!profile) {
      console.log(`⏭️ Skipping profile-dependent tests for ${baseUrl}\n`);
      continue;
    }
    results.profileRetrieval = true;

    // Working days update
    const workingDaysOk = await testUpdateWorkingDays(baseUrl, profile.work_days);
    results.workingDaysUpdate = workingDaysOk;

    // If we got this far with a working API, break
    if (healthOk && authOk && profile) {
      console.log(`✅ All tests completed with ${baseUrl}\n`);
      break;
    }
  }

  // Final results
  console.log('=====================================');
  console.log('📊 FINAL TEST RESULTS');
  console.log('=====================================\n');

  const testResults = [
    { name: 'Database Schema', status: results.databaseSchema },
    { name: 'Frontend Integration', status: results.frontendIntegration },
    { name: 'API Health Check', status: results.healthCheck },
    { name: 'Authentication', status: results.authentication },
    { name: 'Profile Retrieval', status: results.profileRetrieval },
    { name: 'Working Days Update', status: results.workingDaysUpdate }
  ];

  let passedTests = 0;
  testResults.forEach(test => {
    const icon = test.status ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
    if (test.status) passedTests++;
  });

  console.log(`\n📊 Overall: ${passedTests}/${testResults.length} tests passed`);

  if (passedTests === testResults.length) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Working days functionality is fully integrated and working');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED');
    console.log('🔧 Check the failed tests above and fix the issues');
  }

  console.log('\n💡 NEXT STEPS:');
  console.log('1. Fix any failed tests');
  console.log('2. Test the working days UI in browser');
  console.log('3. Verify working days affect performance calculations');
  console.log('4. Test with different user roles (HR, Admin, Employee)');

  return passedTests === testResults.length;
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
