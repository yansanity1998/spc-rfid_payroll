-- Add column for storing resignation letter attachment URL on users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS resignation_attachment TEXT;

COMMENT ON COLUMN users.resignation_attachment IS 'URL to resignation letter document (e.g., PDF, image)';
