-- Add overtime column to schedules table for 7pm-9pm overtime tracking
-- Schedules marked as overtime will add ₱200 to gross pay in payroll

ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN schedules.is_overtime IS 'Indicates if this schedule is overtime (7pm-9pm) which adds ₱200 to gross pay';
