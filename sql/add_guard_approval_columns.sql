-- Add guard approval columns to requests table
-- This enables the Guard approval workflow for gate pass requests

-- Add guard approval columns
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS guard_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guard_approved_by BIGINT,
ADD COLUMN IF NOT EXISTS guard_approved_date TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint for guard_approved_by
ALTER TABLE requests 
ADD CONSTRAINT fk_requests_guard_approved_by 
FOREIGN KEY (guard_approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Update the status check constraint to include 'Guard Approved'
ALTER TABLE requests 
DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE requests 
ADD CONSTRAINT requests_status_check 
CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Pending Dean Approval', 'Guard Approved'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_requests_guard_approved ON requests(guard_approved);
CREATE INDEX IF NOT EXISTS idx_requests_guard_approved_by ON requests(guard_approved_by);
CREATE INDEX IF NOT EXISTS idx_requests_guard_approved_date ON requests(guard_approved_date);

-- Add comments for documentation
COMMENT ON COLUMN requests.guard_approved IS 'Flag indicating if the request has been approved by a guard';
COMMENT ON COLUMN requests.guard_approved_by IS 'User ID of the guard who approved the request';
COMMENT ON COLUMN requests.guard_approved_date IS 'Timestamp when the request was approved by the guard';

-- Grant permissions (ensure unrestricted access)
GRANT ALL ON requests TO authenticated, anon, public;

-- Update the dean_approval_requests view to include guard approval fields
CREATE OR REPLACE VIEW dean_approval_requests AS
SELECT 
    r.*,
    u.name as requester_name,
    u.email as requester_email,
    u.positions as current_position,
    approver.name as approved_by_name,
    guard_approver.name as guard_approved_by_name
FROM requests r
JOIN users u ON r.user_id = u.id
LEFT JOIN users approver ON r.approved_by = approver.id
LEFT JOIN users guard_approver ON r.guard_approved_by = guard_approver.id
WHERE r.dean_approval_required = TRUE 
   OR (r.request_type = 'Gate Pass' AND u.positions IN ('Program Head', 'Full Time', 'Part Time'));

-- Grant permissions on the updated view
GRANT ALL ON dean_approval_requests TO authenticated, anon, public;

-- Create a function to get guard-approved requests for HR monitoring
CREATE OR REPLACE FUNCTION get_guard_approved_requests()
RETURNS TABLE (
    request_id BIGINT,
    requester_name TEXT,
    requester_email TEXT,
    requester_position TEXT,
    request_type TEXT,
    purpose TEXT,
    destination TEXT,
    time_out TIMESTAMP WITH TIME ZONE,
    time_in TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    status TEXT,
    approved_by_name TEXT,
    guard_approved_by_name TEXT,
    approved_date TIMESTAMP WITH TIME ZONE,
    guard_approved_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as request_id,
        u.name as requester_name,
        u.email as requester_email,
        u.positions as requester_position,
        r.request_type,
        r.purpose,
        r.destination,
        r.time_out,
        r.time_in,
        r.reason,
        r.status,
        approver.name as approved_by_name,
        guard_approver.name as guard_approved_by_name,
        r.approved_date,
        r.guard_approved_date,
        r.created_at
    FROM requests r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users approver ON r.approved_by = approver.id
    LEFT JOIN users guard_approver ON r.guard_approved_by = guard_approver.id
    WHERE r.request_type = 'Gate Pass' 
      AND r.guard_approved = TRUE
      AND u.role = 'Faculty'
      AND u.positions IN ('Program Head', 'Full Time', 'Part Time')
    ORDER BY r.guard_approved_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION get_guard_approved_requests() TO authenticated, anon, public;

-- Success message
SELECT 'Guard approval columns added successfully to requests table!' as message;
