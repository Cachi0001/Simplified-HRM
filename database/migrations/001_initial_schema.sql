-- This file contains the SQL statements to be executed for the initial schema setup.
-- Each statement is separated by a semicolon.

-- 1. Extend the public.tasks table
ALTER TABLE public.tasks
ADD COLUMN performance_rating INT,
ADD COLUMN notifications BOOLEAN DEFAULT FALSE,
ADD COLUMN due_time TIME;

-- 2. Create the public.departments table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    team_lead_id UUID REFERENCES public.employees(id),
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Extend the public.employees table
ALTER TABLE public.employees
ADD COLUMN profile_updated_at TIMESTAMPTZ,
ADD COLUMN performance_score FLOAT DEFAULT 0;

-- 4. Create the public.leave_requests table
CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id),
    type TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create the public.purchase_requests table
CREATE TABLE public.purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id),
    item_name TEXT,
    amount FLOAT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create the public.group_chats table
CREATE TABLE public.group_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID,
    sender_id UUID,
    message TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create the public.chat_participants table
CREATE TABLE public.chat_participants (
    chat_id UUID,
    user_id UUID,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Real-Time Attendance Arrival Tracking
ALTER TABLE public.attendance
ADD COLUMN minutes_late INTEGER DEFAULT 0;