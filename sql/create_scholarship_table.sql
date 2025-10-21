-- Create scholarship table for Faculty users
CREATE TABLE IF NOT EXISTS scholarship (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  has_scholarship BOOLEAN NOT NULL DEFAULT false,
  scholarship_period VARCHAR(50), -- '1st sem', '2nd sem', 'Whole School Year'
  school_year VARCHAR(20), -- e.g., '2024-2025'
  amount DECIMAL(10, 2), -- Scholarship amount
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, school_year, scholarship_period)
);

-- Create index for faster lookups
CREATE INDEX idx_scholarship_user_id ON scholarship(user_id);
CREATE INDEX idx_scholarship_school_year ON scholarship(school_year);

-- Disable RLS for unrestricted access (following project pattern)
ALTER TABLE scholarship DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON scholarship TO authenticated;
GRANT ALL ON scholarship TO anon;
GRANT ALL ON scholarship TO public;
GRANT ALL ON scholarship_id_seq TO authenticated;
GRANT ALL ON scholarship_id_seq TO anon;
GRANT ALL ON scholarship_id_seq TO public;

-- Add comments
COMMENT ON TABLE scholarship IS 'Stores scholarship information for Faculty users';
COMMENT ON COLUMN scholarship.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN scholarship.has_scholarship IS 'Whether the faculty member has a scholarship';
COMMENT ON COLUMN scholarship.scholarship_period IS 'When the scholarship is valid: 1st sem, 2nd sem, or Whole School Year';
COMMENT ON COLUMN scholarship.school_year IS 'Academic year for the scholarship (e.g., 2024-2025)';
COMMENT ON COLUMN scholarship.amount IS 'Scholarship amount in pesos';
COMMENT ON COLUMN scholarship.notes IS 'Additional notes about the scholarship';
