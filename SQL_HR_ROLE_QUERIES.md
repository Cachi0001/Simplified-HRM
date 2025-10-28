# SQL Queries for HR Role Implementation

Quick copy-paste reference for Supabase SQL Editor

---

## 🔴 CRITICAL: Execute These First

### Add HR Role to Constraints

```sql
-- Step 1: Update users table constraint
ALTER TABLE public.users 
DROP CONSTRAINT users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'employee', 'hr'));

-- Step 2: Update employees table constraint
ALTER TABLE public.employees 
DROP CONSTRAINT employees_role_check;

ALTER TABLE public.employees
ADD CONSTRAINT employees_role_check 
CHECK (role IN ('admin', 'employee', 'hr'));

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role_hr ON public.users(role) 
WHERE role = 'hr';

CREATE INDEX IF NOT EXISTS idx_employees_role_hr ON public.employees(role) 
WHERE role = 'hr';
```

**Status:** Copy entire block, paste in Supabase, execute

---

## 📊 Optional: HR Permissions Management

```sql
-- Create HR Permissions Table
CREATE TABLE IF NOT EXISTS public.hr_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    can_approve_leave BOOLEAN DEFAULT TRUE,
    can_approve_purchase BOOLEAN DEFAULT TRUE,
    can_view_all_attendance BOOLEAN DEFAULT TRUE,
    can_manage_departments BOOLEAN DEFAULT FALSE,
    can_edit_employee_profiles BOOLEAN DEFAULT FALSE,
    can_send_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_permissions_employee_id 
ON public.hr_permissions(employee_id);

CREATE TRIGGER update_hr_permissions_updated_at 
BEFORE UPDATE ON public.hr_permissions 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
```

---

## 🧑‍💼 Convert User to HR Role

### Single User Conversion

```sql
-- Replace 'YOUR_EMPLOYEE_ID_HERE' with actual employee UUID
UPDATE public.employees
SET role = 'hr'
WHERE id = 'YOUR_EMPLOYEE_ID_HERE'
RETURNING id, full_name, email, role, department;
```

### Get Employee ID First

```sql
-- Find the employee by email
SELECT id, full_name, email, role, department
FROM public.employees
WHERE email = 'user@company.com'
LIMIT 1;
```

Then use the ID in the conversion query above.

---

## 🔍 Verify HR Role Setup

### Check All HR Constraints

```sql
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name IN ('users', 'employees')
AND constraint_type = 'CHECK'
ORDER BY table_name;
```

**Expected Output:**
- `users_role_check` on `users` table
- `employees_role_check` on `employees` table

### List All HR Users

```sql
SELECT 
    id,
    full_name,
    email,
    role,
    department,
    created_at
FROM public.employees
WHERE role = 'hr'
ORDER BY created_at DESC;
```

### Check HR Permissions

```sql
SELECT 
    hrp.id,
    e.full_name,
    e.email,
    e.department,
    hrp.can_approve_leave,
    hrp.can_approve_purchase,
    hrp.can_view_all_attendance,
    hrp.can_manage_departments,
    hrp.can_edit_employee_profiles,
    hrp.can_send_notifications
FROM public.hr_permissions hrp
JOIN public.employees e ON hrp.employee_id = e.id
ORDER BY e.full_name;
```

---

## 👥 Manage HR Permissions

### Set Permissions for HR User

```sql
-- Replace 'HR_EMPLOYEE_ID_HERE' with actual employee UUID
INSERT INTO public.hr_permissions (
    employee_id,
    can_approve_leave,
    can_approve_purchase,
    can_view_all_attendance,
    can_manage_departments,
    can_edit_employee_profiles,
    can_send_notifications
) VALUES (
    'HR_EMPLOYEE_ID_HERE',
    true,   -- can approve leave
    true,   -- can approve purchase
    true,   -- can view attendance
    false,  -- cannot manage departments
    false,  -- cannot edit profiles
    false   -- cannot send notifications
)
ON CONFLICT (employee_id) DO UPDATE SET
    can_approve_leave = true,
    can_approve_purchase = true,
    can_view_all_attendance = true,
    can_manage_departments = false,
    can_edit_employee_profiles = false,
    can_send_notifications = false;
```

### Grant All HR Permissions

```sql
-- For a specific HR employee - grant all permissions
UPDATE public.hr_permissions
SET 
    can_approve_leave = true,
    can_approve_purchase = true,
    can_view_all_attendance = true,
    can_manage_departments = true,
    can_edit_employee_profiles = true,
    can_send_notifications = true
WHERE employee_id = 'HR_EMPLOYEE_ID_HERE';
```

### Revoke Specific Permission

```sql
-- Revoke permission to edit employee profiles
UPDATE public.hr_permissions
SET can_edit_employee_profiles = false
WHERE employee_id = 'HR_EMPLOYEE_ID_HERE';
```

---

## 📊 Department Statistics

### Employees by Department

```sql
SELECT 
    department,
    COUNT(*) as total_employees,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'hr' THEN 1 END) as hr_staff,
    COUNT(CASE WHEN role = 'employee' THEN 1 END) as regular_employees
FROM public.employees
GROUP BY department
ORDER BY total_employees DESC;
```

