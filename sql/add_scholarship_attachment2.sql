-- Add second attachment field to scholarship table for storing an additional document

ALTER TABLE scholarship
ADD COLUMN IF NOT EXISTS attachment2 TEXT;

COMMENT ON COLUMN scholarship.attachment2 IS 'URL or path to second scholarship document attachment';

-- Optional: show updated scholarship columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'scholarship'
  AND table_schema = 'public'
ORDER BY ordinal_position;
