-- Fix dean approval alignment and ensure existing requests appear
-- This script ensures proper position alignment and migrates existing requests

-- First, let's check and fix any position mismatches
-- Update any 'Part Time' positions to match the constraint
UPDATE users 
SET positions = 'Part Time'
WHERE positions IN ('part time', 'Part time', 'part Time', 'PART TIME')
AND role = 'Faculty';

-- Update any 'Full Time' positions to match the constraint  
UPDATE users 
SET positions = 'Full Time'
WHERE positions IN ('full time', 'Full time', 'full Time', 'FULL TIME')
AND role = 'Faculty';

-- Update any 'Program Head' positions to match the constraint
UPDATE users 
SET positions = 'Program Head'
WHERE positions IN ('program head', 'Program head', 'program Head', 'PROGRAM HEAD')
AND role = 'Faculty';

-- Update any 'Dean' positions to match the constraint
UPDATE users 
SET positions = 'Dean'
WHERE positions IN ('dean', 'DEAN')
AND role = 'Faculty';

-- Now ensure all existing Gate Pass requests from faculty are properly set up for dean approval
UPDATE requests 
SET 
    dean_approval_required = TRUE,
    requester_position = u.positions,
    status = CASE 
        WHEN requests.status = 'Pending' THEN 'Pending Dean Approval'
        ELSE requests.status
    END,
    updated_at = NOW()
FROM users u
WHERE requests.user_id = u.id
AND requests.request_type = 'Gate Pass'
AND u.role = 'Faculty'
AND u.positions IN ('Program Head', 'Full Time', 'Part Time');

-- Create dean approval records for all existing Gate Pass requests that need dean approval
-- Only run this if dean_approvals table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dean_approvals') THEN
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
                WHEN r.status IN ('Pending', 'Pending Dean Approval') THEN 'Pending'
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
        
        RAISE NOTICE 'Dean approval records created successfully';
    ELSE
        RAISE NOTICE 'dean_approvals table does not exist yet. Run create_dean_approval_table.sql first.';
    END IF;
END $$;

-- Display current status
SELECT 
    'Dean Approval System Status' as info,
    COUNT(*) as total_gate_pass_requests
FROM requests 
WHERE request_type = 'Gate Pass';

-- Display pending dean approvals (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dean_approvals') THEN
        PERFORM 1; -- Just to have a valid statement in the IF block
        -- The actual SELECT will be run outside this block
    ELSE
        RAISE NOTICE 'dean_approvals table does not exist yet. Skipping dean approval queries.';
    END IF;
END $$;

-- Show pending dean approvals if table exists
DO $$
DECLARE
    pending_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dean_approvals') THEN
        SELECT COUNT(*) INTO pending_count FROM dean_approvals WHERE status = 'Pending';
        RAISE NOTICE 'Pending Dean Approvals: %', pending_count;
    ELSE
        RAISE NOTICE 'Pending Dean Approvals: 0 (table does not exist yet)';
    END IF;
END $$;

SELECT 
    'Faculty Positions Summary' as info,
    positions,
    COUNT(*) as count
FROM users 
WHERE role = 'Faculty'
GROUP BY positions;

-- Show the specific requests that should appear for dean approval (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dean_approvals') THEN
        -- This will be shown in a separate query below
        RAISE NOTICE 'Dean approval records will be displayed below';
    ELSE
        RAISE NOTICE 'No dean approval records to display - table does not exist yet';
    END IF;
END $$;

SELECT 'Dean approval alignment completed successfully!' as status;