### Department with HR Manager

```sql
SELECT 
    d.id,
    d.name,
    d.type,
    COUNT(e.id) as employee_count
FROM public.departments d
LEFT JOIN public.employees e ON e.department = d.name
GROUP BY d.id, d.name, d.type
ORDER BY employee_count DESC;
```

---

## 🔄 Role Management Queries

### Count Users by Role

```sql
SELECT 
    role,
    COUNT(*) as count
FROM public.employees
GROUP BY role;
```

### Promote Employee to HR

```sql
-- Option 1: Direct update
UPDATE public.employees
SET role = 'hr'
WHERE email = 'john.doe@company.com'
RETURNING full_name, email, role;

-- Option 2: Batch update (all in Engineering dept)
UPDATE public.employees
SET role = 'hr'
WHERE department = 'Engineering'
AND role = 'employee'
RETURNING full_name, email, department;
```

### Demote HR to Employee

```sql
UPDATE public.employees
SET role = 'employee'
WHERE id = 'HR_EMPLOYEE_ID_HERE'
RETURNING full_name, email, role;
```

### Revert Admin to HR

```sql
-- Careful! This removes admin privileges
UPDATE public.employees
SET role = 'hr'
WHERE id = 'ADMIN_EMPLOYEE_ID_HERE'
RETURNING full_name, email, role;
```

---

## 🗑️ Cleanup Queries

### Remove Old HR Permissions (if recreating table)

```sql
-- Backup first!
SELECT * FROM public.hr_permissions LIMIT 10;

-- Then delete
DELETE FROM public.hr_permissions;
```

### Remove HR Role from User

```sql
UPDATE public.employees
SET role = 'employee'
WHERE id = 'HR_EMPLOYEE_ID_HERE';
```

### Drop HR Permissions Table (if needed)

```sql
-- Warning: This removes the permissions table entirely
DROP TABLE IF EXISTS public.hr_permissions CASCADE;
```

---

## 🚀 Push Notification Setup (Optional)

### Add Push Token Support

```sql
-- Add column if not exists
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS push_token JSONB;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_employees_push_token 
ON public.employees USING GIN(push_token);
```

### Save Push Token

```sql
-- Update push token for an employee
UPDATE public.employees
SET push_token = jsonb_build_object(
    'endpoint', 'https://fcm.googleapis.com/...',
    'auth', 'XXXXXXXX',
    'p256dh', 'XXXXXXXX',
    'timestamp', NOW()::text
)
WHERE id = 'EMPLOYEE_ID_HERE';
```

### Create Notification Log Table

```sql
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_employee_id 
ON public.push_notification_logs(employee_id);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_status 
ON public.push_notification_logs(status);
```

---

## ✅ Verification Queries

### Full System Check

```sql
-- Run all verification checks
SELECT 'Checking role constraints...' as check_type;
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE (table_name = 'users' OR table_name = 'employees') 
AND constraint_type = 'CHECK';

-- Count users by role
SELECT 'Counting users by role...' as check_type;
SELECT role, COUNT(*) FROM public.employees GROUP BY role;

-- HR permissions status
SELECT 'HR permissions table status...' as check_type;
SELECT COUNT(*) as hr_permissions_records 
FROM public.hr_permissions;
```

---

## 📋 Execution Order

Follow this order for safe implementation:

1. ✅ **Execute:** Role constraints (CRITICAL)
2. ✅ **Execute:** Create HR permissions table (optional but recommended)
3. ✅ **Execute:** Verify constraints
4. ✅ **Execute:** Convert first user to HR
5. ✅ **Execute:** Set HR permissions
6. ✅ **Test:** Frontend role-based features
7. ✅ **Execute:** Batch convert to HR (if needed)
8. ✅ **Monitor:** Check logs for any issues

---

## 🆘 Troubleshooting

### Can't Update Role - Constraint Error

```
ERROR: new row for relation "employees" violates check constraint
```

**Solution:** Make sure constraint was added:
```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'employees' 
AND constraint_type = 'CHECK';
```

### HR Permissions Insert Fails

```
ERROR: relation "hr_permissions" does not exist
```

**Solution:** Create the table first:
```sql
CREATE TABLE IF NOT EXISTS public.hr_permissions (...)
```

### Check Role Not Updated

```sql
-- Verify update worked
SELECT id, full_name, role FROM public.employees 
WHERE id = 'YOUR_ID_HERE';
```

### Trigger Not Working

```sql
-- Check if update_updated_at_column function exists
SELECT proname FROM pg_proc 
WHERE proname = 'update_updated_at_column';
```

---

## 📝 Quick Reference

| Action | Query |
|--------|-------|
| Add HR role support | Execute role constraints block |
| Convert user to HR | `UPDATE employees SET role = 'hr' WHERE id = ...` |
| List all HR users | `SELECT * FROM employees WHERE role = 'hr'` |
| Set HR permissions | `INSERT INTO hr_permissions (...)` |
| Get HR stats | `SELECT role, COUNT(*) FROM employees GROUP BY role` |
| Verify constraints | Check information_schema.table_constraints |

---

**Last Updated:** Session 3
**Status:** Ready for Production
**Tested:** ✅ Yes