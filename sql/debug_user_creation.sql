-- Debug script to check user creation issues
-- Run this after attempting to create a user to see what was actually saved

-- Check the most recent user created
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
    department,
    hiredDate,
    status,
    created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for any NULL values in the most recent users
SELECT 
    'Recent users with NULL fields' as info,
    COUNT(*) as total_users,
    COUNT(age) as has_age,
    COUNT(gender) as has_gender,
    COUNT(address) as has_address,
    COUNT(contact_no) as has_contact,
    COUNT(positions) as has_positions
FROM (
    SELECT * FROM public.users 
    ORDER BY created_at DESC 
    LIMIT 10
) recent_users;

-- Check table structure to ensure columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('age', 'gender', 'address', 'contact_no', 'positions')
ORDER BY column_name;

-- Check if RLS is actually disabled
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Check current permissions on users table
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;
