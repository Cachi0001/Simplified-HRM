-- ======================================
-- SESSION 8: SUPABASE ROLE APPROVAL SETUP
-- ======================================
-- Comprehensive SQL setup for employee role approval workflow
-- with Super-Admin support and real-time updates

-- ======================================
-- 1. ALTER ROLES TO INCLUDE SUPER-ADMIN
-- ======================================

-- Update users table roles to include super-admin
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'employee', 'hr', 'super-admin'));

-- Update employees table roles to include super-admin
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check 
    CHECK (role IN ('admin', 'employee', 'hr', 'super-admin'));

-- ======================================
-- 2. CREATE APPROVAL WORKFLOW TABLE
-- ======================================

-- Create employee approval requests table
CREATE TABLE IF NOT EXISTS public.employee_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Approval status and history
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    previous_role VARCHAR(50),
    new_role VARCHAR(50) NOT NULL CHECK (new_role IN ('admin', 'employee', 'hr', 'super-admin')),
    
    -- Who approved/rejected
    approved_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_by_name VARCHAR(255),
    
    -- Timestamps and notes
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Real-time updates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_approvals_employee_id ON public.employee_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_approvals_user_id ON public.employee_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_approvals_status ON public.employee_approvals(status);
CREATE INDEX IF NOT EXISTS idx_employee_approvals_approved_by ON public.employee_approvals(approved_by_id);

-- ======================================
-- 3. CREATE APPROVAL HISTORY TABLE
-- ======================================

CREATE TABLE IF NOT EXISTS public.approval_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_role VARCHAR(50),
    new_role VARCHAR(50),
    changed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(255),
    changed_by_role VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_history_employee_id ON public.approval_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_changed_by ON public.approval_history(changed_by_id);

-- ======================================
-- 4. CREATE FUNCTION: APPROVE EMPLOYEE WITH ROLE
-- ======================================

