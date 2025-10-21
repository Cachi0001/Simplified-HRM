# Database Debug Instructions

## Problem
You're getting a "Database error saving new user" error during signup. This could be due to several issues:

1. **Email already exists** in the employees table
2. **RLS policy violation** - insufficient permissions
3. **Schema mismatch** - table columns don't match expected structure
4. **Missing table** - employees table doesn't exist

## Quick Fix Steps

### 1. Check Database Schema
Run this SQL in your Supabase SQL editor:

```sql
-- Check if employees table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'employees';

-- Check employees table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'employees';
```

### 2. Run Debug Script
Execute this command in your backend directory:

```bash
cd backend
node ../debug-database.js
```

This will show you:
- ✅ Whether the employees table exists
- ✅ What the table schema looks like
- ✅ Whether the problematic user exists in auth
- ✅ Whether an employee record already exists
- ✅ Test database permissions

### 3. Common Issues & Solutions

#### Issue: Email Already Exists
**Symptoms:** User can sign in but signup fails
**Solution:**
```sql
-- Check if email exists in employees table
SELECT * FROM employees WHERE email = 'passioncaleb5@gmail.com';

-- If exists, check status
UPDATE employees SET status = 'active' WHERE email = 'passioncaleb5@gmail.com';
```

#### Issue: RLS Policy Violation
**Symptoms:** "violates row-level security policy" error
**Solution:** Update RLS policies in Supabase SQL editor:
```sql
-- Allow users to create their own employee record
CREATE POLICY "Users can create their own employee record" ON public.employees
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### Issue: Schema Mismatch
**Symptoms:** "column does not exist" error
**Solution:** Ensure employees table has these columns:
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, REFERENCES auth.users)
- `full_name` (TEXT)
- `email` (TEXT, UNIQUE)
- `status` (TEXT)
- `role` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 4. Manual Database Setup

If the debug script shows the employees table doesn't exist, run the schema:

```sql
-- Copy and run the entire schema.sql file content
-- Make sure to update RLS policies as shown above
```

### 5. Check Environment Variables

Ensure these are set in your backend `.env` file:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Expected Debug Output

When you run the debug script, you should see:
```
🔍 Database Debug Tool
==================================================
✅ Supabase configuration found
🔗 URL: https://your-project.supabase.co

📋 Checking database tables...

🔍 Checking employees table...
✅ Employees table exists
   Sample data: [...]

👤 Checking Supabase auth users...
✅ Found 5 auth users

🔍 Found problematic user in auth:
   ID: 7c1ab418-cf9f-4a04-b48b-2ddda344898e
   Email: passioncaleb5@gmail.com
   Confirmed: ✅
   Created: 2025-10-21T21:09:07.000Z

🔍 Checking if employee record exists for test user...
❌ No employee record found for user 7c1ab418-cf9f-4a04-b48b-2ddda344898e

🔐 Testing database permissions...
✅ Test insertion successful!
🧹 Test record cleaned up

💡 Next Steps:
1. Run this script: node debug-database.js
2. Check the output for specific error details
3. Update database schema if needed
4. Fix RLS policies if permission errors
```

## Quick Fix Commands

### Reset User Status (if email exists but status is wrong):
```sql
UPDATE employees SET status = 'active' WHERE email = 'passioncaleb5@gmail.com';
```

### Clear Test Data (if needed):
```sql
DELETE FROM employees WHERE email LIKE 'test%';
```

### Check for Duplicate Emails:
```sql
SELECT email, COUNT(*) FROM employees GROUP BY email HAVING COUNT(*) > 1;
```

## Next Steps After Debug

1. **Run the debug script** to identify the exact issue
2. **Fix the database schema** if columns are missing
3. **Update RLS policies** if permissions are insufficient
4. **Clear duplicate data** if emails are duplicated
5. **Test signup again** with the fixed database

The detailed logging I added will show you exactly where the process fails and what error occurs.
