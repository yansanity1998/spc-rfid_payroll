-- Test script for class schedule exemptions
-- Use this to verify exemptions are working for class schedules

-- 1. Check which users have class schedules today
SELECT 
    s.user_id,
    u.name as user_name,
    u.role,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.subject,
    s.room,
    CASE 
        WHEN EXTRACT(DOW FROM CURRENT_DATE) = 
            CASE s.day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
                WHEN 'Sunday' THEN 0
            END
        THEN 'Has Class Today'
        ELSE 'No Class Today'
    END as class_status
FROM schedules s
JOIN users u ON s.user_id = u.id
WHERE u.role IN ('Faculty', 'SA')
ORDER BY s.user_id, s.start_time;

-- 2. Check which users have exemptions today
SELECT 
    se.user_id,
    u.name as user_name,
    se.request_type,
    se.exemption_date,
    se.start_time,
    se.end_time,
    se.reason,
    CASE 
        WHEN se.exemption_date = CURRENT_DATE THEN 'Exempted Today'
        WHEN se.exemption_date > CURRENT_DATE THEN 'Future Exemption'
        ELSE 'Past Exemption'
    END as exemption_status
FROM schedule_exemptions se
JOIN users u ON se.user_id = u.id
WHERE u.role IN ('Faculty', 'SA')
ORDER BY se.exemption_date DESC, se.user_id;

-- 3. Find users who have both class schedules AND exemptions today
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.role,
    'Has Class Schedule' as schedule_info,
    se.request_type,
    se.exemption_date,
    se.start_time as exemption_start,
    se.end_time as exemption_end,
    se.reason,
    s.subject,
    s.start_time as class_start,
    s.end_time as class_end,
    CASE 
        WHEN se.request_type = 'Leave' THEN 'FULL DAY EXEMPTION - All classes exempted'
        WHEN se.request_type = 'Gate Pass' AND 
             se.start_time <= s.start_time AND 
             se.end_time >= s.end_time THEN 'CLASS EXEMPTED - Gate pass covers class time'
        WHEN se.request_type = 'Gate Pass' THEN 'PARTIAL EXEMPTION - Check time overlap'
        ELSE 'NO EXEMPTION'
    END as exemption_result
FROM users u
JOIN schedules s ON u.id = s.user_id
LEFT JOIN schedule_exemptions se ON u.id = se.user_id AND se.exemption_date = CURRENT_DATE
WHERE u.role IN ('Faculty', 'SA')
  AND EXTRACT(DOW FROM CURRENT_DATE) = 
      CASE s.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 0
      END
ORDER BY u.id, s.start_time;

-- 4. Test the exemption function for specific users with classes today
-- Replace USER_ID with actual user IDs who have classes today
-- SELECT is_schedule_exempted(USER_ID, CURRENT_DATE, CURRENT_TIME);

-- 5. Check current time and day for debugging
SELECT 
    CURRENT_DATE as today_date,
    CURRENT_TIME as current_time,
    EXTRACT(DOW FROM CURRENT_DATE) as day_of_week_number,
    TO_CHAR(CURRENT_DATE, 'Day') as day_name,
    CASE EXTRACT(DOW FROM CURRENT_DATE)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name_check;

-- 6. Simulate class schedule scanner test
-- This shows what should happen when each user scans
SELECT 
    u.id as user_id,
    u.name as user_name,
    CASE 
        WHEN se.request_type = 'Leave' THEN 
            'EXEMPTED: Your class schedule is exempted for the entire day due to approved ' || se.reason
        WHEN se.request_type = 'Gate Pass' AND 
             CURRENT_TIME BETWEEN se.start_time AND se.end_time THEN 
            'EXEMPTED: Your class schedule is exempted from ' || se.start_time || ' to ' || se.end_time || ' due to approved ' || se.reason
        WHEN EXISTS (
            SELECT 1 FROM schedules s2 
            WHERE s2.user_id = u.id 
            AND EXTRACT(DOW FROM CURRENT_DATE) = 
                CASE s2.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 0
                END
        ) THEN 'NORMAL: Will proceed with class attendance recording'
        ELSE 'NO SCHEDULE: No class schedule for today'
    END as scanner_result
FROM users u
LEFT JOIN schedule_exemptions se ON u.id = se.user_id AND se.exemption_date = CURRENT_DATE
WHERE u.role IN ('Faculty', 'SA')
ORDER BY u.id;
