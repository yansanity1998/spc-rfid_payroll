-- Add 'Incentive Leave' to the leave_type CHECK constraint
-- This migration updates the existing constraint to include Incentive Leave

-- Drop the existing constraint
ALTER TABLE requests 
DROP CONSTRAINT IF EXISTS requests_leave_type_check;

-- Recreate the constraint with Incentive Leave included
ALTER TABLE requests 
ADD CONSTRAINT requests_leave_type_check 
CHECK (leave_type IS NULL OR leave_type IN (
    'Sick Leave', 
    'Vacation Leave', 
    'Emergency Leave', 
    'Maternity Leave', 
    'Paternity Leave', 
    'Bereavement Leave',
    'Incentive Leave'
));

-- Add comment for documentation
COMMENT ON COLUMN requests.leave_type IS 'Type of leave: Sick Leave, Vacation Leave, Emergency Leave, Maternity Leave, Paternity Leave, Bereavement Leave, or Incentive Leave';

