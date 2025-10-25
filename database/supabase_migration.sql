-- ======================================
-- SUPABASE MIGRATION: User Management System
-- ======================================
-- This migration creates the complete user management system
-- with email verification and approval workflow

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================
-- USERS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),

    -- Email verification
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMP WITH TIME ZONE,

    -- Password reset
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,

    -- Refresh tokens (JSON array stored as text)
    refresh_tokens TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON public.users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON public.users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ======================================
-- EMPLOYEES TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'employee')),

    -- Employee-specific fields
    department VARCHAR(255),
    position VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    date_of_birth DATE,
    hire_date DATE,
    profile_picture TEXT,

    -- Status and verification
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected')),
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMP WITH TIME ZONE,

    -- Password reset (duplicate for employee records)
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for employees table
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);

-- Unique constraint on user_id (one employee record per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_id_unique ON public.employees(user_id);

-- ======================================
-- FUNCTIONS FOR USER MANAGEMENT
-- ======================================

-- Function to update user email verification status
CREATE OR REPLACE FUNCTION public.update_user_email_verification(
    p_user_id UUID,
    p_email_verified BOOLEAN,
    p_token TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update users table
    UPDATE public.users
    SET
        email_verified = p_email_verified,
        email_verification_token = CASE
            WHEN p_email_verified = true THEN NULL
            ELSE p_token
        END,
        email_verification_expires = CASE
            WHEN p_email_verified = true THEN NULL
            ELSE NOW() + INTERVAL '1 hour'
        END,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update employees table
    UPDATE public.employees
    SET
        email_verified = p_email_verified,
        email_verification_token = CASE
            WHEN p_email_verified = true THEN NULL
            ELSE p_token
        END,
        email_verification_expires = CASE
            WHEN p_email_verified = true THEN NULL
            ELSE NOW() + INTERVAL '1 hour'
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- Function to update employee status
CREATE OR REPLACE FUNCTION public.update_employee_status(
    p_user_id UUID,
    p_status VARCHAR(50),
    p_admin_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate status
    IF p_status NOT IN ('active', 'pending', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be active, pending, or rejected';
    END IF;

    -- Update employees table
    UPDATE public.employees
    SET
        status = p_status,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log the status change (optional - for audit trail)
    INSERT INTO public.employee_status_history (
        employee_id,
        previous_status,
        new_status,
        changed_by,
        changed_at
    )
    SELECT
        e.id,
        e.status,
        p_status,
        p_admin_user_id,
        NOW()
    FROM public.employees e
    WHERE e.user_id = p_user_id;
END;
$$;

-- Function to generate email verification token
CREATE OR REPLACE FUNCTION public.generate_verification_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a secure random token
    token := encode(gen_random_bytes(32), 'hex');
    RETURN token;
END;
$$;

-- Function to generate password reset token
CREATE OR REPLACE FUNCTION public.generate_password_reset_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a secure random token
    token := encode(gen_random_bytes(32), 'hex');
    RETURN token;
END;
$$;

-- Function to verify email verification token
CREATE OR REPLACE FUNCTION public.verify_email_token(
    p_token TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    employee_status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Find user by token
    IF p_user_id IS NOT NULL THEN
        -- Verify specific user
        RETURN QUERY
        SELECT
            u.id,
            u.email,
            u.full_name,
            u.role,
            e.status
        FROM public.users u
        LEFT JOIN public.employees e ON u.id = e.user_id
        WHERE u.id = p_user_id
        AND u.email_verification_token = p_token
        AND u.email_verification_expires > NOW()
        AND u.email_verified = false;
    ELSE
        -- Find any user by token
        RETURN QUERY
        SELECT
            u.id,
            u.email,
            u.full_name,
            u.role,
            e.status
        FROM public.users u
        LEFT JOIN public.employees e ON u.id = e.user_id
        WHERE u.email_verification_token = p_token
        AND u.email_verification_expires > NOW()
        AND u.email_verified = false;
    END IF;
END;
$$;

-- Function to verify password reset token
CREATE OR REPLACE FUNCTION public.verify_password_reset_token(
    p_token TEXT,
    p_email VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    full_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_email IS NOT NULL THEN
        -- Verify specific user
        RETURN QUERY
        SELECT
            u.id,
            u.email,
            u.full_name
        FROM public.users u
        WHERE u.email = p_email
        AND u.password_reset_token = p_token
        AND u.password_reset_expires > NOW();
    ELSE
        -- Find any user by token
        RETURN QUERY
        SELECT
            u.id,
            u.email,
            u.full_name
        FROM public.users u
        WHERE u.password_reset_token = p_token
        AND u.password_reset_expires > NOW();
    END IF;
END;
$$;

-- ======================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ======================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to both tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ======================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ======================================

-- Enable RLS on both tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Employees can read their own employee data
CREATE POLICY "Users can view own employee data" ON public.employees
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users
            WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can update own employee data" ON public.employees
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM public.users
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Admins can view all data
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON u.id = e.user_id
            WHERE u.email = auth.jwt() ->> 'email'
            AND e.role = 'admin'
        )
    );

CREATE POLICY "Admins can view all employees" ON public.employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON u.id = e.user_id
            WHERE u.email = auth.jwt() ->> 'email'
            AND e.role = 'admin'
        )
    );

-- ======================================
-- MIGRATION COMPLETE
-- ======================================
-- Migration completed successfully!
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update your application code to use Supabase client
-- 3. Test the authentication flows
-- 4. Set up environment variables for Supabase connection
