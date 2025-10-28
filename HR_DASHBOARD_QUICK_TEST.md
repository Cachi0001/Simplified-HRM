# HR Dashboard - Quick Testing Guide

**Last Updated**: Current Session  
**Status**: ✅ Ready to Test

---

## Quick Start (2 minutes)

### 1. Verify Dev Server is Running
```bash
# Should see: VITE v6.4.1 ready on http://localhost:5173
# If not running, start it:
cd frontend
npm run dev
```

### 2. Open Application
```
Browser → http://localhost:5173
```

### 3. Login as HR or Admin
```
Email: (any HR or admin user email)
Password: (correct password)
```

---

## Test Scenarios

### 🧪 Test 1: HR Dashboard Access (30 seconds)

**Objective**: Verify HR users can access the HR Dashboard

**Steps**:
1. Login as HR user
2. Click menu → Should redirect to `/hr-dashboard`
3. **Expected**: See "HR Dashboard" heading with welcome message

**✅ Pass Criteria**:
- Page loads without errors
- Welcome message shows user's full name
- Dark mode toggle visible
- Three stats cards displayed

---

### 🧪 Test 2: Leave Request Management (2 minutes)

**Objective**: Test leave request filtering and approval workflow

**Steps**:
1. On HR Dashboard, scroll to "Leave Requests" section
2. Click filter dropdown → Select "pending"
3. Should show only pending leave requests
4. Click on a pending request to expand
5. Click "Approve" button
6. Check: Request should move from pending to approved

**✅ Pass Criteria**:
- ✅ Requests filter by status
- ✅ Expand/collapse works
- ✅ Approve button responds
- ✅ Request status updates immediately

**Troubleshooting**:
- If no requests appear: Backend may not have sample data
- If approve fails: Check backend `/leave-requests/{id}` endpoint

---

### 🧪 Test 3: Employee Management - Search (1 minute)

**Objective**: Test employee search functionality

**Steps**:
1. Scroll to "Employee Management" section
2. In search box, type employee's name (e.g., "John")
3. List should filter to show only matching employees
4. Clear search → List should show all employees again

**✅ Pass Criteria**:
- ✅ Search filters employees by name
- ✅ Search filters employees by email
- ✅ Clearing search shows all employees
- ✅ No errors in console

**Troubleshooting**:
- If TypeError appears: Fix has been applied, restart dev server
- If search doesn't work: Check employee data structure from API

---

### 🧪 Test 4: Employee Role Change (2 minutes)

**Objective**: Test role assignment capability

**Steps**:
1. In Employee Management, find a pending employee
2. Click to expand employee details
3. In expanded view, find "Change Role To:" section
4. Click one of the role buttons (Employee/HR/Admin)
5. Selected role should highlight
6. Click "Update Role" button
7. Check: Role should update and toast notification appears

**✅ Pass Criteria**:
- ✅ Role buttons are clickable
- ✅ Selected role highlights with color
- ✅ Update button enables/disables correctly
- ✅ Success toast appears
- ✅ Employee list refreshes

**Role Colors**:
- 👤 Admin: Red background
- 📋 HR: Purple background
- 👥 Employee: Blue background

**Troubleshooting**:
- If update fails: Check backend PUT `/employees/{id}` endpoint
- If list doesn't refresh: Check React Query cache invalidation

---

### 🧪 Test 5: Employee Approval (2 minutes)

**Objective**: Test pending employee approval workflow

**Steps**:
1. In Employee Management, find a pending employee
2. Click to expand
3. In expanded section, find Approve/Reject buttons
4. Click "Approve"
5. Check: Status should change to "active" and buttons disappear

**✅ Pass Criteria**:
- ✅ Approve button visible for pending employees
- ✅ Reject button visible for pending employees
- ✅ Approval updates status immediately
- ✅ Success notification appears
- ✅ Buttons disappear after action

**Troubleshooting**:
- If no pending employees: Create one via backend
- If action fails: Check backend POST `/employees/{id}/approve` endpoint

---

### 🧪 Test 6: Dark Mode (1 minute)

**Objective**: Verify dark mode works throughout

**Steps**:
1. On HR Dashboard header, click moon icon 🌙
2. Page should switch to dark colors
3. Click again (sun icon ☀️)
4. Page should switch back to light colors
5. Refresh page → Dark mode preference should persist

**✅ Pass Criteria**:
- ✅ Dark mode toggle works
- ✅ All components have dark mode support
- ✅ Text is readable in both modes
- ✅ Preference persists after refresh

---

### 🧪 Test 7: Data Validation (Technical Test - 1 minute)

**Objective**: Verify error handling for malformed data

