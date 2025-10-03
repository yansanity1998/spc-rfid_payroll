-- Check if exemption data was created for existing approved requests
-- Run these queries to verify the system is working

-- 1. Check all approved requests that should have created exemptions
SELECT 
    r.id as request_id,
    r.user_id,
    u.name as user_name,
    r.request_type,
    r.status,
    r.time_out,
    r.time_in,
    r.start_date,
    r.end_date,
    r.purpose,
    r.leave_type,
    r.created_at,
    r.updated_at
FROM requests r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'Approved' 
  AND r.request_type IN ('Gate Pass', 'Leave')
ORDER BY r.updated_at DESC;

-- 2. Check if exemptions were created
SELECT 
    se.*,
    u.name as user_name,
    r.request_type,
    r.purpose,
    r.leave_type
FROM schedule_exemptions se
JOIN users u ON se.user_id = u.id
JOIN requests r ON se.request_id = r.id
ORDER BY se.exemption_date DESC;

-- 3. Check the exempted schedules view
SELECT * FROM exempted_schedules_view 
ORDER BY exemption_date DESC;

-- 4. If no exemptions exist, manually trigger creation for existing approved requests
-- This will update all approved requests to trigger the exemption creation
UPDATE requests 
SET updated_at = NOW() 
WHERE status = 'Approved' 
  AND request_type IN ('Gate Pass', 'Leave')
  AND id NOT IN (SELECT DISTINCT request_id FROM schedule_exemptions);

-- 5. Check exemptions again after manual trigger
SELECT 
    se.*,
    u.name as user_name,
    r.request_type,
    r.purpose,
    r.leave_type,
    r.reason
FROM schedule_exemptions se
JOIN users u ON se.user_id = u.id
JOIN requests r ON se.request_id = r.id
ORDER BY se.exemption_date DESC;

-- 6. Test the exemption function for a specific user and date
-- Replace USER_ID and DATE with actual values
-- SELECT is_schedule_exempted(USER_ID, 'YYYY-MM-DD', 'HH:MM');
-- Example: SELECT is_schedule_exempted(1, '2024-10-03', '14:30');

-- 7. Check for any errors in trigger execution
-- Look for recent requests that should have exemptions but don't
SELECT 
    r.id as request_id,
    r.user_id,
    u.name,
    r.request_type,
    r.status,
    r.updated_at,
    CASE 
        WHEN EXISTS (SELECT 1 FROM schedule_exemptions WHERE request_id = r.id) 
        THEN 'Has Exemption' 
        ELSE 'Missing Exemption' 
    END as exemption_status
FROM requests r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'Approved' 
  AND r.request_type IN ('Gate Pass', 'Leave')
ORDER BY r.updated_at DESC;
