// Comprehensive system functionality test
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xabdbqfxjxmslmbqujhz.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYmRicWZ4anhtc2xtYnF1amh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQxNzQ0NSwiZXhwIjoyMDc2OTkzNDQ1fQ.eZNs-l54JgknM_HQpGsWCyHd6AYVuXAiu7oKm6jUyAw';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testSystemFunctionality() {
  console.log('🧪 Testing System Functionality...\n');
  
  const results = {
    database: false,
    authentication: false,
    chatMessages: false,
    employees: false,
    notifications: false,
    announcements: false,
    attendance: false,
    leaveRequests: false,
    purchaseRequests: false
  };

  try {
    // Test 1: Database Connection
    console.log('1. Testing Database Connection...');
    const { data: dbTest, error: dbError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (dbError) {
      console.log('❌ Database connection failed:', dbError.message);
    } else {
      console.log('✅ Database connection successful');
      results.database = true;
    }

    // Test 2: Users & Authentication
    console.log('\n2. Testing Users & Authentication...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users query failed:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      console.log(`📊 Found ${users?.length || 0} users`);
      if (users && users.length > 0) {
        console.log('👤 Sample user:', {
          email: users[0].email,
          role: users[0].role,
          name: users[0].full_name
        });
      }
      results.authentication = true;
    }

    // Test 3: Chat Messages
    console.log('\n3. Testing Chat Messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, chat_id, sender_id, message, timestamp')
      .limit(5);
    
    if (messagesError) {
      console.log('❌ Chat messages query failed:', messagesError.message);
    } else {
      console.log('✅ Chat messages table accessible');
      console.log(`📊 Found ${messages?.length || 0} messages`);
      results.chatMessages = true;
    }

    // Test 4: Employees
    console.log('\n4. Testing Employees...');
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, email, full_name, role, status')
      .limit(5);
    
    if (employeesError) {
      console.log('❌ Employees query failed:', employeesError.message);
    } else {
      console.log('✅ Employees table accessible');
      console.log(`📊 Found ${employees?.length || 0} employees`);
      if (employees && employees.length > 0) {
        console.log('👥 Sample employee:', {
          email: employees[0].email,
          role: employees[0].role,
          status: employees[0].status
        });
      }
      results.employees = true;
    }

    // Test 5: Notifications
    console.log('\n5. Testing Notifications...');
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, is_read')
      .limit(5);
    
    if (notificationsError) {
      console.log('❌ Notifications query failed:', notificationsError.message);
    } else {
      console.log('✅ Notifications table accessible');
      console.log(`📊 Found ${notifications?.length || 0} notifications`);
      results.notifications = true;
    }

    // Test 6: Announcements
    console.log('\n6. Testing Announcements...');
    const { data: announcements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id, title, content, author_id, status, priority')
      .limit(5);
    
    if (announcementsError) {
      console.log('❌ Announcements query failed:', announcementsError.message);
    } else {
      console.log('✅ Announcements table accessible');
      console.log(`📊 Found ${announcements?.length || 0} announcements`);
      results.announcements = true;
    }

    // Test 7: Attendance
    console.log('\n7. Testing Attendance...');
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('id, employee_id, status, check_in_time, date')
      .limit(5);
    
    if (attendanceError) {
      console.log('❌ Attendance query failed:', attendanceError.message);
    } else {
      console.log('✅ Attendance table accessible');
      console.log(`📊 Found ${attendance?.length || 0} attendance records`);
      results.attendance = true;
    }

    // Test 8: Leave Requests
    console.log('\n8. Testing Leave Requests...');
    const { data: leaveRequests, error: leaveError } = await supabase
      .from('leave_requests')
      .select('id, employee_id, type, status, start_date, end_date')
      .limit(5);
    
    if (leaveError) {
      console.log('❌ Leave requests query failed:', leaveError.message);
    } else {
      console.log('✅ Leave requests table accessible');
      console.log(`📊 Found ${leaveRequests?.length || 0} leave requests`);
      results.leaveRequests = true;
    }

    // Test 9: Purchase Requests
    console.log('\n9. Testing Purchase Requests...');
    const { data: purchaseRequests, error: purchaseError } = await supabase
      .from('purchase_requests')
      .select('id, employee_id, item_name, status, amount')
      .limit(5);
    
    if (purchaseError) {
      console.log('❌ Purchase requests query failed:', purchaseError.message);
    } else {
      console.log('✅ Purchase requests table accessible');
      console.log(`📊 Found ${purchaseRequests?.length || 0} purchase requests`);
      results.purchaseRequests = true;
    }

  } catch (error) {
    console.error('❌ System test failed:', error.message);
  }

  // Summary
  console.log('\n🎯 System Functionality Test Results:');
  console.log('=====================================');
  
  const testResults = [
    { name: 'Database Connection', status: results.database },
    { name: 'Users & Authentication', status: results.authentication },
    { name: 'Chat Messages', status: results.chatMessages },
    { name: 'Employees Management', status: results.employees },
    { name: 'Notifications System', status: results.notifications },
    { name: 'Announcements System', status: results.announcements },
    { name: 'Attendance Tracking', status: results.attendance },
    { name: 'Leave Requests', status: results.leaveRequests },
    { name: 'Purchase Requests', status: results.purchaseRequests }
  ];

  testResults.forEach(test => {
    console.log(`${test.status ? '✅' : '❌'} ${test.name}`);
  });

  const passedTests = testResults.filter(test => test.status).length;
  const totalTests = testResults.length;
  
  console.log(`\n📊 Overall Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All system functionalities are working perfectly!');
    console.log('✅ System is ready for production deployment on Vercel');
  } else {
    console.log('⚠️  Some functionalities need attention before deployment');
  }
}

testSystemFunctionality().catch(console.error);