-- Rename loan-related columns in requests table to reflect 15-day periods instead of monthly
-- This aligns with the payroll system's 15-day period logic

-- Rename monthly_deduction to period_deduction
ALTER TABLE requests 
RENAME COLUMN monthly_deduction TO period_deduction;

-- Rename total_months to total_periods
ALTER TABLE requests 
RENAME COLUMN total_months TO total_periods;

-- Update column comments to reflect the change
COMMENT ON COLUMN requests.period_deduction IS 'Deduction amount per 15-day period for loan repayment';
COMMENT ON COLUMN requests.total_periods IS 'Total number of 15-day periods for loan repayment';
