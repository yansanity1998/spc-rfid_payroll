-- Create unified requests table for all request types with hierarchical approval
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('Gate Pass', 'Loan', 'Leave')),
    
    -- Enhanced approval workflow fields
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Pending Dean Approval')),
    approved_by BIGINT, -- Changed to reference user ID instead of name
    approved_date TIMESTAMP WITH TIME ZONE,
    dean_approval_required BOOLEAN DEFAULT FALSE, -- Flag to indicate if dean approval is needed
    requester_position VARCHAR(50), -- Store requester's position at time of request
    notes TEXT,
    admin_notes TEXT, -- Additional notes from approver
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Gate Pass specific fields
    name VARCHAR(255),
    time_out TIMESTAMP WITH TIME ZONE,
    time_in TIMESTAMP WITH TIME ZONE,
    purpose TEXT,
    destination VARCHAR(255),   
    
    -- Loan specific fields
    amount DECIMAL(10,2),
    repayment_terms TEXT,
    monthly_deduction DECIMAL(10,2),
    total_months INTEGER,
    
    -- Leave specific fields
    leave_type VARCHAR(100) CHECK (leave_type IN ('Sick Leave', 'Vacation Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave', 'Bereavement Leave')),
    start_date DATE,
    end_date DATE,
    total_days INTEGER,
    substitute_teacher VARCHAR(255),
    contact_number VARCHAR(20),
    
    -- Common reason field for all types
    reason TEXT,
    date_needed DATE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Disable RLS for requests table to ensure unrestricted access
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all roles
GRANT ALL ON requests TO authenticated, anon, public;

-- Grant sequence permissions
GRANT ALL ON requests_id_seq TO authenticated, anon, public;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_approved_by ON requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_requests_dean_approval ON requests(dean_approval_required);
CREATE INDEX IF NOT EXISTS idx_requests_position ON requests(requester_position);

-- Add comments for documentation
COMMENT ON TABLE requests IS 'Unified table storing all request types (Gate Pass, Loan, Leave) with hierarchical approval workflow';
COMMENT ON COLUMN requests.request_type IS 'Type of request: Gate Pass, Loan, or Leave';
COMMENT ON COLUMN requests.status IS 'Request status: Pending, Approved, Rejected, or Pending Dean Approval';
COMMENT ON COLUMN requests.approved_by IS 'User ID of the person who approved/rejected the request';
COMMENT ON COLUMN requests.dean_approval_required IS 'Flag indicating if dean approval is required for this request';
COMMENT ON COLUMN requests.requester_position IS 'Position of the requester at time of request (Dean, Program Head, Full Time, Part Time)';
COMMENT ON COLUMN requests.admin_notes IS 'Additional notes from the approver/admin';
COMMENT ON COLUMN requests.name IS 'Used for Gate Pass - name of the person';
COMMENT ON COLUMN requests.time_out IS 'Used for Gate Pass - time out timestamp';
COMMENT ON COLUMN requests.time_in IS 'Used for Gate Pass - time in timestamp';
COMMENT ON COLUMN requests.purpose IS 'Used for Gate Pass - purpose of going out';
COMMENT ON COLUMN requests.destination IS 'Used for Gate Pass - destination location';
COMMENT ON COLUMN requests.amount IS 'Used for Loan - loan amount requested';
COMMENT ON COLUMN requests.repayment_terms IS 'Used for Loan - repayment terms and conditions';
COMMENT ON COLUMN requests.monthly_deduction IS 'Used for Loan - monthly deduction amount';
COMMENT ON COLUMN requests.total_months IS 'Used for Loan - total months for repayment';
COMMENT ON COLUMN requests.leave_type IS 'Used for Leave - type of leave requested';
COMMENT ON COLUMN requests.start_date IS 'Used for Leave - leave start date';
COMMENT ON COLUMN requests.end_date IS 'Used for Leave - leave end date';
COMMENT ON COLUMN requests.total_days IS 'Used for Leave - total days of leave';
COMMENT ON COLUMN requests.substitute_teacher IS 'Used for Leave - substitute teacher name';
COMMENT ON COLUMN requests.contact_number IS 'Used for Leave - contact number during leave';


-- Create a view for dean approval workflow
CREATE OR REPLACE VIEW dean_approval_requests AS
SELECT 
    r.*,
    u.name as requester_name,
    u.email as requester_email,
    u.positions as current_position,
    approver.name as approved_by_name
FROM requests r
JOIN users u ON r.user_id = u.id
LEFT JOIN users approver ON r.approved_by = approver.id
WHERE r.dean_approval_required = TRUE 
   OR (r.request_type = 'Gate Pass' AND u.positions IN ('Program Head', 'Full Time', 'Part Time'));

-- Grant permissions on the view
GRANT ALL ON dean_approval_requests TO authenticated, anon, public;


-- Create trigger function to automatically set dean approval requirement
CREATE OR REPLACE FUNCTION set_dean_approval_requirement()
RETURNS TRIGGER AS $$
BEGIN
    -- For Gate Pass requests, check if requester needs dean approval
    IF NEW.request_type = 'Gate Pass' THEN
        -- Get requester's position
        SELECT positions INTO NEW.requester_position
        FROM users 
        WHERE id = NEW.user_id;
        
        -- Set dean approval requirement for non-dean positions
        IF NEW.requester_position IN ('Program Head', 'Full Time', 'Part Time') THEN
            NEW.dean_approval_required = TRUE;
        ELSE
            NEW.dean_approval_required = FALSE;
        END IF;
    ELSE
        -- For other request types, no dean approval needed by default
        NEW.dean_approval_required = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set dean approval requirement on insert
DROP TRIGGER IF EXISTS trigger_set_dean_approval ON requests;
CREATE TRIGGER trigger_set_dean_approval
    BEFORE INSERT ON requests
    FOR EACH ROW
    EXECUTE FUNCTION set_dean_approval_requirement();


-- Create function to get pending requests for dean approval
CREATE OR REPLACE FUNCTION get_dean_pending_requests(dean_user_id BIGINT)
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
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check if the user is actually a dean
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = dean_user_id 
        AND positions = 'Dean' 
        AND role = 'Faculty'
    ) THEN
        RAISE EXCEPTION 'User is not authorized as Dean';
    END IF;
    
    -- Return pending requests that require dean approval
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
        r.created_at
    FROM requests r
    JOIN users u ON r.user_id = u.id
    WHERE r.dean_approval_required = TRUE 
      AND r.status IN ('Pending', 'Pending Dean Approval')
      AND r.request_type = 'Gate Pass'
    ORDER BY r.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION get_dean_pending_requests(BIGINT) TO authenticated, anon, public;
