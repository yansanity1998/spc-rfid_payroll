-- Create clearance_documents table for comprehensive document tracking
-- This table stores all required documents and credentials for faculty clearance

CREATE TABLE IF NOT EXISTS clearance_documents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  
  -- Employment Information (from users table)
  employment_status VARCHAR(50), -- Active, Inactive
  employment_type VARCHAR(50), -- Full Time, Part Time
  date_hired DATE,
  degree_earned TEXT,
  
  -- Government Identification Numbers
  philhealth_no VARCHAR(50),
  pagibig_no VARCHAR(50),
  tin_no VARCHAR(50),
  sss_no VARCHAR(50),
  
  -- Credentials
  tor_status VARCHAR(20) DEFAULT 'None', -- Yes, No, None
  diploma_status VARCHAR(20) DEFAULT 'None', -- Yes, No, None
  
  -- SPC Requirements (can store image URLs or text status)
  nbi_clearance TEXT,
  certification_employment TEXT,
  medical_certificate TEXT,
  birth_certificate TEXT,
  marital_status VARCHAR(20), -- Single, Married, Widowed, Separated
  marriage_certificate VARCHAR(20) DEFAULT 'N/A',
  
  letter_of_intent VARCHAR(20) DEFAULT 'NONE',
  permit_to_teach VARCHAR(20) DEFAULT 'N/A',
  updated_pis VARCHAR(20) DEFAULT 'NO',
  appointment VARCHAR(20) DEFAULT 'NONE',
  general_remarks TEXT,
  
  -- Contract of Service
  contract_status VARCHAR(20) DEFAULT 'NOT UPDATED', -- UPDATED, NOT UPDATED
  date_entered_contract DATE,
  contract_remarks TEXT,
  date_notarized DATE,
  
  -- Seminar/Training Documents
  seminar_certificates VARCHAR(20) DEFAULT 'NO', -- YES, NO
  certificates_years VARCHAR(50), -- e.g., "2020-2025"
  narrative_report VARCHAR(20) DEFAULT 'NONE',
  
  -- Memorandum
  personal_memo VARCHAR(20) DEFAULT 'NONE',
  memo_date DATE,
  memo_subject TEXT,
  memo_date_responded DATE,
  
  -- Acknowledgement Forms
  acknowledgement_form_march14 VARCHAR(20) DEFAULT 'NO', -- YES, NO
  
  -- Lackings/Summary
  lackings TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to users table
  CONSTRAINT fk_clearance_documents_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- Unique constraint: one document record per user
  CONSTRAINT unique_user_clearance_documents UNIQUE (user_id)
);

-- Disable RLS for unrestricted access
ALTER TABLE clearance_documents DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON clearance_documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clearance_documents;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON clearance_documents;

-- Grant full permissions
GRANT ALL ON clearance_documents TO authenticated;
GRANT ALL ON clearance_documents TO anon;
GRANT ALL ON clearance_documents TO public;

-- Grant sequence permissions
GRANT ALL ON SEQUENCE clearance_documents_id_seq TO authenticated;
GRANT ALL ON SEQUENCE clearance_documents_id_seq TO anon;
GRANT ALL ON SEQUENCE clearance_documents_id_seq TO public;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clearance_documents_user_id ON clearance_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_clearance_documents_employment_status ON clearance_documents(employment_status);
CREATE INDEX IF NOT EXISTS idx_clearance_documents_contract_status ON clearance_documents(contract_status);

-- Add comments for documentation
COMMENT ON TABLE clearance_documents IS 'Comprehensive document tracking for faculty clearance requirements';
COMMENT ON COLUMN clearance_documents.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN clearance_documents.employment_status IS 'Active or Inactive employment status';
COMMENT ON COLUMN clearance_documents.employment_type IS 'Full Time or Part Time';
COMMENT ON COLUMN clearance_documents.lackings IS 'Summary of missing documents and requirements';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clearance_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_clearance_documents_updated_at ON clearance_documents;
CREATE TRIGGER trigger_update_clearance_documents_updated_at
  BEFORE UPDATE ON clearance_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_clearance_documents_updated_at();
