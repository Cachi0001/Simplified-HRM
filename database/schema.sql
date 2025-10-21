-- Go3net HR Notifications Schema
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'signup', 'approval', 'update')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    category TEXT NOT NULL CHECK (category IN ('dashboard', 'employee', 'system', 'approval')),
    source TEXT NOT NULL CHECK (source IN ('system', 'admin', 'employee')),
    target_user_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create push_subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Create employees table for HR management
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'inactive')) DEFAULT 'pending',
    role TEXT DEFAULT 'employee',
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for push_subscriptions
CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" ON public.push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);


CREATE POLICY "Users can create their own employee record" ON public.employees
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can-- Create RLS policies for employees view their own employee record" ON public.employees
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own employee record" ON public.employees
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all employees" ON public.employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can insert employees" ON public.employees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can update employees" ON public.employees
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create function to create notification for new employee signups
CREATE OR REPLACE FUNCTION public.create_employee_signup_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for admins
    INSERT INTO public.notifications (
        user_id,
        type,
        priority,
        title,
        message,
        category,
        source,
        target_user_id,
        metadata
    )
    SELECT
        admin_user.id,
        'signup',
        'high',
        'New Employee Signup',
        NEW.full_name || ' has signed up for an account',
        'employee',
        'system',
        NEW.id,
        jsonb_build_object('employee_id', NEW.id, 'employee_name', NEW.full_name)
    FROM auth.users admin_user
    WHERE admin_user.raw_user_meta_data->>'role' = 'admin';

    RETURN NEW;
END;
$$ language plpgsql;

-- Create trigger for employee signup notifications
CREATE TRIGGER trigger_employee_signup_notification
    AFTER INSERT ON public.employees
    FOR EACH ROW EXECUTE PROCEDURE public.create_employee_signup_notification();

-- Create function to create notification for employee approvals
CREATE OR REPLACE FUNCTION public.create_employee_approval_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification when status changes to active
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
        -- Insert notification for the employee
        INSERT INTO public.notifications (
            user_id,
            type,
            priority,
            title,
            message,
            category,
            source,
            metadata
        ) VALUES (
            NEW.user_id,
            'success',
            'normal',
            'Account Approved',
            'Your account has been approved and is now active',
            'employee',
            'system',
            jsonb_build_object('employee_id', NEW.id, 'status', NEW.status)
        );
    END IF;

    RETURN NEW;
END;
$$ language plpgsql;

-- Create trigger for employee approval notifications
CREATE TRIGGER trigger_employee_approval_notification
    AFTER UPDATE ON public.employees
    FOR EACH ROW EXECUTE PROCEDURE public.create_employee_approval_notification();

-- Insert some sample data for testing
INSERT INTO public.employees (full_name, email, status, role) VALUES
    ('John Doe', 'john.doe@go3net.com', 'active', 'employee'),
    ('Jane Smith', 'jane.smith@go3net.com', 'pending', 'employee'),
    ('Mike Johnson', 'mike.johnson@go3net.com', 'active', 'employee')
ON CONFLICT (email) DO NOTHING;
