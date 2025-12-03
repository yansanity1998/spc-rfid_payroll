-- Add President and Vice President roles to the roles table constraint
-- Run this on your Supabase/Postgres instance to allow assigning these roles

-- 1. Update the CHECK constraint so President and Vice President become allowed values
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_check;
ALTER TABLE roles ADD CONSTRAINT roles_role_check 
CHECK (
  role IN (
    'Accounting',
    'Administrator',
    'HR Personnel',
    'SA',
    'Faculty',
    'Guard',
    'Staff',
    'ACAF',
    'President',
    'Vice President'
  )
);

-- 2. Ensure the roles table contains President and Vice President entries (will skip if they already exist)
INSERT INTO roles (id, role, created_at)
SELECT gen_random_uuid(), 'President', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role = 'President'
);

INSERT INTO roles (id, role, created_at)
SELECT gen_random_uuid(), 'Vice President', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role = 'Vice President'
);

-- 3. Quick verification helpers
SELECT 'Roles Constraint' AS section,
       pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'roles_role_check';

SELECT 'President/Vice President Role Rows' AS section,
       id,
       role,
       created_at
FROM roles
WHERE role IN ('President', 'Vice President');
