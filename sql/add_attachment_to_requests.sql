-- Add attachment column to requests table for substitution forms and other attachments
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS attachment TEXT;

-- Add comment for documentation
COMMENT ON COLUMN requests.attachment IS 'URL to attached file (e.g., substitution form for leave requests)';

-- Grant permissions (ensure unrestricted access)
GRANT ALL ON requests TO authenticated, anon, public;

