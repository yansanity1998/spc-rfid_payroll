-- Test Settings Component Functionality
-- Run this after running fix_settings_complete.sql

-- 1. Check if users table has all required columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
    AND column_name IN ('profile_picture', 'age', 'gender', 'address', 'contact_no', 'positions')
ORDER BY column_name;

-- 2. Check users table RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN 'RLS is ENABLED (may cause issues)' 
         ELSE 'RLS is DISABLED (good for Settings)' END as status
FROM pg_tables 
LEFT JOIN pg_class ON pg_class.relname = pg_tables.tablename
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. Check storage bucket exists
SELECT 
    id,
    name,
    public,
    created_at,
    CASE WHEN public THEN 'Public bucket (good)' 
         ELSE 'Private bucket (may cause issues)' END as access_status
FROM storage.buckets 
WHERE id = 'profile-pictures';

-- 4. Check storage.objects RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN 'RLS is ENABLED (may cause upload issues)' 
         ELSE 'RLS is DISABLED (good for uploads)' END as status
FROM pg_tables 
LEFT JOIN pg_class ON pg_class.relname = pg_tables.tablename
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 5. Test user update permissions (simulate Settings component update)
-- This will show if the current user can update user records
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Try to perform a test update (this won't actually change data)
    PERFORM 1 FROM users LIMIT 1;
    test_result := 'SUCCESS: Can read users table';
    RAISE NOTICE '%', test_result;
    
    -- Check if we can perform updates
    IF EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE table_name = 'users' 
        AND privilege_type = 'UPDATE'
        AND grantee IN ('authenticated', 'anon', 'public')
    ) THEN
        RAISE NOTICE 'SUCCESS: Update permissions granted';
    ELSE
        RAISE NOTICE 'WARNING: Update permissions may be missing';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Cannot access users table - %', SQLERRM;
END $$;

-- 6. Summary report
SELECT 
    'Settings Component Readiness Check' as report_title,
    CASE 
        WHEN (
            -- Check all required columns exist
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_name = 'users' AND column_name IN 
             ('profile_picture', 'age', 'gender', 'address', 'contact_no', 'positions')) = 6
            AND
            -- Check users table RLS is disabled
            (SELECT NOT rowsecurity FROM pg_class WHERE relname = 'users') = true
            AND
            -- Check profile-pictures bucket exists
            (SELECT COUNT(*) FROM storage.buckets WHERE id = 'profile-pictures') = 1
            AND
            -- Check storage RLS is disabled
            (SELECT NOT rowsecurity FROM pg_class 
             WHERE relname = 'objects' AND relnamespace = 
             (SELECT oid FROM pg_namespace WHERE nspname = 'storage')) = true
        ) THEN 'READY - Settings component should work properly!'
        ELSE 'NOT READY - Please run fix_settings_complete.sql first'
    END as status;
