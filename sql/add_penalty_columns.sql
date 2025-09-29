-- Add penalty tracking columns to attendance table
-- This script adds columns to track late minutes, overtime minutes, penalty amounts, and notes

ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing records to have default values
UPDATE attendance 
SET 
  late_minutes = 0,
  overtime_minutes = 0,
  penalty_amount = 0.00
WHERE 
  late_minutes IS NULL 
  OR overtime_minutes IS NULL 
  OR penalty_amount IS NULL;

-- Add comments to document the columns
COMMENT ON COLUMN attendance.late_minutes IS 'Number of minutes late for time in';
COMMENT ON COLUMN attendance.overtime_minutes IS 'Number of minutes worked past 7:00 PM';
COMMENT ON COLUMN attendance.penalty_amount IS 'Total penalty amount in pesos (₱1 per late minute, ₱0.50 per overtime minute)';
COMMENT ON COLUMN attendance.notes IS 'Additional notes about penalties or attendance';