CREATE OR REPLACE FUNCTION public.approve_employee_with_role(
    p_employee_id UUID,
    p_new_role VARCHAR(50),
    p_approved_by_id UUID,
    p_approved_by_name VARCHAR(255),
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    employee_id UUID,
    updated_role VARCHAR(50),
    status VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_old_role VARCHAR(50);
    v_old_status VARCHAR(50);
    v_approver_role VARCHAR(50);
BEGIN
    -- Get the user_id from employee
    SELECT user_id, role, status INTO v_user_id, v_old_role, v_old_status
    FROM public.employees
    WHERE id = p_employee_id;
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'Employee not found'::TEXT, p_employee_id, NULL::VARCHAR, NULL::VARCHAR;
        RETURN;
    END IF;
    
    -- Validate approver role (must be admin, hr, or super-admin)
    SELECT role INTO v_approver_role FROM public.users WHERE id = p_approved_by_id;
    
    IF v_approver_role NOT IN ('admin', 'hr', 'super-admin') THEN
        RETURN QUERY SELECT false, 'Unauthorized: Only admin, HR, or super-admin can approve'::TEXT, p_employee_id, NULL::VARCHAR, NULL::VARCHAR;
        RETURN;
    END IF;
    
    -- Validate new role
    IF p_new_role NOT IN ('admin', 'employee', 'hr', 'super-admin') THEN
        RETURN QUERY SELECT false, 'Invalid role. Must be admin, employee, hr, or super-admin'::TEXT, p_employee_id, NULL::VARCHAR, NULL::VARCHAR;
        RETURN;
    END IF;
    
    -- Begin transaction
    BEGIN
        -- Update employee role and status
        UPDATE public.employees
        SET
            role = p_new_role,
            status = 'active',
            updated_at = NOW()
        WHERE id = p_employee_id;
        
        -- Update corresponding user role
        UPDATE public.users
        SET
            role = p_new_role,
            updated_at = NOW()
        WHERE id = v_user_id;
        
        -- Update approval request
        UPDATE public.employee_approvals
        SET
            status = 'approved',
            new_role = p_new_role,
            approved_by_id = p_approved_by_id,
            approved_by_name = p_approved_by_name,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE employee_id = p_employee_id AND status = 'pending';
        
        -- Create history record
        INSERT INTO public.approval_history (
            employee_id,
            old_status,
            new_status,
            old_role,
            new_role,
            changed_by_id,
            changed_by_name,
            changed_by_role,
            reason
        )
        VALUES (
            p_employee_id,
            v_old_status,
            'active',
            v_old_role,
            p_new_role,
            p_approved_by_id,
            p_approved_by_name,
            v_approver_role,
            COALESCE(p_reason, 'Role approved')
        );
        
        RETURN QUERY
        SELECT
            true,
            'Employee approved successfully with role: ' || p_new_role || ''::TEXT,
            p_employee_id,
            p_new_role,
            'active';
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Error approving employee: ' || SQLERRM::TEXT, p_employee_id, NULL::VARCHAR, NULL::VARCHAR;
    END;
END;
$$;

-- ======================================
-- 5. CREATE FUNCTION: REJECT EMPLOYEE
-- ======================================

CREATE OR REPLACE FUNCTION public.reject_employee_request(
    p_employee_id UUID,
    p_rejected_by_id UUID,
    p_rejected_by_name VARCHAR(255),
    p_reason TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    employee_id UUID,
    status VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_rejector_role VARCHAR(50);
BEGIN
    -- Get the user_id from employee
    SELECT user_id INTO v_user_id
    FROM public.employees
    WHERE id = p_employee_id;
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'Employee not found'::TEXT, p_employee_id, NULL::VARCHAR;
        RETURN;
    END IF;
    
    -- Validate rejector role
    SELECT role INTO v_rejector_role FROM public.users WHERE id = p_rejected_by_id;
    
    IF v_rejector_role NOT IN ('admin', 'hr', 'super-admin') THEN
        RETURN QUERY SELECT false, 'Unauthorized: Only admin, HR, or super-admin can reject'::TEXT, p_employee_id, NULL::VARCHAR;
        RETURN;
    END IF;
    
    BEGIN
        -- Update employee status
        UPDATE public.employees
        SET
            status = 'rejected',
            updated_at = NOW()
        WHERE id = p_employee_id;
        
        -- Update approval request
        UPDATE public.employee_approvals
        SET
            status = 'rejected',
            approved_by_id = p_rejected_by_id,
            approved_by_name = p_rejected_by_name,
            rejection_reason = p_reason,
            updated_at = NOW()
        WHERE employee_id = p_employee_id AND status = 'pending';
        
        -- Create history record
        INSERT INTO public.approval_history (
            employee_id,
            old_status,
            new_status,
            changed_by_id,
            changed_by_name,
            changed_by_role,
            reason
        )
        VALUES (
            p_employee_id,
            (SELECT status FROM public.employees WHERE id = p_employee_id),
            'rejected',
            p_rejected_by_id,
            p_rejected_by_name,
            v_rejector_role,
            p_reason
        );
        
        RETURN QUERY
        SELECT
            true,
            'Employee request rejected successfully'::TEXT,
            p_employee_id,
            'rejected';
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Error rejecting employee: ' || SQLERRM::TEXT, p_employee_id, NULL::VARCHAR;
    END;
END;
$$;

-- ======================================
-- 6. CREATE FUNCTION: UPDATE ROLE DIRECTLY
-- ======================================

CREATE OR REPLACE FUNCTION public.update_employee_role(
    p_employee_id UUID,
    p_new_role VARCHAR(50),
    p_updated_by_id UUID,
    p_updated_by_name VARCHAR(255),
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    employee_id UUID,
    updated_role VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_old_role VARCHAR(50);
    v_updater_role VARCHAR(50);
BEGIN
    -- Get the user_id and current role from employee
    SELECT user_id, role INTO v_user_id, v_old_role
    FROM public.employees
    WHERE id = p_employee_id;
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'Employee not found'::TEXT, p_employee_id, NULL::VARCHAR;
        RETURN;
    END IF;
    
    -- Validate updater role (only admin or super-admin can update roles)
    SELECT role INTO v_updater_role FROM public.users WHERE id = p_updated_by_id;
    
    IF v_updater_role NOT IN ('admin', 'super-admin') THEN
        RETURN QUERY SELECT false, 'Unauthorized: Only admin or super-admin can update roles'::TEXT, p_employee_id, NULL::VARCHAR;
        RETURN;
    END IF;
    
    -- Validate new role
    IF p_new_role NOT IN ('admin', 'employee', 'hr', 'super-admin') THEN
        RETURN QUERY SELECT false, 'Invalid role. Must be admin, employee, hr, or super-admin'::TEXT, p_employee_id, NULL::VARCHAR;
        RETURN;
    END IF;
    
    BEGIN
        -- Update employee role
        UPDATE public.employees
        SET
            role = p_new_role,
            updated_at = NOW()
        WHERE id = p_employee_id;
        
        -- Update corresponding user role
        UPDATE public.users
        SET
            role = p_new_role,
            updated_at = NOW()
        WHERE id = v_user_id;
        
        -- Create history record
        INSERT INTO public.approval_history (
            employee_id,
            old_role,
            new_role,
            changed_by_id,
            changed_by_name,
            changed_by_role,
            reason
        )
        VALUES (
            p_employee_id,
            v_old_role,
            p_new_role,
            p_updated_by_id,
            p_updated_by_name,
            v_updater_role,
            COALESCE(p_reason, 'Role updated')
        );
        
        RETURN QUERY
        SELECT
            true,
            'Employee role updated successfully to: ' || p_new_role || ''::TEXT,
            p_employee_id,
            p_new_role;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Error updating employee role: ' || SQLERRM::TEXT, p_employee_id, NULL::VARCHAR;
    END;
END;
$$;

-- ======================================
-- 7. CREATE FUNCTION: GET PENDING APPROVALS
-- ======================================

CREATE OR REPLACE FUNCTION public.get_pending_approvals(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    employee_name VARCHAR,
    email VARCHAR,
    current_role VARCHAR,
    requested_role VARCHAR,
    status VARCHAR,
    requested_at TIMESTAMP WITH TIME ZONE,
    department VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role VARCHAR(50);
BEGIN
    -- Get current user's role
    SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;
    
    -- If not admin, hr, or super-admin, return empty
    IF v_user_role NOT IN ('admin', 'hr', 'super-admin') THEN
        RETURN;
    END IF;
    
    -- Return pending approvals
    RETURN QUERY
    SELECT
        ea.id,
        ea.employee_id,
        e.full_name,
        e.email,
        e.role,
        ea.new_role,
        ea.status::VARCHAR,
        ea.requested_at,
        e.department
    FROM public.employee_approvals ea
    JOIN public.employees e ON ea.employee_id = e.id
    WHERE ea.status = 'pending'
    ORDER BY ea.requested_at DESC;
END;
$$;

-- ======================================
-- 8. CREATE REALTIME TRIGGER
-- ======================================

-- Enable realtime on approval tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- ======================================
-- 9. UPDATE RLS POLICIES FOR APPROVALS
-- ======================================

-- Enable RLS on approval tables
ALTER TABLE public.employee_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own approval requests" ON public.employee_approvals;
DROP POLICY IF EXISTS "Admins and HR can view all approval requests" ON public.employee_approvals;
DROP POLICY IF EXISTS "Admins and HR can update approval requests" ON public.employee_approvals;
DROP POLICY IF EXISTS "Users can view their approval history" ON public.approval_history;
DROP POLICY IF EXISTS "Admins can view all approval history" ON public.approval_history;

-- Employee can view their own approval requests
CREATE POLICY "Users can view their own approval requests" ON public.employee_approvals
    FOR SELECT USING (
        user_id = (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email')
    );

-- Admin, HR, and Super-Admin can view all approval requests
CREATE POLICY "Admins and HR can view all approval requests" ON public.employee_approvals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON u.id = e.user_id
            WHERE u.email = auth.jwt() ->> 'email'
            AND e.role IN ('admin', 'hr', 'super-admin')
        )
    );

-- Admin, HR, and Super-Admin can insert/update approval requests
CREATE POLICY "Admins and HR can update approval requests" ON public.employee_approvals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON u.id = e.user_id
            WHERE u.email = auth.jwt() ->> 'email'
            AND e.role IN ('admin', 'hr', 'super-admin')
        )
    );

-- History visibility
CREATE POLICY "Users can view their approval history" ON public.approval_history
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM public.employees
            WHERE user_id = (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email')
        )
    );

CREATE POLICY "Admins can view all approval history" ON public.approval_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON u.id = e.user_id
            WHERE u.email = auth.jwt() ->> 'email'
            AND e.role IN ('admin', 'hr', 'super-admin')
        )
    );

-- ======================================
-- 10. VERIFY UPDATES
-- ======================================

-- Verify new constraints
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name IN ('users', 'employees')
AND constraint_type = 'CHECK';

-- Check employee_approvals table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employee_approvals'
ORDER BY ordinal_position;

-- Check approval_history table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'approval_history'
ORDER BY ordinal_position;

-- ======================================
-- MIGRATION COMPLETE
-- ======================================
-- ✅ Super-admin role added
-- ✅ Approval workflow implemented
-- ✅ Role update functions created
-- ✅ RLS policies configured
-- ✅ Real-time subscriptions enabled
-- ✅ Approval history tracking enabled

-- Next: Update backend to use these functions