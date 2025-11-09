-- Safe script to create holidays table or update existing one
-- This script handles both new installations and updates to existing tables

-- Step 1: Create the table if it doesn't exist (without created_by first)
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'Regular Holiday',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Add created_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holidays' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE holidays ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Add UNIQUE constraint on date if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'holidays_date_key'
  ) THEN
    ALTER TABLE holidays ADD CONSTRAINT holidays_date_key UNIQUE (date);
  END IF;
END $$;

-- Step 4: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_active_date ON holidays(date, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);
CREATE INDEX IF NOT EXISTS idx_holidays_created_by ON holidays(created_by);

-- Step 5: Disable RLS for unrestricted access
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;

-- Step 6: Grant permissions to all roles
GRANT ALL ON holidays TO authenticated;
GRANT ALL ON holidays TO anon;
GRANT ALL ON holidays TO public;

-- Step 7: Grant sequence permissions for auto-incrementing IDs
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE holidays_id_seq TO public;

-- Step 8: Add comments to table and columns
COMMENT ON TABLE holidays IS 'Stores school holidays, special holidays, and school events. Users are automatically exempted from attendance on holiday dates.';

COMMENT ON COLUMN holidays.id IS 'Primary key';
COMMENT ON COLUMN holidays.title IS 'Name of the holiday or event';
COMMENT ON COLUMN holidays.date IS 'Date of the holiday (unique - only one holiday per date)';
COMMENT ON COLUMN holidays.description IS 'Optional description or notes about the holiday';
COMMENT ON COLUMN holidays.type IS 'Type of holiday: Regular Holiday, Special Holiday, or School Event';
COMMENT ON COLUMN holidays.is_active IS 'Whether this holiday is currently active (allows temporary disabling without deletion)';

-- Only add comment if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'holidays' AND column_name = 'created_by'
  ) THEN
    COMMENT ON COLUMN holidays.created_by IS 'User ID of the admin who created this holiday (foreign key to users table)';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Holidays table created/updated successfully!';
  RAISE NOTICE 'Foreign key: holidays.created_by -> users.id';
  RAISE NOTICE 'Indexes created for optimal performance';
END $$;
