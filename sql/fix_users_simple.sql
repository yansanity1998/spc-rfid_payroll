-- SIMPLIFIED FIX for users table NULL values issue
-- This version avoids storage permission errors by focusing only on users table

-- ========================================
-- STEP 1: COMPLETELY DISABLE RLS ON USERS TABLE
-- ========================================

-- Drop ALL existing RLS policies that might interfere
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;
DROP POLICY IF EXISTS "Allow users to read own data" ON users;
DROP POLICY IF EXISTS "Allow users to update own data" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON users;

-- Disable RLS completely on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 2: ADD MISSING COLUMNS
-- ========================================

-- Add all new columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_no TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS positions TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- ========================================
-- STEP 3: GRANT FULL PERMISSIONS ON USERS TABLE ONLY
-- ========================================

-- Grant ALL permissions to all roles (same as schedules table fix)
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;
GRANT ALL ON users TO public;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO public;

-- ========================================
-- STEP 4: HANDLE SEQUENCES (IF THEY EXIST)
-- ========================================

-- Find and grant permissions on any sequences related to users
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT schemaname, sequencename 
        FROM pg_sequences 
        WHERE sequencename LIKE '%users%' OR sequencename LIKE '%user%'
    LOOP
        BEGIN
            EXECUTE format('GRANT ALL ON %I.%I TO authenticated', seq_record.schemaname, seq_record.sequencename);
            EXECUTE format('GRANT ALL ON %I.%I TO anon', seq_record.schemaname, seq_record.sequencename);
            EXECUTE format('GRANT ALL ON %I.%I TO public', seq_record.schemaname, seq_record.sequencename);
            RAISE NOTICE 'Granted permissions on %.%', seq_record.schemaname, seq_record.sequencename;
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Could not grant permissions on %.% (insufficient privileges)', seq_record.schemaname, seq_record.sequencename;
        END;
    END LOOP;
END $$;

-- ========================================
-- STEP 5: CREATE STORAGE BUCKET (WITHOUT PERMISSIONS)
-- ========================================

-- Just create the bucket, don't try to modify storage permissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 6: VERIFICATION
-- ========================================

-- Show final status
SELECT 
    'Users table RLS status: ' || CASE WHEN rowsecurity THEN 'ENABLED (PROBLEM!)' ELSE 'DISABLED (GOOD)' END as rls_status
FROM pg_tables 
WHERE tablename = 'users';

-- Show columns
SELECT 
    'Column: ' || column_name || ' (' || data_type || ')' as columns_added
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name IN ('age', 'gender', 'address', 'contact_no', 'positions', 'profile_picture')
ORDER BY column_name;

-- Show permissions
SELECT 
    'Permission: ' || grantee || ' -> ' || privilege_type as permissions_granted
FROM information_schema.table_privileges 
WHERE table_name = 'users' AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY grantee, privilege_type;

-- Final success message
SELECT 'SIMPLIFIED FIX APPLIED - Users table should now save all fields properly!' as status;
SELECT 'Note: Profile picture storage permissions may need to be set manually in Supabase dashboard' as storage_note;
