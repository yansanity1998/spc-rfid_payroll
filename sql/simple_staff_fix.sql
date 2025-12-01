-- Simple Staff role fix - just update what's needed
-- Since your user already exists, we just need to fix the constraint and ensure proper setup

-- 1. Update the roles table constraint to include Staff
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_check;
ALTER TABLE roles ADD CONSTRAINT roles_role_check 
CHECK (role IN ('Accounting', 'Administrator', 'HR Personnel', 'SA', 'Faculty', 'Guard', 'Staff', 'ACAF'));

-- 2. Ensure your existing user has the correct Staff role and Active status
UPDATE users 
SET 
    role = 'Staff',
    status = 'Active'
WHERE email = 'casan@gmail.com';

-- 3. Verify the setup
SELECT 
    'User Check' as type,
    name,
    email, 
    role, 
    status,
    auth_id
FROM users 
WHERE email = 'casan@gmail.com';

-- 4. Check if Staff role exists in roles table
SELECT 
    'Roles Check' as type,
    role,
    id
FROM roles 
WHERE role = 'Staff';
