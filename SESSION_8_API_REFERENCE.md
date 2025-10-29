# Session 8: API Reference - Employee Role Approval System

## Overview

This document provides complete API reference for the new employee approval endpoints introduced in Session 8.

---

## Authentication

All endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Endpoints

### 1. Approve Employee with Role Assignment

#### Request

```http
POST /api/employees/:id/approve-with-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "employee" | "hr" | "admin" | "super-admin",
  "reason": "Optional reason for approval"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | ✓ | Employee ID from employees table |
| role | string | ✓ | Role to assign: employee, hr, admin, or super-admin |
| reason | string | ✗ | Optional reason/notes for approval |

#### Response (Success)

```json
{
  "status": "success",
  "message": "Employee approved and role assigned successfully",
  "data": {
    "success": true,
    "message": "Employee approved successfully with role: admin",
    "employee_id": "550e8400-e29b-41d4-a716-446655440000",
    "updated_role": "admin",
    "status": "active"
  }
}
```

#### Response (Error)

```json
{
  "status": "error",
  "message": "Only admin, HR, or super-admin can approve"
}
```

#### Status Codes

| Code | Description |
|------|-------------|
| 200 | Successfully approved employee |
| 400 | Invalid request or authorization error |
| 404 | Employee not found |
| 500 | Server error |

#### Database Operations

This endpoint calls the Supabase function:
```sql
SELECT approve_employee_with_role(
  p_employee_id := '550e8400-e29b-41d4-a716-446655440000',
  p_new_role := 'admin',
  p_approved_by_id := 'current-user-id',
  p_approved_by_name := 'John Admin',
  p_reason := 'Approved for admin role'
);
```

Operations performed:
1. Update employee.role → new role
2. Update users.role → new role
3. Update employee.status → active
4. Create approval request record
5. Create approval history entry
6. Trigger audit log

---

### 2. Update Employee Role (Direct)

#### Request

```http
POST /api/employees/:id/update-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "employee" | "hr" | "admin" | "super-admin",
  "reason": "Reason for role change"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string (UUID) | ✓ | Employee ID |
| role | string | ✓ | New role to assign |
| reason | string | ✗ | Reason for change |

#### Response (Success)

```json
{
  "status": "success",
  "message": "Employee role updated successfully",
  "data": {
    "success": true,
    "message": "Employee role updated successfully to: hr",
    "employee_id": "550e8400-e29b-41d4-a716-446655440000",
    "updated_role": "hr"
  }
}
```

#### Authorization

⚠️ **Only admin or super-admin can use this endpoint**

HR users cannot directly update roles, they must use the approval workflow.

#### Database Operations

Calls:
```sql
SELECT update_employee_role(
  p_employee_id := '...',
  p_new_role := 'hr',
  p_updated_by_id := 'current-user-id',
  p_updated_by_name := 'John Admin',
  p_reason := 'Promoting to HR'
);
```

---

### 3. Get Pending Approvals

#### Request

```http
GET /api/employees/pending
Authorization: Bearer <token>
```

#### Query Parameters

None (uses current user's role for filtering)

#### Response (Success)

```json
{
  "status": "success",
  "employees": [
    {
      "id": "approval-req-uuid",
      "employee_id": "emp-uuid-1",
      "employee_name": "John Doe",
      "email": "john.doe@company.com",
      "current_role": "employee",
      "requested_role": "hr",
      "status": "pending",
      "requested_at": "2024-01-15T10:30:00Z",
      "department": "Sales"
    },
    {
      "id": "approval-req-uuid-2",
      "employee_id": "emp-uuid-2",
      "employee_name": "Jane Smith",
      "email": "jane.smith@company.com",
      "current_role": "employee",
      "requested_role": "admin",
      "status": "pending",
      "requested_at": "2024-01-15T09:15:00Z",
      "department": "IT"
    }
  ],
  "total": 2
}
```

#### Role-Based Filtering

| User Role | Can See |
|-----------|---------|
| super-admin | All pending requests |
| admin | All pending requests |
| hr | All pending requests |
| employee | None (error) |

#### Response (Employee/Unauthorized)

```json
{
  "status": "error",
  "message": "Access denied"
}
```

---

### 4. Get Approval History

#### Request

```http
GET /api/employees/approvals/history?employeeId=<uuid>
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | string (UUID) | ✗ | Filter by employee (admin/hr/super-admin only) |

#### Response (Success)

```json
{
  "status": "success",
  "data": [
    {
      "id": "history-uuid-1",
      "employee_id": "emp-uuid",
      "old_status": "pending",
      "new_status": "active",
      "old_role": "employee",
      "new_role": "admin",
      "changed_by_id": "admin-uuid",
      "changed_by_name": "Jane Administrator",
      "changed_by_role": "super-admin",
      "reason": "Promoted to admin role",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "history-uuid-2",
      "employee_id": "emp-uuid",
      "old_status": "active",
      "new_status": "active",
      "old_role": "admin",
      "new_role": "hr",
      "changed_by_id": "admin-uuid-2",
      "changed_by_name": "John Manager",
      "changed_by_role": "admin",
      "reason": "Role change requested",
      "created_at": "2024-01-16T14:20:00Z"
    }
  ]
}
```

#### Access Control

- **Admin/Super-Admin**: Can view any employee's history
- **HR**: Can view any employee's history
- **Employee**: Can only view their own history
- **Unauthenticated**: Access denied

---

## Common Errors

### 401 Unauthorized

```json
{
  "status": "error",
  "message": "Unauthorized: Only admin, HR, or super-admin can approve"
}
```

**Causes:**
- User role is not admin, HR, or super-admin
- JWT token expired
- Missing Authorization header

### 400 Bad Request

```json
{
  "status": "error",
  "message": "Invalid role. Must be admin, employee, hr, or super-admin"
}
```

**Causes:**
- Invalid role value provided
- Missing required fields
- Malformed JSON

### 404 Not Found

```json
{
  "status": "error",
  "message": "Employee not found"
}
```

**Causes:**
- Employee ID doesn't exist
- Employee has been deleted

---

## Request Examples

### cURL

#### Approve employee as HR

```bash
curl -X POST http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000/approve-with-role \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin",
    "reason": "Promoted to admin role"
  }'
