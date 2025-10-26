-- ======================================
-- SUPABASE DATABASE SCHEMA SETUP
-- Run these queries in your Supabase SQL Editor
-- ======================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================
-- USERS TABLE (Authentication)
-- ======================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    refresh_tokens JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================
-- EMPLOYEES TABLE (Employee Management)
-- ======================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    department VARCHAR(255),
    position VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================
-- TASKS TABLE (Task Management)
-- ======================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================
-- ATTENDANCE TABLE (Attendance Tracking)
-- ======================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('checked_in', 'checked_out')),
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per employee per day
    UNIQUE(employee_id, date)
);

-- ======================================
-- NOTIFICATIONS TABLE (Notification System)
-- ======================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'signup', 'approval', 'update', 'task', 'approval_success')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    actions JSONB,
    metadata JSONB,
    source VARCHAR(50) DEFAULT 'system' CHECK (source IN ('system', 'admin', 'employee')),
    category VARCHAR(50) DEFAULT 'system' CHECK (category IN ('dashboard', 'employee', 'system', 'approval', 'task')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================
-- CREATE INDEXES FOR PERFORMANCE
-- ======================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON public.users(email_verified);

-- Employees table indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Attendance table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON public.notifications(timestamp);

-- ======================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ======================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to verify email token
CREATE OR REPLACE FUNCTION verify_email_token(p_token TEXT)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    status VARCHAR
) AS $$
BEGIN
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
    AND (u.email_verification_expires IS NULL OR u.email_verification_expires > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ======================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users policies (users can only see their own data, admins can see all)
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Employees policies
CREATE POLICY "Employees can view own data" ON public.employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all employees" ON public.employees FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Employees can update own data" ON public.employees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL USING (
    EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND role = 'admin')
);

-- Tasks policies
CREATE POLICY "Users can view assigned tasks" ON public.tasks FOR SELECT USING (
    assigned_to = (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR
    created_by = (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (
    assigned_to = (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR
    created_by = (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND role = 'admin')
);

-- Attendance policies
CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT USING (
    employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can view all attendance" ON public.attendance FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can manage own attendance" ON public.attendance FOR ALL USING (
    employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (
    user_id = auth.uid() OR
    target_user_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (
    user_id = auth.uid() OR
    target_user_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- ======================================
-- CREATE ADMIN USER
-- ======================================
-- Run this query to create your first admin user
-- Replace with your actual email and password

-- INSERT INTO public.users (
--     email,
--     password_hash,
--     full_name,
--     role,
--     email_verified
-- ) VALUES (
--     'admin@yourcompany.com',
--     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6fEtTT2/Da', -- 'password123'
--     'Admin User',
--     'admin',
--     true
-- );

-- INSERT INTO public.employees (
--     user_id,
--     email,
--     full_name,
--     role,
--     status,
--     email_verified
-- ) VALUES (
--     (SELECT id FROM public.users WHERE email = 'admin@yourcompany.com'),
--     'admin@yourcompany.com',
--     'Admin User',
--     'admin',
--     'active',
--     true
-- );

-- ======================================
-- SAMPLE DATA (Optional)
-- ======================================

-- Sample employee
-- INSERT INTO public.users (email, password_hash, full_name, role, email_verified) VALUES
-- ('john.doe@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6fEtTT2/Da', 'John Doe', 'employee', false);

-- INSERT INTO public.employees (user_id, email, full_name, role, status, department) VALUES
-- ((SELECT id FROM public.users WHERE email = 'john.doe@company.com'), 'john.doe@company.com', 'John Doe', 'employee', 'pending', 'Engineering');

-- Sample task
-- INSERT INTO public.tasks (title, description, assigned_to, created_by, status, priority, due_date) VALUES
-- ('Complete project documentation', 'Write comprehensive documentation for the new features', (SELECT id FROM public.employees WHERE email = 'john.doe@company.com'), (SELECT id FROM public.employees WHERE role = 'admin' LIMIT 1), 'pending', 'high', NOW() + INTERVAL '7 days');

-- Sample attendance
-- INSERT INTO public.attendance (employee_id, status, check_in_time, date) VALUES
-- ((SELECT id FROM public.employees WHERE email = 'john.doe@company.com'), 'checked_in', NOW(), CURRENT_DATE);
