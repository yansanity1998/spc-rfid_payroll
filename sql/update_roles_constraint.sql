-- Update roles table constraint to include Staff role
-- This is the most likely fix needed

-- Remove the old constraint
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_check;

-- Add new constraint that includes Staff
ALTER TABLE roles ADD CONSTRAINT roles_role_check 
CHECK (role IN ('Accounting', 'Administrator', 'HR Personnel', 'SA', 'Faculty', 'Guard', 'Staff', 'ACAF'));

-- Verify the constraint was updated
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'roles_role_check';
