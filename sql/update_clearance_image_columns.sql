-- Update clearance document columns to TEXT for storing image URLs
-- Run this to update existing table

ALTER TABLE clearance_documents 
  ALTER COLUMN nbi_clearance TYPE TEXT,
  ALTER COLUMN certification_employment TYPE TEXT,
  ALTER COLUMN medical_certificate TYPE TEXT,
  ALTER COLUMN birth_certificate TYPE TEXT;

-- Remove any default values
ALTER TABLE clearance_documents 
  ALTER COLUMN nbi_clearance DROP DEFAULT,
  ALTER COLUMN certification_employment DROP DEFAULT,
  ALTER COLUMN medical_certificate DROP DEFAULT,
  ALTER COLUMN birth_certificate DROP DEFAULT;

-- Add comments
COMMENT ON COLUMN clearance_documents.nbi_clearance IS 'NBI Clearance - can store image URL or text status';
COMMENT ON COLUMN clearance_documents.certification_employment IS 'Certificate of Employment - can store image URL or text status';
COMMENT ON COLUMN clearance_documents.medical_certificate IS 'Medical Certificate - can store image URL or text status';
COMMENT ON COLUMN clearance_documents.birth_certificate IS 'Birth Certificate - can store image URL or text status';
