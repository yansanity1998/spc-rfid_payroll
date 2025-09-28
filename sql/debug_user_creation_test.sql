-- DEBUG SCRIPT: Test user creation and field updates
-- Run this to check if the database is ready and test manual updates

-- 1. Check current database status
SELECT 'STEP 1: Checking database status...' as step;

-- Check if columns exist (including RFID column)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    'Column exists: ' || column_name as status
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND (column_name IN ('age', 'gender', 'address', 'contact_no', 'positions', 'profile_picture')
         OR column_name LIKE '%rfid%' OR column_name LIKE '%id%')
ORDER BY column_name;

-- Show ALL columns in users table to identify the correct structure
SELECT 'All columns in users table:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    'RLS is ' || CASE WHEN rowsecurity THEN 'ENABLED (BAD!)' ELSE 'DISABLED (GOOD)' END as status
FROM pg_tables 
WHERE tablename = 'users';

-- 2. Test manual insert to see if database accepts the data
SELECT 'STEP 2: Testing manual data insert...' as step;

-- Insert a test user with all fields
INSERT INTO users (
    rfid_id, name, email, role, status, password,
    age, gender, address, contact_no, positions, profile_picture
) VALUES (
    999999, 'Test User', 'test@example.com', 'Faculty', 'Active', 'test123',
    25, 'Male', '123 Test Street', '09123456789', 'Full Time', 'https://example.com/test.jpg'
) ON CONFLICT (rfid_id) DO UPDATE SET
    age = EXCLUDED.age,
    gender = EXCLUDED.gender,
    address = EXCLUDED.address,
    contact_no = EXCLUDED.contact_no,
    positions = EXCLUDED.positions,
    profile_picture = EXCLUDED.profile_picture;

-- 3. Verify the test data was saved
SELECT 'STEP 3: Verifying test data...' as step;

SELECT 
    id, name, email, role,
    age, gender, address, contact_no, positions, profile_picture,
    'All fields: ' || 
    CASE 
        WHEN age IS NOT NULL AND gender IS NOT NULL AND address IS NOT NULL 
             AND contact_no IS NOT NULL AND positions IS NOT NULL AND profile_picture IS NOT NULL 
        THEN 'SAVED SUCCESSFULLY ✓'
        ELSE 'SOME FIELDS ARE NULL ✗'
    END as test_result
FROM users 
WHERE email = 'test@example.com';

-- 4. Test update operation (similar to what the app does)
SELECT 'STEP 4: Testing update operation...' as step;

UPDATE users 
SET 
    age = 30,
    gender = 'Female',
    address = '456 Update Street',
    contact_no = '09987654321',
    positions = 'Part Time',
    profile_picture = 'https://example.com/updated.jpg'
WHERE email = 'test@example.com';

-- Verify update worked
SELECT 
    'After update: ' || name as user_name,
    age, gender, address, contact_no, positions, profile_picture,
    'Update result: ' || 
    CASE 
        WHEN age = 30 AND gender = 'Female' AND address = '456 Update Street'
        THEN 'UPDATE SUCCESSFUL ✓'
        ELSE 'UPDATE FAILED ✗'
    END as update_result
FROM users 
WHERE email = 'test@example.com';

-- 5. Clean up test data
DELETE FROM users WHERE email = 'test@example.com';

-- 6. Final summary
SELECT 'STEP 5: Summary' as step;
SELECT 'If all tests passed, the database is working correctly.' as summary;
SELECT 'If tests failed, there is still a database permission issue.' as note;
SELECT 'Next step: Check frontend form data and API calls.' as next_action;
