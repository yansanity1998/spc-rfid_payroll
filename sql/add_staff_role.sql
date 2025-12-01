-- Add Staff role to the roles table constraint
-- This updates the existing constraint to include 'Staff' as a valid role

-- First, drop the existing constraint
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_check;

-- Add the new constraint with Staff included
ALTER TABLE roles ADD CONSTRAINT roles_role_check 
CHECK (role IN ('Accounting', 'Administrator', 'HR Personnel', 'SA', 'Faculty', 'Guard', 'Staff', 'ACAF'));

-- Insert a sample Staff role (optional - you can remove this if not needed)
-- INSERT INTO roles (id, role, created_at) 
-- VALUES (gen_random_uuid(), 'Staff', NOW())
-- ON CONFLICT DO NOTHING;

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'roles_role_check';
