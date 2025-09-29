-- Create dean approval table for managing gate pass approvals
CREATE TABLE IF NOT EXISTS dean_approvals (
    id SERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL,
    requester_id BIGINT NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    requester_position VARCHAR(50) NOT NULL,
    requester_email VARCHAR(255),
    
    -- Gate Pass Details
    purpose TEXT,
    destination VARCHAR(255),
    time_out TIMESTAMP WITH TIME ZONE,
    time_in TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    date_needed DATE,
    
    -- Approval Status
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by BIGINT,
    approved_date TIMESTAMP WITH TIME ZONE,
    dean_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Disable RLS for dean_approvals table
ALTER TABLE dean_approvals DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all roles
GRANT ALL ON dean_approvals TO authenticated, anon, public;

-- Grant sequence permissions
GRANT ALL ON dean_approvals_id_seq TO authenticated, anon, public;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dean_approvals_request_id ON dean_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_dean_approvals_requester_id ON dean_approvals(requester_id);
CREATE INDEX IF NOT EXISTS idx_dean_approvals_status ON dean_approvals(status);
CREATE INDEX IF NOT EXISTS idx_dean_approvals_approved_by ON dean_approvals(approved_by);

-- Create function to automatically create dean approval record for gate pass requests
CREATE OR REPLACE FUNCTION create_dean_approval_record()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create dean approval record for Gate Pass requests from non-dean faculty
    IF NEW.request_type = 'Gate Pass' THEN
        -- Get requester details
        INSERT INTO dean_approvals (
            request_id,
            requester_id,
            requester_name,
            requester_position,
            requester_email,
            purpose,
            destination,
            time_out,
            time_in,
            reason,
            date_needed
        )
        SELECT 
            NEW.id,
            u.id,
            u.name,
            u.positions,
            u.email,
            NEW.purpose,
            NEW.destination,
            NEW.time_out,
            NEW.time_in,
            NEW.reason,
            NEW.date_needed
        FROM users u
        WHERE u.id = NEW.user_id
        AND u.role = 'Faculty'
        AND u.positions IN ('Program Head', 'Full Time', 'Part Time');
        
        -- Update the original request status
        IF FOUND THEN
            UPDATE requests 
            SET status = 'Pending Dean Approval',
                dean_approval_required = TRUE,
                requester_position = (SELECT positions FROM users WHERE id = NEW.user_id)
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new requests
DROP TRIGGER IF EXISTS trigger_create_dean_approval ON requests;
CREATE TRIGGER trigger_create_dean_approval
    AFTER INSERT ON requests
    FOR EACH ROW
    EXECUTE FUNCTION create_dean_approval_record();

-- Function to get all pending dean approvals
CREATE OR REPLACE FUNCTION get_dean_approvals(dean_user_id BIGINT DEFAULT NULL)
RETURNS TABLE (
    approval_id BIGINT,
    request_id BIGINT,
    requester_name TEXT,
    requester_position TEXT,
    requester_email TEXT,
    purpose TEXT,
    destination TEXT,
    time_out TIMESTAMP WITH TIME ZONE,
    time_in TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    date_needed DATE,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- If dean_user_id is provided, verify dean authorization
    IF dean_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = dean_user_id 
            AND positions = 'Dean' 
            AND role = 'Faculty'
        ) THEN
            RAISE EXCEPTION 'User is not authorized as Dean';
        END IF;
    END IF;
    
    -- Return all dean approval records
    RETURN QUERY
    SELECT 
        da.id as approval_id,
        da.request_id,
        da.requester_name::TEXT,
        da.requester_position::TEXT,
        da.requester_email::TEXT,
        da.purpose::TEXT,
        da.destination::TEXT,
        da.time_out,
        da.time_in,
        da.reason::TEXT,
        da.date_needed,
        da.status::TEXT,
        da.created_at
    FROM dean_approvals da
    WHERE da.status = 'Pending'
    ORDER BY da.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to approve/reject dean approval
CREATE OR REPLACE FUNCTION process_dean_approval(
    approval_id BIGINT,
    dean_user_id BIGINT,
    approval_status TEXT,
    dean_notes_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    original_request_id BIGINT;
BEGIN
    -- Verify dean authorization
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = dean_user_id 
        AND positions = 'Dean' 
        AND role = 'Faculty'
    ) THEN
        RAISE EXCEPTION 'User is not authorized as Dean';
    END IF;
    
    -- Validate status
    IF approval_status NOT IN ('Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid approval status. Must be Approved or Rejected';
    END IF;
    
    -- Update dean approval record
    UPDATE dean_approvals 
    SET 
        status = approval_status,
        approved_by = dean_user_id,
        approved_date = NOW(),
        dean_notes = dean_notes_text,
        updated_at = NOW()
    WHERE id = approval_id
    RETURNING request_id INTO original_request_id;
    
    -- Update original request
    IF FOUND THEN
        UPDATE requests 
        SET 
            status = approval_status,
            approved_by = dean_user_id,
            approved_date = NOW(),
            admin_notes = dean_notes_text,
            updated_at = NOW()
        WHERE id = original_request_id;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_dean_approvals(BIGINT) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION process_dean_approval(BIGINT, BIGINT, TEXT, TEXT) TO authenticated, anon, public;

-- Migrate existing gate pass requests to dean approval system
INSERT INTO dean_approvals (
    request_id,
    requester_id,
    requester_name,
    requester_position,
    requester_email,
    purpose,
    destination,
    time_out,
    time_in,
    reason,
    date_needed,
    status,
    created_at
)
SELECT 
    r.id,
    r.user_id,
    u.name,
    u.positions,
    u.email,
    r.purpose,
    r.destination,
    r.time_out,
    r.time_in,
    r.reason,
    r.date_needed,
    CASE 
        WHEN r.status = 'Pending' THEN 'Pending'
        ELSE r.status
    END,
    r.created_at
FROM requests r
JOIN users u ON r.user_id = u.id
WHERE r.request_type = 'Gate Pass'
AND u.role = 'Faculty'
AND u.positions IN ('Program Head', 'Full Time', 'Part Time')
AND NOT EXISTS (
    SELECT 1 FROM dean_approvals da WHERE da.request_id = r.id
);

-- Update existing gate pass requests to reflect dean approval requirement
UPDATE requests 
SET 
    status = 'Pending Dean Approval',
    dean_approval_required = TRUE,
    requester_position = (SELECT positions FROM users WHERE id = requests.user_id)
WHERE request_type = 'Gate Pass'
AND user_id IN (
    SELECT id FROM users 
    WHERE role = 'Faculty' 
    AND positions IN ('Program Head', 'Full Time', 'Part Time')
)
AND status = 'Pending';

-- Add comments for documentation
COMMENT ON TABLE dean_approvals IS 'Table for managing dean approvals of gate pass requests from faculty members';
COMMENT ON COLUMN dean_approvals.request_id IS 'Reference to the original request in requests table';
COMMENT ON COLUMN dean_approvals.requester_position IS 'Position of faculty member requesting approval';
COMMENT ON COLUMN dean_approvals.dean_notes IS 'Notes from dean regarding the approval/rejection';

-- Display success message
SELECT 'Dean approval table created successfully! Existing gate pass requests have been migrated.' as status;
