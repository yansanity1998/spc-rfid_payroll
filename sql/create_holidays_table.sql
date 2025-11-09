-- Create holidays table for managing school holidays and special events
-- When a date is marked as a holiday, users will be exempted from attendance requirements
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL UNIQUE, -- Ensure only one holiday per date
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'Regular Holiday',
  is_active BOOLEAN DEFAULT TRUE, -- Allow admin to temporarily disable holidays
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Track who created the holiday
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on date for faster queries (most important for attendance checking)
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- Add index on active holidays for quick lookups
CREATE INDEX IF NOT EXISTS idx_holidays_active_date ON holidays(date, is_active) WHERE is_active = TRUE;

-- Add index on type for filtering
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);

-- Add index on created_by for tracking who created holidays
CREATE INDEX IF NOT EXISTS idx_holidays_created_by ON holidays(created_by);

-- Disable RLS for unrestricted access
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all roles
GRANT ALL ON holidays TO authenticated;
GRANT ALL ON holidays TO anon;
GRANT ALL ON holidays TO public;

-- Grant sequence permissions for auto-incrementing IDs
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO public;

-- Add comment to table
COMMENT ON TABLE holidays IS 'Stores school holidays, special holidays, and school events. Users are automatically exempted from attendance on holiday dates.';

-- Add comments to columns
COMMENT ON COLUMN holidays.title IS 'Name of the holiday or event';
COMMENT ON COLUMN holidays.date IS 'Date of the holiday (unique - only one holiday per date)';
COMMENT ON COLUMN holidays.description IS 'Optional description or notes about the holiday';
COMMENT ON COLUMN holidays.type IS 'Type of holiday: Regular Holiday, Special Holiday, or School Event';
COMMENT ON COLUMN holidays.is_active IS 'Whether this holiday is currently active (allows temporary disabling without deletion)';
COMMENT ON COLUMN holidays.created_by IS 'User ID of the admin who created this holiday (foreign key to users table)';
