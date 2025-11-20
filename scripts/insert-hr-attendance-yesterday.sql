-- Insert HR attendance for yesterday (November 19, 2025)
-- Clock in: 7:50 AM, Clock out: 5:00 PM

-- First, find the HR employee ID
DO $$
DECLARE
    v_hr_employee_id UUID;
    v_yesterday_date DATE;
    v_clock_in_time TIMESTAMPTZ;
    v_clock_out_time TIMESTAMPTZ;
    v_hours_worked DECIMAL;
    v_office_lat DOUBLE PRECISION;
    v_office_lng DOUBLE PRECISION;
BEGIN
    -- Get yesterday's date
    v_yesterday_date := CURRENT_DATE - INTERVAL '1 day';
    
    -- Find HR employee
    SELECT id INTO v_hr_employee_id
    FROM employees
    WHERE role = 'hr' AND status = 'active'
    LIMIT 1;
    
    IF v_hr_employee_id IS NULL THEN
        RAISE EXCEPTION 'No HR employee found';
    END IF;
    
    RAISE NOTICE 'HR Employee ID: %', v_hr_employee_id;
    RAISE NOTICE 'Date: %', v_yesterday_date;
    
    -- Delete existing attendance for yesterday if any
    DELETE FROM attendance
    WHERE employee_id = v_hr_employee_id AND date = v_yesterday_date;
    
    RAISE NOTICE 'Deleted existing attendance records';
    
    -- Get office location
    SELECT office_lat, office_lng INTO v_office_lat, v_office_lng
    FROM working_hours_config
    LIMIT 1;
    
    -- If no config, use default Lagos coordinates
    IF v_office_lat IS NULL THEN
        v_office_lat := 6.5244;
        v_office_lng := 3.3792;
    END IF;
    
    -- Create timestamps for yesterday
    -- Clock in at 7:50 AM
    v_clock_in_time := v_yesterday_date + TIME '07:50:00';
    
    -- Clock out at 5:00 PM
    v_clock_out_time := v_yesterday_date + TIME '17:00:00';
    
    -- Calculate hours worked (9 hours 10 minutes = 9.167 hours)
    v_hours_worked := EXTRACT(EPOCH FROM (v_clock_out_time - v_clock_in_time)) / 3600;
    
    RAISE NOTICE 'Clock In: %', v_clock_in_time;
    RAISE NOTICE 'Clock Out: %', v_clock_out_time;
    RAISE NOTICE 'Hours Worked: %', v_hours_worked;
    
    -- Insert attendance record
    INSERT INTO attendance (
        employee_id,
        date,
        clock_in,
        clock_out,
        clock_in_lat,
        clock_in_lng,
        clock_in_address,
        clock_out_lat,
        clock_out_lng,
        clock_out_address,
        hours_worked,
        status,
        is_late,
        late_minutes,
        notes
    ) VALUES (
        v_hr_employee_id,
        v_yesterday_date,
        v_clock_in_time,
        v_clock_out_time,
        v_office_lat,
        v_office_lng,
        'Office Location',
        v_office_lat,
        v_office_lng,
        'Office Location',
        v_hours_worked,
        'present',  -- On time (7:50 AM is before 9:00 AM)
        FALSE,      -- Not late
        0,          -- 0 late minutes
        'Manual entry - arrived on time at 7:50 AM, left at 5:00 PM'
    );
    
    RAISE NOTICE 'Successfully inserted attendance record!';
    
END $$;

-- Verify the insertion
SELECT 
    e.full_name,
    e.email,
    a.date,
    a.clock_in,
    a.clock_out,
    a.hours_worked,
    a.status,
    a.is_late,
    a.late_minutes,
    a.notes
FROM attendance a
JOIN employees e ON a.employee_id = e.id
WHERE e.role = 'hr' 
  AND a.date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY a.date DESC;
