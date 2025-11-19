-- Check if auto_clocked_out column exists and has data
-- Run this in Supabase SQL Editor

-- 1. Check if column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance' 
  AND column_name = 'auto_clocked_out';

-- 2. Check current attendance records
SELECT 
  e.full_name,
  a.date,
  a.clock_in,
  a.clock_out,
  a.auto_clocked_out,
  a.hours_worked
FROM attendance a
JOIN employees e ON a.employee_id = e.id
WHERE a.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.date DESC, e.full_name;

-- 3. Count auto-clocked out records
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN auto_clocked_out = TRUE THEN 1 END) as auto_clocked_out_count,
  COUNT(CASE WHEN auto_clocked_out = FALSE THEN 1 END) as manual_clocked_out_count,
  COUNT(CASE WHEN auto_clocked_out IS NULL THEN 1 END) as null_count
FROM attendance
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- 4. If no auto-clocked out records exist, manually set one for testing
-- UPDATE attendance
-- SET auto_clocked_out = TRUE
-- WHERE date = CURRENT_DATE
--   AND clock_out IS NOT NULL
-- LIMIT 1;

-- 5. After updating, verify
-- SELECT 
--   e.full_name,
--   a.date,
--   a.auto_clocked_out
-- FROM attendance a
-- JOIN employees e ON a.employee_id = e.id
-- WHERE a.date = CURRENT_DATE
--   AND a.auto_clocked_out = TRUE;
