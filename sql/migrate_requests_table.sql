-- Migration script to add missing columns to existing requests table
-- This will update your existing requests table with the new dean approval fields

-- Add the missing columns to the existing requests table
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS dean_approval_required BOOLEAN DEFAULT FALSE;

ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS requester_position VARCHAR(50);

ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Update the approved_by column to be BIGINT (if it's currently VARCHAR)
-- First, let's check and update the column type safely
DO $$
BEGIN
    -- Try to alter the column type
    BEGIN
        ALTER TABLE requests ALTER COLUMN approved_by TYPE BIGINT USING approved_by::BIGINT;
    EXCEPTION
        WHEN invalid_text_representation THEN
            -- If conversion fails, set NULL values first, then change type
            UPDATE requests SET approved_by = NULL WHERE approved_by IS NOT NULL AND approved_by !~ '^[0-9]+$';
            ALTER TABLE requests ALTER COLUMN approved_by TYPE BIGINT USING 
                CASE 
                    WHEN approved_by ~ '^[0-9]+$' THEN approved_by::BIGINT 
                    ELSE NULL 
                END;
        WHEN others THEN
            -- Column might already be BIGINT, continue
            NULL;
    END;
END $$;

-- Add the foreign key constraint for approved_by if it doesn't exist
DO $$
BEGIN
    ALTER TABLE requests ADD CONSTRAINT fk_requests_approved_by 
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, skip
        NULL;
END $$;

-- Update the status column to include the new status option
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE requests ADD CONSTRAINT requests_status_check 
CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Pending Dean Approval'));

-- Create the missing indexes
CREATE INDEX IF NOT EXISTS idx_requests_approved_by ON requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_requests_dean_approval ON requests(dean_approval_required);
CREATE INDEX IF NOT EXISTS idx_requests_position ON requests(requester_position);

-- Update existing Gate Pass requests from faculty members to require dean approval
UPDATE requests 
SET 
    dean_approval_required = TRUE,
    requester_position = u.positions,
    status = CASE 
        WHEN requests.status = 'Pending' THEN 'Pending Dean Approval'
        ELSE requests.status
    END
FROM users u
WHERE requests.user_id = u.id
AND requests.request_type = 'Gate Pass'
AND u.role = 'Faculty'
AND u.positions IN ('Program Head', 'Full Time', 'Part Time')
AND (requests.dean_approval_required IS NULL OR requests.dean_approval_required = FALSE);

-- Display success message
SELECT 'Requests table migration completed successfully!' as status,
       'Existing Gate Pass requests from faculty have been updated to require dean approval.' as details;
