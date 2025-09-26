-- Simple unrestricted users table setup (no storage modifications)
-- This focuses only on the users table permissions

-- Step 1: Disable RLS completely on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (brute force approach)
DROP POLICY IF EXISTS "Allow all SELECT operations" ON public.users;
DROP POLICY IF EXISTS "Allow all INSERT operations" ON public.users;
DROP POLICY IF EXISTS "Allow all UPDATE operations" ON public.users;
DROP POLICY IF EXISTS "Allow all DELETE operations" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admin can manage all users" ON public.users;
DROP POLICY IF EXISTS "HR can manage users" ON public.users;
DROP POLICY IF EXISTS "Public read access" ON public.users;

-- Step 3: Drop any remaining policies using dynamic SQL
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY ' || quote_ident(policy_name) || ' ON public.users';
        RAISE NOTICE 'Forcefully dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Step 4: Grant FULL unrestricted access to ALL roles
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO public;

-- Step 5: Handle sequence permissions safely
DO $$ 
DECLARE
    seq_name TEXT;
    seq_record RECORD;
BEGIN
    -- Try to find the sequence using pg_get_serial_sequence
    SELECT pg_get_serial_sequence('public.users', 'id') INTO seq_name;
    
    IF seq_name IS NOT NULL THEN
        BEGIN
            EXECUTE 'GRANT ALL ON ' || seq_name || ' TO anon';
            EXECUTE 'GRANT ALL ON ' || seq_name || ' TO authenticated';
            EXECUTE 'GRANT ALL ON ' || seq_name || ' TO service_role';
            EXECUTE 'GRANT ALL ON ' || seq_name || ' TO public';
            RAISE NOTICE 'Granted permissions on sequence: %', seq_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not grant permissions on sequence: % (Error: %)', seq_name, SQLERRM;
        END;
    ELSE
        -- Search for any sequence that might be related to users table
        FOR seq_record IN 
            SELECT schemaname, sequencename, 
                   schemaname||'.'||sequencename as full_name
            FROM pg_sequences 
            WHERE sequencename LIKE '%users%' 
               OR sequencename LIKE 'users_%'
        LOOP
            BEGIN
                EXECUTE 'GRANT ALL ON ' || seq_record.full_name || ' TO anon';
                EXECUTE 'GRANT ALL ON ' || seq_record.full_name || ' TO authenticated';
                EXECUTE 'GRANT ALL ON ' || seq_record.full_name || ' TO service_role';
                EXECUTE 'GRANT ALL ON ' || seq_record.full_name || ' TO public';
                RAISE NOTICE 'Granted permissions on found sequence: %', seq_record.full_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not grant permissions on sequence: % (Error: %)', seq_record.full_name, SQLERRM;
            END;
        END LOOP;
        
        IF NOT FOUND THEN
            RAISE NOTICE 'No sequences found for users table - this is fine if ID uses identity or other mechanism';
        END IF;
    END IF;
END $$;

-- Step 6: Grant schema usage permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO public;

-- Step 7: Verify the setup
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled",
    tableowner
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Check remaining policies (should be empty)
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND grantee IN ('anon', 'authenticated', 'service_role', 'public')
ORDER BY grantee, privilege_type;

-- Final confirmation
DO $$ 
BEGIN
    RAISE NOTICE '=== USERS TABLE IS NOW COMPLETELY UNRESTRICTED ===';
    RAISE NOTICE 'RLS has been disabled on users table';
    RAISE NOTICE 'All policies have been removed from users table';
    RAISE NOTICE 'Full permissions granted to all roles on users table';
    RAISE NOTICE 'Storage permissions skipped (requires superuser access)';
    RAISE NOTICE 'Test user creation now - all fields should save properly!';
    RAISE NOTICE 'If profile pictures still have issues, contact your Supabase admin for storage permissions';
END $$;
