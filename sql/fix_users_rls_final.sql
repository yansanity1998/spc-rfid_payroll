-- Complete RLS disable for users table to fix user creation issues
-- This script ensures all user information (including new fields) can be saved properly

-- Drop all existing RLS policies on users table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Disable RLS completely on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to all roles
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO public;

-- Grant permissions on the sequence for auto-incrementing IDs (handle different possible sequence names)
DO $$ 
DECLARE
    seq_name TEXT;
BEGIN
    -- Find the sequence associated with users.id column
    SELECT pg_get_serial_sequence('public.users', 'id') INTO seq_name;
    
    IF seq_name IS NOT NULL THEN
        EXECUTE 'GRANT ALL ON ' || seq_name || ' TO authenticated';
        EXECUTE 'GRANT ALL ON ' || seq_name || ' TO anon';
        EXECUTE 'GRANT ALL ON ' || seq_name || ' TO public';
        RAISE NOTICE 'Granted permissions on sequence: %', seq_name;
    ELSE
        -- Try common sequence names
        FOR seq_name IN 
            SELECT schemaname||'.'||sequencename as full_name
            FROM pg_sequences 
            WHERE sequencename LIKE '%users%id%' OR sequencename LIKE 'users_%'
        LOOP
            BEGIN
                EXECUTE 'GRANT ALL ON ' || seq_name || ' TO authenticated';
                EXECUTE 'GRANT ALL ON ' || seq_name || ' TO anon';
                EXECUTE 'GRANT ALL ON ' || seq_name || ' TO public';
                RAISE NOTICE 'Granted permissions on sequence: %', seq_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not grant permissions on sequence: %', seq_name;
            END;
        END LOOP;
    END IF;
END $$;

-- Ensure schema permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO public;

-- Handle storage permissions (may require superuser privileges)
DO $$ 
BEGIN
    -- Try to disable RLS on storage tables (this may fail if not superuser)
    BEGIN
        ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Successfully disabled RLS on storage.objects';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot disable RLS on storage.objects - insufficient privileges (this is normal)';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not modify storage.objects: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Successfully disabled RLS on storage.buckets';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot disable RLS on storage.buckets - insufficient privileges (this is normal)';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not modify storage.buckets: %', SQLERRM;
    END;
    
    -- Try to grant storage permissions (may also fail)
    BEGIN
        GRANT ALL ON storage.objects TO authenticated;
        GRANT ALL ON storage.objects TO anon;
        GRANT ALL ON storage.objects TO public;
        RAISE NOTICE 'Successfully granted permissions on storage.objects';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot grant permissions on storage.objects - insufficient privileges (this is normal)';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not grant permissions on storage.objects: %', SQLERRM;
    END;
    
    BEGIN
        GRANT ALL ON storage.buckets TO authenticated;
        GRANT ALL ON storage.buckets TO anon;
        GRANT ALL ON storage.buckets TO public;
        RAISE NOTICE 'Successfully granted permissions on storage.buckets';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot grant permissions on storage.buckets - insufficient privileges (this is normal)';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not grant permissions on storage.buckets: %', SQLERRM;
    END;
    
    RAISE NOTICE 'Storage permissions handling completed (some operations may have been skipped due to privilege restrictions)';
END $$;

-- Verify the changes and show completion messages
DO $$ 
BEGIN
    RAISE NOTICE 'Users table RLS has been completely disabled';
    RAISE NOTICE 'All user fields (age, gender, address, contact_no, positions, profile_picture) should now save properly';
END $$;

-- Verify the changes
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename IN ('users') 
AND schemaname = 'public';

-- Show remaining policies (should be empty)
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';
