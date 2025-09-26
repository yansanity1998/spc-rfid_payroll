-- Test direct insert to users table to verify RLS is properly disabled
-- This will help identify if the issue is in the Edge Function or database permissions

-- First, let's test a direct insert with all fields
INSERT INTO public.users (
    rfid_id,
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
    status
) VALUES (
    999999,
    'Test User Direct Insert',
    'test-direct@example.com',
    'Faculty',
    30,
    'Male',
    '123 Test Street, Test City',
    '+1234567890',
    'Full Time',
    'CCS',
    '2024-01-01',
    'Active'
);

-- Check if the insert worked with all fields
SELECT 
    id,
    rfid_id,
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
WHERE email = 'test-direct@example.com';

-- Clean up the test record
-- DELETE FROM public.users WHERE email = 'test-direct@example.com';