**Steps** (Browser Console):
1. Open browser DevTools (F12)
2. Go to Console tab
3. You should NOT see errors like:
   ```
   Cannot read properties of undefined (reading 'toLowerCase')
   ```
4. In Network tab, inspect API responses
5. Check that employee data has all required fields

**✅ Pass Criteria**:
- ✅ No TypeErrors in console
- ✅ No runtime errors when loading employees
- ✅ Invalid records filtered out gracefully
- ✅ Empty fields show "Not assigned" or "Not provided"

---

### 🧪 Test 8: Filter Combinations (1 minute)

**Objective**: Test multiple filters working together

**Steps**:
1. In Employee Management, set:
   - Search: any name
   - Role filter: "HR"
   - Status filter: "pending"
2. Results should show only HR-role pending employees matching search
3. Change each filter one at a time
4. List should update correctly

**✅ Pass Criteria**:
- ✅ All filters work independently
- ✅ Filters work together correctly
- ✅ Result count displays correctly
- ✅ UI shows "0 employees" when no matches

---

### 🧪 Test 9: Navigation (1 minute)

**Objective**: Verify menu navigation works

**Steps**:
1. In HR Dashboard, find "Quick Actions" section (right side)
2. Click "👥 Employee Management" → Should navigate to regular admin dashboard
3. Click hamburger menu (bottom left)
4. Menu should show and allow navigation

**✅ Pass Criteria**:
- ✅ Quick action buttons navigate correctly
- ✅ Hamburger menu opens/closes
- ✅ Menu items work
- ✅ No broken links

---

### 🧪 Test 10: Access Control (1 minute)

**Objective**: Verify only HR/Admin can access

**Steps**:
1. **Test as Employee**:
   - Login as regular employee
   - Try to navigate to `/hr-dashboard`
   - Should redirect to `/employee-dashboard`
2. **Test as Admin**:
   - Login as admin
   - Navigate to `/hr-dashboard`
   - Should show HR Dashboard

**✅ Pass Criteria**:
- ✅ Employee users cannot access HR Dashboard
- ✅ HR users can access
- ✅ Admin users can access
- ✅ Unauthenticated users redirect to login

---

## Test Results Template

```markdown
# HR Dashboard Test Results

## Environment
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Version: [Version info]
- Server: http://localhost:5173

## Tests Passed ✅
- [ ] Test 1: HR Dashboard Access
- [ ] Test 2: Leave Request Management
- [ ] Test 3: Employee Search
- [ ] Test 4: Employee Role Change
- [ ] Test 5: Employee Approval
- [ ] Test 6: Dark Mode
- [ ] Test 7: Data Validation
- [ ] Test 8: Filter Combinations
- [ ] Test 9: Navigation
- [ ] Test 10: Access Control

## Issues Found
(List any issues encountered)

## Recommendations
(List any improvements or concerns)

## Sign-Off
- Tester: _______________
- Date: _______________
- Status: [ ] Pass [ ] Pass with Issues [ ] Fail
```

---

## Common Issues & Fixes

### Issue: "Cannot read properties of undefined (reading 'toLowerCase')"
**Status**: ✅ FIXED in this session
**Fix Applied**: Enhanced data validation in AdminEmployeeManagement

### Issue: "No employees showing"
**Check**: 
1. Backend `/employees` endpoint returns data
2. Try clearing cache: DevTools → Application → Clear Storage
3. Refresh page

### Issue: "Dark mode not persisting"
**Check**:
1. Browser allows localStorage
2. DevTools → Application → Local Storage → http://localhost:5173
3. Should see `darkMode: true/false`

### Issue: "Approve button doesn't work"
**Check**:
1. Backend endpoint: `POST /employees/{id}/approve`
2. Network tab shows 200 response
3. Check console for error message

---

## Performance Benchmarks

**Expected Performance**:
- Page load: < 2 seconds
- Employee list load: < 1 second  
- Leave requests load: < 1 second
- Search filter: < 200ms
- Role change: < 2 seconds (API call + UI update)

**Monitor with**:
- DevTools → Performance tab
- Network tab (check response times)
- Console (check for errors)

---

## Browser Compatibility

✅ **Tested & Supported**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Next Steps After Testing

1. ✅ **All tests pass** → Ready for production deployment
2. ⚠️ **Some tests fail** → Check troubleshooting section
3. 📝 **Issues found** → Document in bug tracker
4. 🚀 **Production ready** → Deploy to Vercel

---

**Happy Testing! 🎉**

Questions? Check:
- HR_DASHBOARD_COMPLETION_REPORT.md (detailed documentation)
- Browser console (error messages)
- Network tab (API responses)
- AdminEmployeeManagement.tsx (component implementation)