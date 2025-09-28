-- Diagnostic script to check users table status and identify issues
-- Run this first to see what's wrong

-- 1. Check if new columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name IN ('age', 'gender', 'address', 'contact_no', 'positions', 'profile_picture')
ORDER BY column_name;

-- 2. Check RLS status on users table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    'RLS is ' || CASE WHEN rowsecurity THEN 'ENABLED (BAD)' ELSE 'DISABLED (GOOD)' END as rls_status
FROM pg_tables 
WHERE tablename = 'users';

-- 3. Check existing RLS policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 4. Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'users'
ORDER BY grantee, privilege_type;

-- 5. Check storage bucket status
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets 
WHERE id = 'profile-pictures';

-- 6. Check storage RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    'Storage RLS is ' || CASE WHEN rowsecurity THEN 'ENABLED (BAD)' ELSE 'DISABLED (GOOD)' END as rls_status
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 7. Sample a few users to see current data
SELECT 
    id,
    name,
    email,
    role,
    age,
    gender,
    address,
    contact_no,
    positions,
    profile_picture,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Show summary
SELECT 'DIAGNOSTIC COMPLETE - Check results above to identify issues' as status;
