-- Add ACAF role to the roles constraint and seed the role if needed
-- Run this on your Supabase/Postgres instance to allow assigning the ACAF role

-- 1. Update the CHECK constraint so ACAF becomes an allowed value
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_check;
ALTER TABLE roles ADD CONSTRAINT roles_role_check 
CHECK (role IN ('Accounting', 'Administrator', 'HR Personnel', 'SA', 'Faculty', 'Guard', 'Staff', 'ACAF'));

-- 2. Ensure the roles table contains an ACAF entry (will skip if it already exists)
INSERT INTO roles (id, role, created_at)
VALUES (gen_random_uuid(), 'ACAF', NOW())
ON CONFLICT (role) DO NOTHING;

-- 3. (Optional) Assign the ACAF role to a specific user by email
-- UPDATE users
-- SET role = 'ACAF'
-- WHERE email = 'replace-with-user-email@example.com';

-- 4. Quick verification helpers
SELECT 'Roles Constraint' AS section,
       pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'roles_role_check';

SELECT 'ACAF Role Row' AS section,
       id,
       role,
       created_at
FROM roles
WHERE role = 'ACAF';



