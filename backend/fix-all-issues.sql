-- Comprehensive Fix for All Backend Issues
-- Run this in Supabase SQL Editor

-- 1. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 2. Create the missing approve_employee_with_role function
CREATE OR REPLACE FUNCTION approve_employee_with_role(
    p_employee_id UUID,
    p_assigned_role TEXT,
    p_approved_by UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    employee_record RECORD;
    user_record RECORD;
    approver_record RECORD;
    result JSON;
BEGIN
    -- Get employee details
    SELECT * INTO employee_record 
    FROM employees 
    WHERE id = p_employee_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee with ID % not found', p_employee_id;
    END IF;

    -- Get user details
    SELECT * INTO user_record 
    FROM users 
    WHERE id = employee_record.user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with ID % not found', employee_record.user_id;
    END IF;

    -- Get approver details
    SELECT * INTO approver_record 
    FROM employees 
    WHERE user_id = p_approved_by;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approver with user ID % not found', p_approved_by;
    END IF;

    -- Update employee status and role
    UPDATE employees 
    SET 
        status = 'active',
        role = p_assigned_role,
        approved_by_id = p_approved_by,
        approved_at = NOW(),
        approval_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_employee_id;

    -- Update user role
    UPDATE users 
    SET 
        role = p_assigned_role,
        updated_at = NOW()
    WHERE id = employee_record.user_id;

    -- Insert approval history if table exists
    BEGIN
        INSERT INTO approval_history (
            employee_id,
            old_status,
            new_status,
            old_role,
            new_role,
            changed_by_id,
            changed_by_name,
            changed_by_role,
            reason,
            created_at
        ) VALUES (
            p_employee_id,
            employee_record.status,
            'active',
            employee_record.role,
            p_assigned_role,
            p_approved_by,
            approver_record.full_name,
            approver_record.role,
            p_reason,
            NOW()
        );
    EXCEPTION
        WHEN undefined_table THEN
            -- Ignore if approval_history table doesn't exist
            NULL;
    END;

    -- Build result JSON
    result := json_build_object(
        'success', true,
        'employee_id', p_employee_id,
        'old_status', employee_record.status,
        'new_status', 'active',
        'old_role', employee_record.role,
        'new_role', p_assigned_role,
        'approved_by', approver_record.full_name,
        'approved_at', NOW()
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to approve employee: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION approve_employee_with_role(UUID, TEXT, UUID, TEXT) TO authenticated;

-- 3. Create working days endpoints support
CREATE TABLE IF NOT EXISTS working_days_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb,
    start_time TIME DEFAULT '08:30:00',
    end_time TIME DEFAULT '17:00:00',
    break_duration INTEGER DEFAULT 60,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id)
);

-- RLS policies for working_days_config
ALTER TABLE working_days_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own working days config" ON working_days_config;
CREATE POLICY "Users can manage their own working days config" ON working_days_config
    FOR ALL USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM employees 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'hr')
        )
    );

-- 4. Create simple chat message function
CREATE OR REPLACE FUNCTION get_chat_messages_simple(
    p_chat_id VARCHAR,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF chat_messages
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM chat_messages 
    WHERE chat_id = p_chat_id 
    ORDER BY timestamp ASC 
    LIMIT p_limit 
    OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_chat_messages_simple(VARCHAR, INTEGER, INTEGER) TO authenticated;

-- 5. Update chat_messages RLS policy
DROP POLICY IF EXISTS "Users can send and view messages" ON chat_messages;
CREATE POLICY "Users can send and view messages" ON chat_messages
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id_timestamp ON chat_messages(chat_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_employees_id ON employees(id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_working_days_config_employee_id ON working_days_config(employee_id);

-- 7. Ensure proper table constraints
ALTER TABLE chat_messages 
    ALTER COLUMN sender_id SET NOT NULL,
    ALTER COLUMN message SET NOT NULL,
    ALTER COLUMN chat_id SET NOT NULL;

-- 8. Final schema refresh
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'All backend issues fixed successfully!' as result;