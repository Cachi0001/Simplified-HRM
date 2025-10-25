-- ======================================
-- SUPABASE QUERIES: User Management Operations
-- ======================================
-- This file contains all the SQL queries needed for user management
-- These will be used by the SupabaseAuthRepository

-- ======================================
-- USER OPERATIONS
-- ======================================

-- 1. CREATE USER
-- Used in: signUp()
INSERT INTO public.users (
    email,
    password_hash,
    full_name,
    role,
    email_verified,
    email_verification_token,
    email_verification_expires
) VALUES (
    $1, -- email
    $2, -- password_hash
    $3, -- full_name
    $4, -- role
    false, -- email_verified
    $5, -- email_verification_token
    NOW() + INTERVAL '1 hour' -- email_verification_expires
) RETURNING *;

-- 2. FIND USER BY EMAIL
-- Used in: signIn(), resetPassword()
SELECT * FROM public.users WHERE email = $1;

-- 3. FIND USER BY ID
-- Used in: getCurrentUser(), getEmployeeByUserId()
SELECT * FROM public.users WHERE id = $1;

-- 4. UPDATE USER EMAIL VERIFICATION
-- Used in: confirmEmailByToken()
UPDATE public.users
SET
    email_verified = $2,
    email_verification_token = CASE WHEN $2 = true THEN NULL ELSE $3 END,
    email_verification_expires = CASE WHEN $2 = true THEN NULL ELSE NOW() + INTERVAL '1 hour' END,
    updated_at = NOW()
WHERE id = $1;

-- 5. UPDATE USER PASSWORD RESET TOKEN
-- Used in: resetPassword()
UPDATE public.users
SET
    password_reset_token = $2,
    password_reset_expires = NOW() + INTERVAL '10 minutes',
    updated_at = NOW()
WHERE email = $1;

-- 6. UPDATE USER PASSWORD
-- Used in: resetPasswordWithToken(), updatePasswordByEmail()
UPDATE public.users
SET
    password_hash = $2,
    password_reset_token = NULL,
    password_reset_expires = NULL,
    refresh_tokens = ARRAY[]::TEXT[],
    updated_at = NOW()
WHERE id = $1;

-- 7. ADD REFRESH TOKEN
-- Used in: signIn(), refreshToken()
UPDATE public.users
SET
    refresh_tokens = array_append(refresh_tokens, $2),
    updated_at = NOW()
WHERE id = $1;

-- 8. REMOVE REFRESH TOKEN
-- Used in: signOut(), refreshToken()
UPDATE public.users
SET
    refresh_tokens = array_remove(refresh_tokens, $1),
    updated_at = NOW()
WHERE id = $2;

-- 9. CLEAR ALL REFRESH TOKENS
-- Used in: signOut(), password reset operations
UPDATE public.users
SET
    refresh_tokens = ARRAY[]::TEXT[],
    updated_at = NOW()
WHERE id = $1;

-- ======================================
-- EMPLOYEE OPERATIONS
-- ======================================

-- 1. CREATE EMPLOYEE
-- Used in: signUp()
INSERT INTO public.employees (
    user_id,
    email,
    full_name,
    role,
    status,
    email_verified,
    email_verification_token,
    email_verification_expires
) VALUES (
    $1, -- user_id
    $2, -- email
    $3, -- full_name
    $4, -- role
    $5, -- status (pending/active)
    false, -- email_verified
    $6, -- email_verification_token
    NOW() + INTERVAL '1 hour' -- email_verification_expires
) RETURNING *;

-- 2. FIND EMPLOYEE BY USER ID
-- Used in: signIn(), getCurrentUser()
SELECT * FROM public.employees WHERE user_id = $1;

-- 3. FIND EMPLOYEE BY EMAIL
-- Used in: getEmployeeByUserId() alternative
SELECT * FROM public.employees WHERE email = $1;

-- 4. UPDATE EMPLOYEE STATUS
-- Used in: Admin approval process
UPDATE public.employees
SET
    status = $2,
    updated_at = NOW()
WHERE user_id = $1;

-- 5. UPDATE EMPLOYEE EMAIL VERIFICATION
-- Used in: confirmEmailByToken()
UPDATE public.employees
SET
    email_verified = $2,
    email_verification_token = CASE WHEN $2 = true THEN NULL ELSE $3 END,
    email_verification_expires = CASE WHEN $2 = true THEN NULL ELSE NOW() + INTERVAL '1 hour' END,
    updated_at = NOW()
WHERE user_id = $1;

-- 6. UPDATE EMPLOYEE PASSWORD RESET
-- Used in: resetPassword()
UPDATE public.employees
SET
    password_reset_token = $2,
    password_reset_expires = NOW() + INTERVAL '10 minutes',
    updated_at = NOW()
WHERE user_id = $1;

-- ======================================
-- VERIFICATION & VALIDATION QUERIES
-- ======================================

-- 1. VERIFY EMAIL TOKEN
-- Used in: confirmEmailByToken()
SELECT
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.email_verified,
    e.status,
    e.id as employee_id
FROM public.users u
LEFT JOIN public.employees e ON u.id = e.user_id
WHERE u.email_verification_token = $1
AND u.email_verification_expires > NOW()
AND u.email_verified = false;

-- 2. VERIFY PASSWORD RESET TOKEN
-- Used in: resetPasswordWithToken()
SELECT
    u.id,
    u.email,
    u.full_name
FROM public.users u
WHERE u.password_reset_token = $1
AND u.password_reset_expires > NOW();

-- 3. CHECK USER EXISTS BY EMAIL
-- Used in: signUp() to check duplicates
SELECT id FROM public.users WHERE email = $1;

