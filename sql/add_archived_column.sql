-- Add archived column to users table for archive functionality
-- This allows HR to archive users instead of deleting them

-- Add archived column (defaults to false for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add comment to document the column
COMMENT ON COLUMN users.archived IS 'Indicates if the user account is archived (soft delete)';

-- Create index for better query performance when filtering archived users
CREATE INDEX IF NOT EXISTS idx_users_archived ON users(archived);

-- Update any NULL values to false (just in case)
UPDATE users SET archived = false WHERE archived IS NULL;
