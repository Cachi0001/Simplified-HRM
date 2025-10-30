-- Check what employees exist in the database
SELECT 'Employees table exists:' as info, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'employees' AND table_schema = 'public') as exists;

-- Show all employees if table exists
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'employees' AND table_schema = 'public') THEN
        RAISE NOTICE 'Employees found:';
        -- This will show in the query results
    ELSE
        RAISE NOTICE 'No employees table found';
    END IF;
END $$;

-- Show employees data if table exists
SELECT 
    'Current employees:' as info,
    id, 
    email, 
    full_name, 
    role, 
    status, 
    active
FROM public.employees 
WHERE active = true
ORDER BY full_name;