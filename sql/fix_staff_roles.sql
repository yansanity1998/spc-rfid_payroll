-- Fix Staff roles in Supabase database
-- This script ensures Staff role is properly configured in both roles and users tables

-- 1. First, update the roles table constraint to include Staff
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_check;
ALTER TABLE roles ADD CONSTRAINT roles_role_check 
CHECK (role IN ('Accounting', 'Administrator', 'HR Personnel', 'SA', 'Faculty', 'Guard', 'Staff', 'ACAF'));

-- 2. Ensure your Staff role exists in the roles table
INSERT INTO roles (id, role, created_at) 
VALUES ('5f0138b9-3d0e-4aec-af7d-199db65323da', 'Staff', NOW())
ON CONFLICT (id) DO UPDATE SET role = 'Staff';

-- 3. Update your user record to ensure it has the correct Staff role and status
-- Replace 'casan@gmail.com' with your actual email if different
UPDATE users 
SET 
    role = 'Staff',
    status = 'Active',
    auth_id = (
        SELECT id FROM auth.users WHERE email = 'casan@gmail.com' LIMIT 1
    )
WHERE email = 'casan@gmail.com';

-- 4. If the user doesn't exist, create it (replace with your actual details)
-- First check if user exists, if not insert with proper ID handling
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'casan@gmail.com') THEN
        INSERT INTO users (
            name, 
            email, 
            role, 
            status, 
            auth_id,
            positions,
            created_at
        ) 
        SELECT 
            'casan',
            'casan@gmail.com',
            'Staff',
            'Active',
            au.id,
            'Full Time',
            NOW()
        FROM auth.users au 
        WHERE au.email = 'casan@gmail.com';
    END IF;
END $$;

-- 5. Verify the setup
SELECT 'Roles Table Check:' as check_type, role, id FROM roles WHERE role = 'Staff'
UNION ALL
SELECT 'Users Table Check:' as check_type, role, auth_id::text FROM users WHERE email = 'casan@gmail.com';

-- 6. Show auth user for comparison
SELECT 'Auth Users Check:' as check_type, email, id::text FROM auth.users WHERE email = 'casan@gmail.com';
