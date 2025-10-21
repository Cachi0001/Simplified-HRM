# Database Signup Error Fix Guide

## 🚨 Problem Identified
The "Database error saving new user" error is likely caused by one of these issues:

1. **Row Level Security (RLS) policies** preventing user registration
2. **Duplicate email** in the employees table
3. **Missing database schema** or table structure issues
4. **Permission issues** with the service role key

## 🔧 Quick Fix Steps

### Step 1: Update Database Schema
Run this SQL in your **Supabase SQL Editor**:

```sql
-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Users can create their own employee record" ON public.employees;
DROP POLICY IF EXISTS "Users can view their own employee record" ON public.employees;
DROP POLICY IF EXISTS "Users can update their own employee record" ON public.employees;

-- Create proper RLS policies for employee self-registration
CREATE POLICY "Users can create their own employee record" ON public.employees
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own employee record" ON public.employees
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own employee record" ON public.employees
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies (keep these for admin functionality)
CREATE POLICY "Admins can view all employees" ON public.employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can update employee status" ON public.employees
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );
```

### Step 2: Run Debug Script
Execute this in your backend directory:

```bash
cd backend
node ../debug-database.js
```

This will show you:
- ✅ Whether tables exist
- ✅ User authentication status
- ✅ Employee record status
- ✅ Database permissions
- ✅ Specific error details

### Step 3: Run Auto-Fix Script
If the debug shows missing records, run:

```bash
node ../fix-database.js
```

This will automatically:
- ✅ Create missing employee records
- ✅ Fix duplicate email issues
- ✅ Test database permissions

## 📋 Manual Checks

### Check for Duplicate Emails
```sql
-- See if email exists multiple times
SELECT email, COUNT(*) FROM employees GROUP BY email HAVING COUNT(*) > 1;

-- Check specific user
SELECT * FROM employees WHERE email = 'passioncaleb5@gmail.com';
```

### Check User Auth Status
```sql
-- Check if user exists in auth
SELECT email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'passioncaleb5@gmail.com';
```

### Reset User for Testing
If you need to start fresh:
```sql
-- Delete employee record
DELETE FROM employees WHERE email = 'passioncaleb5@gmail.com';

-- Delete auth user (CAREFUL - this deletes the entire user)
DELETE FROM auth.users WHERE email = 'passioncaleb5@gmail.com';
```

## 🔍 What the Enhanced Logging Will Show

With the new detailed logging, you'll see:

```
🔍 [AuthController] Signup request received
🔍 [AuthService] Starting user signup process
🔍 [SupabaseAuthRepository] Checking for existing users...
🔍 [SupabaseAuthRepository] Existing user check
🆕 [SupabaseAuthRepository] Creating new Supabase auth user...
✅ [SupabaseAuthRepository] Supabase auth user created successfully
👤 [SupabaseAuthRepository] Creating employee record in database...
🔍 [SupabaseAuthRepository] Checking employees table structure...
✅ [SupabaseAuthRepository] Employees table exists, inserting record...
❌ [SupabaseAuthRepository] Failed to create employee record
   error: violates row-level security policy for table "employees"
   details: null
   hint: null
   code: 42501
```

## 🛠️ Most Likely Solutions

### Solution 1: RLS Policy Issue
**If you see:** `violates row-level security policy`
**Fix:** Run the SQL above to update RLS policies

### Solution 2: Duplicate Email
**If you see:** `duplicate key value violates unique constraint`
**Fix:** Delete duplicate records or reset the user

### Solution 3: Schema Issues
**If you see:** `column "xyz" does not exist`
**Fix:** Ensure the employees table has all required columns

## 🚀 After Fixing

1. **Test signup** with a new email address
2. **Check logs** to see the detailed process
3. **Verify notifications** work for both admin and employee
4. **Test approval workflow** through the admin dashboard

## 📞 If Still Having Issues

1. **Run the debug script** first to identify the exact problem
2. **Check Supabase logs** in the dashboard
3. **Verify environment variables** are correct
4. **Test with a completely new email** to isolate the issue

The enhanced logging will show you exactly where the process fails and what error occurs, making it much easier to identify and fix the root cause.
