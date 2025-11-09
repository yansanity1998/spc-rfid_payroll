-- Fresh installation script for holidays table
-- Use this if you're creating the table for the first time
-- If table already exists, use create_holidays_table_safe.sql instead

-- Drop existing table if you want to start fresh (WARNING: This deletes all data!)
-- DROP TABLE IF EXISTS holidays CASCADE;

-- Create holidays table with all fields including foreign key
CREATE TABLE holidays (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL UNIQUE,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'Regular Holiday',
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_active_date ON holidays(date, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_holidays_type ON holidays(type);
CREATE INDEX idx_holidays_created_by ON holidays(created_by);

-- Disable RLS for unrestricted access
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all roles
GRANT ALL ON holidays TO authenticated;
GRANT ALL ON holidays TO anon;
GRANT ALL ON holidays TO public;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO public;

-- Add table comment
COMMENT ON TABLE holidays IS 'Stores school holidays, special holidays, and school events. Users are automatically exempted from attendance on holiday dates.';

-- Add column comments
COMMENT ON COLUMN holidays.id IS 'Primary key';
COMMENT ON COLUMN holidays.title IS 'Name of the holiday or event';
COMMENT ON COLUMN holidays.date IS 'Date of the holiday (unique - only one holiday per date)';
COMMENT ON COLUMN holidays.description IS 'Optional description or notes about the holiday';
COMMENT ON COLUMN holidays.type IS 'Type of holiday: Regular Holiday, Special Holiday, or School Event';
COMMENT ON COLUMN holidays.is_active IS 'Whether this holiday is currently active (allows temporary disabling without deletion)';
COMMENT ON COLUMN holidays.created_by IS 'User ID of the admin who created this holiday (foreign key to users table)';
COMMENT ON COLUMN holidays.created_at IS 'Timestamp when holiday was created';
COMMENT ON COLUMN holidays.updated_at IS 'Timestamp when holiday was last updated';

-- Success!
SELECT 'Holidays table created successfully!' as status;
