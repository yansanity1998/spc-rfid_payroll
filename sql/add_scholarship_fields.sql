-- Add additional fields to scholarship table for enhanced functionality
-- This script adds degree, start_date, end_date, and attachment fields

-- Add degree field
ALTER TABLE scholarship 
ADD COLUMN IF NOT EXISTS degree VARCHAR(255);

-- Add start_date field
ALTER TABLE scholarship 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add end_date field
ALTER TABLE scholarship 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add attachment field for scholarship documents
ALTER TABLE scholarship 
ADD COLUMN IF NOT EXISTS attachment TEXT;

-- Add comments for new fields
COMMENT ON COLUMN scholarship.degree IS 'Degree program for which the scholarship is awarded';
COMMENT ON COLUMN scholarship.start_date IS 'Start date of the scholarship period';
COMMENT ON COLUMN scholarship.end_date IS 'End date of the scholarship period';
COMMENT ON COLUMN scholarship.attachment IS 'URL or path to scholarship document attachment';

-- Display updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'scholarship' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
