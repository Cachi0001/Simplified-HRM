-- Comprehensive Schema Fixes Migration
-- This migration addresses all critical database schema issues and function corrections

-- Add missing columns to leave_requests table
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add missing columns to purchase_requests table  
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS vendor TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS reason TEXT;

-- Update purchase_requests to have proper constraints
ALTER TABLE purchase_requests ALTER COLUMN unit_price SET NOT NULL;

-- Create or replace the create_leave_request function with proper parameter handling
CREATE OR REPLACE FUNCTION create_leave_request(
    p_employee_id UUID,
    p_type TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result_record leave_requests%ROWTYPE;
BEGIN
    -- Validate required parameters
    IF p_employee_id IS NULL THEN
        RETURN json_build_object('error', 'Employee ID is required');
    END IF;
    
    IF p_type IS NULL THEN
        RETURN json_build_object('error', 'Leave type is required');
    END IF;
    
    IF p_start_date IS NULL THEN
        RETURN json_build_object('error', 'Start date is required');
    END IF;
    
    IF p_end_date IS NULL THEN
        RETURN json_build_object('error', 'End date is required');
    END IF;
    
    -- Validate date range
    IF p_start_date > p_end_date THEN
        RETURN json_build_object('error', 'Start date cannot be after end date');
    END IF;
    
    -- Insert the leave request
    INSERT INTO leave_requests (
        employee_id,
        type,
        start_date,
        end_date,
        reason,
        notes,
        status,
        created_at,
        updated_at
    )
    VALUES (
        p_employee_id,
        p_type,
        p_start_date,
        p_end_date,
        p_reason,
        p_notes,
        'pending',
        NOW(),
        NOW()
    )
    RETURNING * INTO result_record;
    
    -- Return properly formatted JSON
    RETURN json_build_object(
        'id', result_record.id,
        'employee_id', result_record.employee_id,
        'type', result_record.type,
        'start_date', result_record.start_date,
        'end_date', result_record.end_date,
        'reason', result_record.reason,
        'notes', result_record.notes,
        'status', result_record.status,
        'created_at', result_record.created_at,
        'updated_at', result_record.updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the get_leave_requests function with proper JSON response
CREATE OR REPLACE FUNCTION get_leave_requests(p_employee_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', lr.id,
            'employee_id', lr.employee_id,
            'type', lr.type,
            'start_date', lr.start_date,
            'end_date', lr.end_date,
            'reason', lr.reason,
            'notes', lr.notes,
            'status', lr.status,
            'created_at', lr.created_at,
            'updated_at', lr.updated_at,
            'employee_name', e.full_name,
            'employee_email', e.email,
            'department', e.department
        ) ORDER BY lr.created_at DESC
    )
    INTO result_json
    FROM leave_requests lr
    LEFT JOIN employees e ON lr.employee_id = e.id
    WHERE (p_employee_id IS NULL OR lr.employee_id = p_employee_id);
    
    RETURN COALESCE(result_json, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing create_purchase_request function to avoid conflicts
DROP FUNCTION IF EXISTS create_purchase_request;

-- Create the create_purchase_request function with corrected parameter order and new fields
CREATE OR REPLACE FUNCTION create_purchase_request(
    p_employee_id UUID,
    p_item_name TEXT,
    p_unit_price NUMERIC,
    p_description TEXT DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_vendor TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_urgency TEXT DEFAULT 'normal',
    p_justification TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_budget_code TEXT DEFAULT NULL,
    p_expected_delivery_date DATE DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result_record purchase_requests%ROWTYPE;
    total_amount NUMERIC;
BEGIN
    -- Validate required parameters
    IF p_employee_id IS NULL THEN
        RETURN json_build_object('error', 'Employee ID is required');
    END IF;
    
    IF p_item_name IS NULL OR p_item_name = '' THEN
        RETURN json_build_object('error', 'Item name is required');
    END IF;
    
    IF p_unit_price IS NULL OR p_unit_price <= 0 THEN
        RETURN json_build_object('error', 'Valid unit price is required');
    END IF;
    
    -- Calculate total amount
    total_amount := p_unit_price * COALESCE(p_quantity, 1);
    
    -- Insert the purchase request
    INSERT INTO purchase_requests (
        employee_id, 
        item_name, 
        description,
        quantity,
        unit_price,
        amount,
        vendor,
        category,
        notes,
        reason,
        status,
        created_at,
        updated_at
    )
    VALUES (
        p_employee_id, 
        p_item_name, 
        p_description,
        COALESCE(p_quantity, 1),
        p_unit_price,
        total_amount,
        p_vendor,
        p_category,
        p_notes,
        p_reason,
        'pending',
        NOW(),
        NOW()
    )
    RETURNING * INTO result_record;
    
    -- Return properly formatted JSON
    RETURN json_build_object(
        'id', result_record.id,
        'employee_id', result_record.employee_id,
        'item_name', result_record.item_name,
        'description', result_record.description,
        'quantity', result_record.quantity,
        'unit_price', result_record.unit_price,
        'amount', result_record.amount,
        'total_amount', result_record.amount,
        'vendor', result_record.vendor,
        'category', result_record.category,
        'urgency', p_urgency,
        'justification', p_justification,
        'notes', result_record.notes,
        'reason', result_record.reason,
        'budget_code', p_budget_code,
        'expected_delivery_date', p_expected_delivery_date,
        'status', result_record.status,
        'created_at', result_record.created_at,
        'updated_at', result_record.updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_purchase_requests function to include new fields
CREATE OR REPLACE FUNCTION get_purchase_requests(p_employee_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result_json JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', pr.id,
            'employee_id', pr.employee_id,
            'item_name', pr.item_name,
            'description', pr.description,
            'quantity', COALESCE(pr.quantity, 1),
            'unit_price', pr.unit_price,
            'amount', pr.amount,
            'total_amount', pr.amount,
            'vendor', pr.vendor,
            'category', pr.category,
            'notes', pr.notes,
            'reason', pr.reason,
            'status', pr.status,
            'created_at', pr.created_at,
            'updated_at', pr.updated_at,
            'employee_name', e.full_name,
            'employee_email', e.email,
            'department', e.department
        ) ORDER BY pr.created_at DESC
    )
    INTO result_json
    FROM purchase_requests pr
    LEFT JOIN employees e ON pr.employee_id = e.id
    WHERE (p_employee_id IS NULL OR pr.employee_id = p_employee_id);
    
    RETURN COALESCE(result_json, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update leave request status
CREATE OR REPLACE FUNCTION update_leave_request_status(
    p_request_id UUID,
    p_status TEXT,
    p_approved_by UUID DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL,
    p_approval_comments TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result_record RECORD;
BEGIN
    UPDATE leave_requests 
    SET 
        status = p_status,
        notes = COALESCE(p_approval_comments, notes),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO result_record;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Leave request not found');
    END IF;
    
    -- Get additional employee information
    SELECT 
        lr.*,
        e.full_name as employee_name,
        e.email as employee_email
    INTO result_record
    FROM leave_requests lr
    LEFT JOIN employees e ON lr.employee_id = e.id
    WHERE lr.id = p_request_id;
    
    RETURN row_to_json(result_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON leave_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_type ON leave_requests(type);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_employee_id ON purchase_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON purchase_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_category ON purchase_requests(category);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_unit_price ON purchase_requests(unit_price);

-- Grant execute permissions to authenticated users for new functions
GRANT EXECUTE ON FUNCTION create_leave_request(UUID, TEXT, DATE, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leave_requests(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_leave_request_status(UUID, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_purchase_request(UUID, TEXT, NUMERIC, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_purchase_requests(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_leave_request IS 'Creates a new leave request with proper validation and JSON response';
COMMENT ON FUNCTION get_leave_requests IS 'Retrieves leave requests with employee details';
COMMENT ON FUNCTION update_leave_request_status IS 'Updates leave request status with proper JSON response';
COMMENT ON FUNCTION create_purchase_request IS 'Creates a new purchase request with all required fields and proper JSON response';
COMMENT ON FUNCTION get_purchase_requests IS 'Retrieves purchase requests with employee details and all fields';

-- Update existing data to ensure consistency
UPDATE purchase_requests SET quantity = 1 WHERE quantity IS NULL;
UPDATE purchase_requests SET unit_price = amount WHERE unit_price IS NULL AND amount IS NOT NULL;
UPDATE purchase_requests SET amount = unit_price * quantity WHERE amount IS NULL AND unit_price IS NOT NULL AND quantity IS NOT NULL;