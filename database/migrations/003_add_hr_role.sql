-- Migration: Add HR Role to the System
-- Created: Session 3
-- Description: Adds 'hr' as a valid role in users and employees tables

-- Step 1: Update users table role constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'employee', 'hr'));

-- Step 2: Update employees table role constraint
ALTER TABLE public.employees 
DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE public.employees
ADD CONSTRAINT employees_role_check 
CHECK (role IN ('admin', 'employee', 'hr'));

-- Step 3: Create index for efficient HR role queries
CREATE INDEX IF NOT EXISTS idx_users_role_hr ON public.users(role) 
WHERE role = 'hr';

CREATE INDEX IF NOT EXISTS idx_employees_role_hr ON public.employees(role) 
WHERE role = 'hr';

-- Step 4: Add new HR-specific columns (optional but recommended)
-- Uncomment if you want to track HR-specific data
/*
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS hr_permissions JSONB DEFAULT '{"approve_leave": true, "approve_purchase": true, "view_all_attendance": true}',
ADD COLUMN IF NOT EXISTS is_department_lead BOOLEAN DEFAULT FALSE;
*/

-- Step 5: Create HR permissions table for more granular control (optional)
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

-- Step 6: Create index on HR permissions table
CREATE INDEX IF NOT EXISTS idx_hr_permissions_employee_id ON public.hr_permissions(employee_id);

-- Step 7: Add trigger for updated_at on hr_permissions
CREATE TRIGGER update_hr_permissions_updated_at 
BEFORE UPDATE ON public.hr_permissions 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Update RLS policies to account for HR role
-- Allow HR to view all employees in their department or all employees if they have permission
CREATE POLICY "HR can view employees in their department" 
ON public.employees 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.employees hr
        WHERE hr.user_id = auth.uid() 
        AND hr.role = 'hr' 
        AND (hr.department = employees.department OR hr.department IS NULL)
    )
);

-- Allow HR to update employee profiles (if permitted)
CREATE POLICY "HR can update employee profiles" 
ON public.employees 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.hr_permissions
        WHERE employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() AND role = 'hr')
        AND can_edit_employee_profiles = TRUE
    )
);

-- Add push_token support for notifications (if not already present)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS push_token JSONB;

CREATE INDEX IF NOT EXISTS idx_employees_push_token ON public.employees USING GIN(push_token);

-- Step 9: Create notification log table for auditing
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_employee_id ON public.push_notification_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_status ON public.push_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_created_at ON public.push_notification_logs(created_at);

-- Add trigger for updated_at on push_notification_logs
CREATE TRIGGER update_push_notification_logs_updated_at 
BEFORE UPDATE ON public.push_notification_logs 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Verify migration
-- Run this SELECT to confirm all constraints and indexes are in place
/*
SELECT 
    'Users table constraints' as check_item,
    constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND constraint_type = 'CHECK'

UNION ALL

SELECT 
    'Employees table constraints' as check_item,
    constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'employees' 
AND constraint_type = 'CHECK'

UNION ALL

SELECT 
    'HR role index status' as check_item,
    indexname 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname LIKE '%hr%';
*/