```

#### Get pending approvals

```bash
curl -X GET http://localhost:3000/api/employees/pending \
  -H "Authorization: Bearer eyJhbGc..."
```

#### Get approval history

```bash
curl -X GET "http://localhost:3000/api/employees/approvals/history?employeeId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGc..."
```

### JavaScript/TypeScript

```typescript
import apiClient from './utils/apiClient';

// Approve employee
const approveEmployee = async (employeeId: string, role: string) => {
  try {
    const response = await apiClient.post(
      `/api/employees/${employeeId}/approve-with-role`,
      { 
        role,
        reason: 'Approved by admin'
      }
    );
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
  }
};

// Get pending approvals
const getPendingApprovals = async () => {
  try {
    const response = await apiClient.get('/api/employees/pending');
    return response.data.employees;
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
  }
};

// Get history
const getApprovalHistory = async (employeeId?: string) => {
  try {
    const url = employeeId 
      ? `/api/employees/approvals/history?employeeId=${employeeId}`
      : '/api/employees/approvals/history';
    
    const response = await apiClient.get(url);
    return response.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
  }
};
```

### React Component Example

```tsx
import { useState, useEffect } from 'react';
import apiClient from './utils/apiClient';

export const ApprovalManager = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedRole, setSelectedRole] = useState('employee');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      const response = await apiClient.get('/api/employees/pending');
      setEmployees(response.data.employees);
    } catch (error) {
      console.error('Failed to load:', error);
    }
  };

  const approve = async (employeeId: string) => {
    setLoading(true);
    try {
      await apiClient.post(
        `/api/employees/${employeeId}/approve-with-role`,
        { role: selectedRole }
      );
      await loadPending();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {employees.map(emp => (
        <div key={emp.id}>
          <h3>{emp.employee_name}</h3>
          <select 
            value={selectedRole} 
            onChange={e => setSelectedRole(e.target.value)}
          >
            <option value="employee">Employee</option>
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
            <option value="super-admin">Super Admin</option>
          </select>
          <button 
            onClick={() => approve(emp.employee_id)}
            disabled={loading}
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  );
};
```

---

## Response Time Guidelines

| Endpoint | Typical Time | Max Time |
|----------|--------------|----------|
| approve-with-role | 500ms | 2s |
| update-role | 400ms | 2s |
| pending | 300ms | 1.5s |
| approvals/history | 200ms | 1s |

---

## Rate Limiting

Currently no rate limiting is enforced, but recommended:
- 100 requests per minute per user
- 1000 requests per minute per API key

---

## Webhooks (Future)

Consider implementing webhooks for:
- Employee approved
- Employee rejected
- Role changed
- History created

---

## Changelog

### Version 1.0 (Session 8)

- Initial release
- Added approve-with-role endpoint
- Added update-role endpoint
- Added approvals/history endpoint
- Added real-time support
- Added RLS policies
- Added audit trail

---

## Support

For issues or questions:
1. Check this documentation
2. Review SUPABASE_SETUP_SESSION8.sql for database implementation
3. Check application logs for errors
4. Contact development team