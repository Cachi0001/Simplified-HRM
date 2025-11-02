-- Fix RLS issues for authentication
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

-- Drop any problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Employees can view own profile" ON public.employees;
DROP POLICY IF EXISTS "Employees can update own profile" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;