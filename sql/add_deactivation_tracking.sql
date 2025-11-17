-- Add deactivation tracking columns to users table
-- This script adds deactivation_reason and deactivation_date columns for audit trail

-- Ensure RLS is disabled on users table (following existing pattern)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Add deactivation reason column (text, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Add deactivation date column (timestamp with timezone, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deactivation_date TIMESTAMP WITH TIME ZONE;

-- Add reactivation date column (timestamp with timezone, optional) 
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reactivation_date TIMESTAMP WITH TIME ZONE;

-- Grant full permissions to ensure updates work
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;
GRANT ALL ON users TO public;

-- Add comments for documentation
COMMENT ON COLUMN users.deactivation_reason IS 'Reason provided when user account is deactivated';
COMMENT ON COLUMN users.deactivation_date IS 'Timestamp when user account was deactivated (Philippine timezone)';
COMMENT ON COLUMN users.reactivation_date IS 'Timestamp when user account was reactivated (Philippine timezone)';

-- Display current users table structure for verification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
