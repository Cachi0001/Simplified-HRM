# HR Management System - API Documentation

## Authentication Endpoints

Base URL: `http://localhost:3000/api/auth`

### 1. POST /signup - Register New User
**Method:** POST
**Headers:**
```
Content-Type: application/json
```
**Body (JSON):**
```json 
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "fullName": "John Doe",
  "role": "employee"
}
```
**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "fullName": "John Doe",
      "role": "employee",
      "emailVerified": false,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### 2. POST /login - Login with Email/Password
**Method:** POST
**Headers:**
```
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "User signed in successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "fullName": "John Doe",
      "role": "employee",
      "emailVerified": false,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### 3. GET /me - Get Current User (Protected)
**Method:** GET
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
Content-Type: application/json
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "fullName": "John Doe",
      "role": "employee",
      "emailVerified": false,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 4. POST /google - Google OAuth Login
**Method:** POST
**Headers:**
```
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "provider": "google",
  "idToken": "google_id_token_from_client"
}
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Google OAuth successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "fullName": "John Doe",
      "role": "employee",
      "emailVerified": true,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### 5. POST /logout - Logout User (Protected)
**Method:** POST
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
Content-Type: application/json
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "User signed out successfully"
}
```

### 6. POST /refresh - Refresh Token (Protected)
**Method:** POST
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "refreshToken": "your_refresh_token"
}
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### 7. POST /verify-email - Verify Email
**Method:** POST
**Headers:**
```
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "token": "verification_token_from_email"
}
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Email verified successfully"
}
```

### 9. POST /update-password - Update Password (Protected)
**Method:** POST
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "newPassword": "NewPassword123!"
}
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Password updated successfully"
}
```

## Testing Workflow
1. **Start with signup** to create a test user
2. **Login** to get access and refresh tokens
3. **Use the access token** in Authorization header for protected routes
4. **Test protected routes** like GET /me, POST /logout, etc.
5. **Test error cases** (invalid credentials, missing tokens, etc.)

## Error Handling
All endpoints return errors in this format:
```json
{
  "status": "error",
  "message": "Error description"
}
```

Common status codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

## Employee Management Endpoints

Base URL: `http://localhost:3000/api/employees`

