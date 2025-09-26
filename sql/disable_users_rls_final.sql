-- Final fix for users table RLS
-- Run this in Supabase SQL Editor

-- 1. Drop all existing policies
DROP POLICY IF EXISTS "allow_all_operations" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can manage all users" ON users;
DROP POLICY IF EXISTS "HR can manage users" ON users;
DROP POLICY IF EXISTS "Public read access" ON users;
DROP POLICY IF EXISTS "Authenticated users can read" ON users;
DROP POLICY IF EXISTS "Service role can do anything" ON users;

-- 2. Disable RLS completely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Grant all permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;
GRANT ALL ON users TO public;
GRANT ALL ON users TO service_role;

-- 4. Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- 5. Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('age', 'gender', 'address', 'contact_no', 'positions', 'profile_picture')
ORDER BY ordinal_position;
