-- Add base_salary column to users table for per-employee salary rates
ALTER TABLE users
ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12,2);

-- Optional: set a default of 0.00
ALTER TABLE users
ALTER COLUMN base_salary SET DEFAULT 0.00;

-- Comment for documentation
COMMENT ON COLUMN users.base_salary IS 'Base salary rate per payroll period set by HR (per-employee), used as default gross in payroll.';