### 1. POST /employees - Create Employee (Admin Only)
**Method:** POST
**Headers:**
```
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "email": "employee@example.com",
  "fullName": "John Doe",
  "role": "employee",
  "department": "Engineering",
  "position": "Developer"
}
```
**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "Employee created successfully",
  "data": {
    "employee": {
      "id": "uuid",
      "userId": "uuid",
      "email": "employee@example.com",
      "fullName": "John Doe",
      "role": "employee",
      "department": "Engineering",
      "position": "Developer",
      "status": "active",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 2. GET /employees - Get All Employees
**Method:** GET
**Headers:**
```
Authorization: Bearer ACCESS_TOKEN
```
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name or email
- `department` (optional): Filter by department
- `status` (optional): Filter by status (active/inactive)
- `role` (optional): Filter by role (admin/employee)
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "employees": [
      {
        "id": "uuid",
        "userId": "uuid",
        "email": "employee@example.com",
        "fullName": "John Doe",
        "role": "employee",
        "department": "Engineering",
        "status": "active",
        "createdAt": "timestamp",
        "updatedAt": "timestamp"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### 3. GET /employees/profile - Get My Profile
**Method:** GET
**Headers:**
```
Authorization: Bearer ACCESS_TOKEN
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "employee": {
      "id": "uuid",
      "userId": "uuid",
      "email": "employee@example.com",
      "fullName": "John Doe",
      "role": "employee",
      "department": "Engineering",
      "status": "active",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 5. GET /employees/pending - Get Pending Approvals (Admin Only)
**Method:** GET
**Headers:**
```
Authorization: Bearer ADMIN_ACCESS_TOKEN
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "pendingApprovals": [
      {
        "id": "uuid",
        "userId": "uuid",
        "email": "newemployee@example.com",
        "fullName": "New Employee",
        "role": "employee",
        "status": "pending",
        "createdAt": "timestamp",
        "updatedAt": "timestamp"
      }
    ]
  }
}
```

### 6. POST /employees/:id/approve - Approve Employee (Admin Only)
**Method:** POST
**Headers:**
```
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```
**URL Parameters:**
- `id`: Employee ID
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Employee approved successfully",
  "data": {
    "employee": {
      "id": "uuid",
      "userId": "uuid",
      "email": "newemployee@example.com",
      "fullName": "New Employee",
      "role": "employee",
      "status": "active",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 7. POST /employees/:id/reject - Reject Employee (Admin Only)
**Method:** POST
**Headers:**
```
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```
**URL Parameters:**
- `id`: Employee ID
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Employee registration rejected"
}
```

## Attendance Management Endpoints

Base URL: `http://localhost:3000/api/attendance`

### 1. POST /attendance/checkin - Check In
**Method:** POST
**Headers:**
```
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10
  },
  "notes": "Starting work"
}
```
**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "Checked in successfully",
  "data": {
    "attendance": {
      "id": "uuid",
      "employeeId": "uuid",
      "checkInTime": "timestamp",
      "status": "checked_in",
      "date": "2024-01-20",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "accuracy": 10
      },
      "notes": "Starting work",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 2. POST /attendance/checkout - Check Out
**Method:** POST
**Headers:**
```
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10
  },
  "notes": "End of day"
}
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Checked out successfully",
  "data": {
    "attendance": {
      "id": "uuid",
      "employeeId": "uuid",
      "checkInTime": "timestamp",
      "checkOutTime": "timestamp",
      "totalHours": 8.5,
      "status": "checked_out",
      "date": "2024-01-20",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "accuracy": 10
      },
      "notes": "End of day",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 3. GET /attendance/status - Get Current Status
**Method:** GET
**Headers:**
```
Authorization: Bearer ACCESS_TOKEN
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "attendance": {
      "id": "uuid",
      "employeeId": "uuid",
      "checkInTime": "timestamp",
      "status": "checked_in",
      "date": "2024-01-20",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

## Task Management Endpoints

Base URL: `http://localhost:3000/api/tasks`

### 1. POST /tasks - Create Task (Admin Only)
**Method:** POST
**Headers:**
```
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "title": "Complete project documentation",
  "description": "Write comprehensive documentation for the HR system",
  "assigneeId": "employee_uuid",
  "priority": "high",
  "dueDate": "2024-02-15"
}
```
**Expected Response (201 Created):**
```json
{
  "status": "success",
  "message": "Task created successfully",
  "data": {
    "task": {
      "id": "uuid",
      "title": "Complete project documentation",
      "description": "Write comprehensive documentation for the HR system",
      "assigneeId": "employee_uuid",
      "assignedBy": "admin_uuid",
      "status": "pending",
      "priority": "high",
      "dueDate": "2024-02-15",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

### 2. GET /tasks - Get All Tasks
**Method:** GET
**Headers:**
```
Authorization: Bearer ACCESS_TOKEN
```
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (pending/in_progress/completed/cancelled)
- `priority` (optional): Filter by priority (low/medium/high)
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Complete project documentation",
        "description": "Write comprehensive documentation for the HR system",
        "assigneeId": "employee_uuid",
        "assignedBy": "admin_uuid",
        "status": "pending",
        "priority": "high",
        "dueDate": "2024-02-15",
        "createdAt": "timestamp",
        "updatedAt": "timestamp"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### 3. GET /tasks/my-tasks - Get My Tasks
**Method:** GET
**Headers:**
```
Authorization: Bearer ACCESS_TOKEN
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Complete project documentation",
        "description": "Write comprehensive documentation for the HR system",
        "assigneeId": "employee_uuid",
        "assignedBy": "admin_uuid",
        "status": "pending",
        "priority": "high",
        "dueDate": "2024-02-15",
        "createdAt": "timestamp",
        "updatedAt": "timestamp"
      }
    ]
  }
}
```

### 4. PATCH /tasks/:id/status - Update Task Status
**Method:** PATCH
**Headers:**
```
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```
**URL Parameters:**
- `id`: Task ID
**Body (JSON):**
```json
{
  "status": "completed"
}
```
**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Task status updated successfully",
  "data": {
    "task": {
      "id": "uuid",
      "title": "Complete project documentation",
      "description": "Write comprehensive documentation for the HR system",
      "assigneeId": "employee_uuid",
      "assignedBy": "admin_uuid",
      "status": "completed",
      "priority": "high",
      "dueDate": "2024-02-15",
      "completedAt": "timestamp",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }
}
```

## Authentication Required
All endpoints except the authentication endpoints themselves require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Role-Based Access
- **Admin**: Full access to all endpoints
- **Employee**: Limited access (can only see/update own data, update task status, etc.)

## Error Handling
All endpoints return errors in this format:
```json
{
  "status": "error",
  "message": "Error description"
}
```

Common status codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error