-- 4. GET USER WITH EMPLOYEE DATA
-- Used in: signIn(), getCurrentUser()
SELECT
    u.*,
    e.status as employee_status,
    e.department,
    e.position,
    e.phone,
    e.address,
    e.date_of_birth,
    e.hire_date,
    e.profile_picture
FROM public.users u
LEFT JOIN public.employees e ON u.id = e.user_id
WHERE u.id = $1;

-- ======================================
-- ADMIN OPERATIONS
-- ======================================

-- 1. GET ALL EMPLOYEES FOR ADMIN
-- Used in: Admin dashboard
SELECT
    e.*,
    u.email_verified,
    u.created_at
FROM public.employees e
LEFT JOIN public.users u ON e.user_id = u.id
ORDER BY e.created_at DESC;

-- 2. GET EMPLOYEES BY STATUS
-- Used in: Admin approval workflow
SELECT
    e.*,
    u.email_verified,
    u.created_at
FROM public.employees e
LEFT JOIN public.users u ON e.user_id = u.id
WHERE e.status = $1
ORDER BY e.created_at DESC;

-- 3. GET PENDING APPROVALS COUNT
-- Used in: Admin dashboard
SELECT COUNT(*) as pending_count
FROM public.employees
WHERE status = 'pending';

-- ======================================
-- BULK OPERATIONS
-- ======================================

-- 1. UPDATE USER AND EMPLOYEE EMAIL VERIFICATION
-- Used in: confirmEmailByToken()
-- This updates both tables in a single transaction
WITH user_update AS (
    UPDATE public.users
    SET
        email_verified = true,
        email_verification_token = NULL,
        email_verification_expires = NULL,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
),
employee_update AS (
    UPDATE public.employees
    SET
        email_verified = true,
        email_verification_token = NULL,
        email_verification_expires = NULL,
        updated_at = NOW()
    WHERE user_id = $1
    RETURNING id
)
SELECT u.*, e.* FROM public.users u
LEFT JOIN public.employees e ON u.id = e.user_id
WHERE u.id = $1;

-- 2. DELETE USER CASCADE
-- Used in: Account deletion (if needed)
DELETE FROM public.employees WHERE user_id = $1;
DELETE FROM public.users WHERE id = $1;

-- ======================================
-- SEARCH AND FILTER QUERIES
-- ======================================

-- 1. SEARCH USERS BY EMAIL
-- Used in: Admin user search
SELECT u.*, e.status, e.department, e.position
FROM public.users u
LEFT JOIN public.employees e ON u.id = e.user_id
WHERE u.email ILIKE $1;

-- 2. SEARCH EMPLOYEES BY NAME
-- Used in: Admin employee search
SELECT e.*, u.email_verified
FROM public.employees e
LEFT JOIN public.users u ON e.user_id = u.id
WHERE e.full_name ILIKE $1;

-- 3. GET EMPLOYEES BY DEPARTMENT
-- Used in: Admin filtering
SELECT e.*, u.email_verified
FROM public.employees e
LEFT JOIN public.users u ON e.user_id = u.id
WHERE e.department = $1;

-- ======================================
-- TOKEN VALIDATION QUERIES
-- ======================================

-- 1. VALIDATE REFRESH TOKEN
-- Used in: refreshToken()
SELECT id, email, role, refresh_tokens
FROM public.users
WHERE id = $1
AND $2 = ANY(refresh_tokens);

-- 2. GET USER BY REFRESH TOKEN
-- Used in: refreshToken()
SELECT u.*, e.status
FROM public.users u
LEFT JOIN public.employees e ON u.id = e.user_id
WHERE $1 = ANY(u.refresh_tokens);

-- ======================================
-- STATISTICS QUERIES
-- ======================================

-- 1. USER REGISTRATION STATS
-- Used in: Admin dashboard
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
    COUNT(CASE WHEN email_verified = false THEN 1 END) as unverified_users
FROM public.users;

-- 2. EMPLOYEE STATUS STATS
-- Used in: Admin dashboard
SELECT
    status,
    COUNT(*) as count
FROM public.employees
GROUP BY status;

-- ======================================
-- CLEANUP QUERIES
-- ======================================

-- 1. CLEAN EXPIRED TOKENS
-- Used in: Maintenance/cron job
UPDATE public.users
SET
    email_verification_token = NULL,
    email_verification_expires = NULL
WHERE email_verification_expires < NOW();

UPDATE public.users
SET
    password_reset_token = NULL,
    password_reset_expires = NULL
WHERE password_reset_expires < NOW();

-- 2. REMOVE EXPIRED REFRESH TOKENS
-- Used in: Maintenance/cron job
UPDATE public.users
SET refresh_tokens = ARRAY(
    SELECT token FROM unnest(refresh_tokens) AS token
    WHERE token NOT IN (
        SELECT jwt_token FROM (
            SELECT unnest(refresh_tokens) as jwt_token
        ) expired_tokens
        -- Add JWT expiration check logic here if needed
    )
)
WHERE array_length(refresh_tokens, 1) > 0;

-- ======================================
-- EDGE FUNCTION CALLS
-- ======================================
-- For operations that need to be done via Edge Functions:

-- Update user email verification (via RPC)
SELECT public.update_user_email_verification($1, $2, $3);

-- Update employee status (via RPC)
SELECT public.update_employee_status($1, $2, $3);

-- Generate verification token (via RPC)
SELECT public.generate_verification_token();

-- Verify email token (via RPC)
SELECT * FROM public.verify_email_token($1, $2);

-- Verify password reset token (via RPC)
SELECT * FROM public.verify_password_reset_token($1, $2);
