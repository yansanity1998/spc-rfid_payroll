-- SIMPLE DEBUG: Just check table structure and test updates
-- This avoids the RFID column issue by focusing on existing users

-- 1. Show complete table structure
SELECT 'STEP 1: Complete users table structure' as step;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT 'STEP 2: RLS Status Check' as step;
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    'RLS is ' || CASE WHEN rowsecurity THEN 'ENABLED (PROBLEM!)' ELSE 'DISABLED (GOOD)' END as status
FROM pg_tables 
WHERE tablename = 'users';

-- 3. Check if new columns exist
SELECT 'STEP 3: New columns check' as step;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'age') 
        THEN 'age column EXISTS ✓' 
        ELSE 'age column MISSING ✗' 
    END as age_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'gender') 
        THEN 'gender column EXISTS ✓' 
        ELSE 'gender column MISSING ✗' 
    END as gender_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address') 
        THEN 'address column EXISTS ✓' 
        ELSE 'address column MISSING ✗' 
    END as address_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'contact_no') 
        THEN 'contact_no column EXISTS ✓' 
        ELSE 'contact_no column MISSING ✗' 
    END as contact_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'positions') 
        THEN 'positions column EXISTS ✓' 
        ELSE 'positions column MISSING ✗' 
    END as positions_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_picture') 
        THEN 'profile_picture column EXISTS ✓' 
        ELSE 'profile_picture column MISSING ✗' 
    END as profile_picture_status;

-- 4. Show sample of existing users (to see current data)
SELECT 'STEP 4: Sample existing users' as step;
SELECT 
    id, name, email, role,
    CASE WHEN age IS NULL THEN 'NULL' ELSE age::text END as age,
    CASE WHEN gender IS NULL THEN 'NULL' ELSE gender END as gender,
    CASE WHEN address IS NULL THEN 'NULL' ELSE address END as address,
    CASE WHEN contact_no IS NULL THEN 'NULL' ELSE contact_no END as contact_no,
    CASE WHEN positions IS NULL THEN 'NULL' ELSE positions END as positions,
    CASE WHEN profile_picture IS NULL THEN 'NULL' ELSE profile_picture END as profile_picture,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 3;

-- 5. Test update on existing user (if any exist)
SELECT 'STEP 5: Testing update on existing user' as step;

-- Update the most recent user with test data (using valid constraint values)
UPDATE users 
SET 
    age = 25,
    gender = 'Male',
    address = 'Test Address Update',
    contact_no = '09123456789',
    positions = 'Full Time',
    profile_picture = 'https://example.com/test.jpg'
WHERE id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1);

-- Show the updated user
SELECT 
    'Updated user:' as info,
    id, name, email,
    age, gender, address, contact_no, positions, profile_picture
FROM users 
WHERE id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1);

-- 6. Summary
SELECT 'STEP 6: Test Summary' as step;
SELECT 'If you see the updated values above, the database is working correctly!' as result;
SELECT 'If values are still NULL, there is a database permission or column issue.' as note;
