-- Fix script to create exemptions for existing approved requests
-- Run this if the automatic trigger didn't work for existing data

-- First, let's manually create exemptions for existing approved Gate Pass requests
INSERT INTO schedule_exemptions (
    user_id,
    request_id,
    request_type,
    exemption_date,
    start_time,
    end_time,
    reason
)
SELECT 
    r.user_id,
    r.id,
    r.request_type,
    r.time_out::DATE,
    r.time_out::TIME,
    r.time_in::TIME,
    COALESCE(r.purpose, 'Gate Pass Request')
FROM requests r
WHERE r.status = 'Approved' 
  AND r.request_type = 'Gate Pass'
  AND r.time_out IS NOT NULL 
  AND r.time_in IS NOT NULL
  AND r.id NOT IN (SELECT DISTINCT request_id FROM schedule_exemptions WHERE request_type = 'Gate Pass');

-- Create exemptions for existing approved Leave requests
-- This will create one exemption record for each day in the leave period
INSERT INTO schedule_exemptions (
    user_id,
    request_id,
    request_type,
    exemption_date,
    start_time,
    end_time,
    reason
)
SELECT 
    r.user_id,
    r.id,
    r.request_type,
    generate_series(r.start_date, r.end_date, '1 day'::interval)::DATE,
    NULL, -- Full day exemption for leave
    NULL, -- Full day exemption for leave
    COALESCE(r.leave_type || ': ' || r.reason, 'Leave Request')
FROM requests r
WHERE r.status = 'Approved' 
  AND r.request_type = 'Leave'
  AND r.start_date IS NOT NULL 
  AND r.end_date IS NOT NULL
  AND r.id NOT IN (SELECT DISTINCT request_id FROM schedule_exemptions WHERE request_type = 'Leave');

-- Verify the exemptions were created
SELECT 
    COUNT(*) as total_exemptions,
    request_type,
    COUNT(DISTINCT user_id) as users_with_exemptions
FROM schedule_exemptions 
GROUP BY request_type;

-- Show recent exemptions created
SELECT 
    se.*,
    u.name as user_name,
    r.purpose,
    r.leave_type
FROM schedule_exemptions se
JOIN users u ON se.user_id = u.id
JOIN requests r ON se.request_id = r.id
WHERE se.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY se.created_at DESC;
