-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR NOW
-- ============================================

-- Step 1: Add auto_clocked_out column
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS auto_clocked_out BOOLEAN DEFAULT FALSE;

-- Step 2: Clock out all users who are still clocked in TODAY
UPDATE attendance
SET 
    clock_out = NOW(),
    hours_worked = EXTRACT(EPOCH FROM (NOW() - clock_in)) / 3600,
    auto_clocked_out = FALSE,
    status = 'present',
    updated_at = NOW()
WHERE date = CURRENT_DATE
  AND clock_in IS NOT NULL
  AND clock_out IS NULL;

-- Step 3: Check the results
SELECT 
    e.full_name,
    a.clock_in,
    a.clock_out,
    a.hours_worked,
    a.auto_clocked_out
FROM attendance a
JOIN employees e ON a.employee_id = e.id
WHERE a.date = CURRENT_DATE
ORDER BY e.full_name;
