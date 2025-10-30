-- Quick check of current chat_messages table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'chat_messages'
);

-- Check current data
SELECT COUNT(*) as message_count FROM public.chat_messages;
SELECT COUNT(*) as employee_count FROM public.employees WHERE active = true;