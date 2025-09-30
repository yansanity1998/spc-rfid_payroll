-- Add loan deduction field to payrolls table
-- This will store the monthly loan deduction amount for each payroll record

-- Add loan_deduction column to payrolls table
ALTER TABLE payrolls 
ADD COLUMN IF NOT EXISTS loan_deduction DECIMAL(10,2) DEFAULT 0.00;

-- Add loan_request_id to track which loan request this deduction is for
ALTER TABLE payrolls 
ADD COLUMN IF NOT EXISTS loan_request_id BIGINT;

-- Add foreign key constraint to link to requests table
ALTER TABLE payrolls 
ADD CONSTRAINT fk_payrolls_loan_request 
FOREIGN KEY (loan_request_id) REFERENCES requests(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN payrolls.loan_deduction IS 'Monthly loan deduction amount in pesos';
COMMENT ON COLUMN payrolls.loan_request_id IS 'Reference to the loan request in requests table';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payrolls_loan_request_id ON payrolls(loan_request_id);

-- Grant permissions (assuming payrolls table follows same pattern as other tables)
GRANT ALL ON payrolls TO authenticated, anon, public;
