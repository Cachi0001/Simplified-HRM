-- Set one attendance record to auto_clocked_out = TRUE for testing
-- Run this in Supabase SQL Editor

-- First, check current records
SELECT 
  a.id,
  e.full_name,
  a.date,
  a.clock_in,
  a.clock_out,
  a.auto_clocked_out
FROM attendance a
JOIN employees e ON a.employee_id = e.id
WHERE a.date >= CURRENT_DATE - INTERVAL '7 days'
  AND a.clock_out IS NOT NULL
ORDER BY a.date DESC
LIMIT 5;

-- Set the most recent clocked-out record to auto_clocked_out = TRUE
UPDATE attendance
SET auto_clocked_out = TRUE
WHERE id = (
  SELECT id 
  FROM attendance 
  WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    AND clock_out IS NOT NULL
  ORDER BY date DESC
  LIMIT 1
)
RETURNING 
  id,
  date,
  clock_in,
  clock_out,
  auto_clocked_out;

-- Verify the update
SELECT 
  e.full_name,
  a.date,
  a.clock_in,
  a.clock_out,
  a.auto_clocked_out,
  a.hours_worked
FROM attendance a
JOIN employees e ON a.employee_id = e.id
WHERE a.auto_clocked_out = TRUE
ORDER BY a.date DESC;
