-- Create schedule exemptions table to track when faculty schedules are exempted due to approved requests
CREATE TABLE IF NOT EXISTS schedule_exemptions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    request_id BIGINT NOT NULL,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('Gate Pass', 'Leave')),
    exemption_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Disable RLS for schedule exemptions table
ALTER TABLE schedule_exemptions DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all roles
GRANT ALL ON schedule_exemptions TO authenticated, anon, public;

-- Grant sequence permissions
GRANT ALL ON schedule_exemptions_id_seq TO authenticated, anon, public;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_exemptions_user_id ON schedule_exemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exemptions_request_id ON schedule_exemptions(request_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exemptions_date ON schedule_exemptions(exemption_date);
CREATE INDEX IF NOT EXISTS idx_schedule_exemptions_type ON schedule_exemptions(request_type);

-- Add comments for documentation
COMMENT ON TABLE schedule_exemptions IS 'Tracks schedule exemptions for faculty when their gatepass/leave requests are approved';
COMMENT ON COLUMN schedule_exemptions.user_id IS 'Faculty member whose schedule is exempted';
COMMENT ON COLUMN schedule_exemptions.request_id IS 'The approved request that caused the exemption';
COMMENT ON COLUMN schedule_exemptions.request_type IS 'Type of request: Gate Pass or Leave';
COMMENT ON COLUMN schedule_exemptions.exemption_date IS 'Date when the schedule is exempted';
COMMENT ON COLUMN schedule_exemptions.start_time IS 'Start time of exemption (for Gate Pass)';
COMMENT ON COLUMN schedule_exemptions.end_time IS 'End time of exemption (for Gate Pass)';
COMMENT ON COLUMN schedule_exemptions.reason IS 'Reason for exemption (purpose/leave type)';

-- Create function to automatically create schedule exemptions when requests are approved
CREATE OR REPLACE FUNCTION create_schedule_exemptions()
RETURNS TRIGGER AS $$
DECLARE
    current_date_iter DATE;
    exemption_reason TEXT;
BEGIN
    -- Only process when status changes to 'Approved'
    IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
        
        -- Handle Gate Pass requests
        IF NEW.request_type = 'Gate Pass' THEN
            -- Extract date from time_out (assuming this is when they'll be away)
            IF NEW.time_out IS NOT NULL AND NEW.time_in IS NOT NULL THEN
                INSERT INTO schedule_exemptions (
                    user_id,
                    request_id,
                    request_type,
                    exemption_date,
                    start_time,
                    end_time,
                    reason
                ) VALUES (
                    NEW.user_id,
                    NEW.id,
                    NEW.request_type,
                    NEW.time_out::DATE,
                    NEW.time_out::TIME,
                    NEW.time_in::TIME,
                    COALESCE(NEW.purpose, 'Gate Pass Request')
                );
            END IF;
            
        -- Handle Leave requests
        ELSIF NEW.request_type = 'Leave' THEN
            -- Create exemptions for each day in the leave period
            current_date_iter := NEW.start_date;
            exemption_reason := COALESCE(NEW.leave_type || ': ' || NEW.reason, 'Leave Request');
            
            WHILE current_date_iter <= NEW.end_date LOOP
                INSERT INTO schedule_exemptions (
                    user_id,
                    request_id,
                    request_type,
                    exemption_date,
                    start_time,
                    end_time,
                    reason
                ) VALUES (
                    NEW.user_id,
                    NEW.id,
                    NEW.request_type,
                    current_date_iter,
                    NULL, -- Full day exemption for leave
                    NULL, -- Full day exemption for leave
                    exemption_reason
                );
                
                current_date_iter := current_date_iter + INTERVAL '1 day';
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create exemptions when requests are approved
DROP TRIGGER IF EXISTS trigger_create_schedule_exemptions ON requests;
CREATE TRIGGER trigger_create_schedule_exemptions
    AFTER UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION create_schedule_exemptions();

-- Create function to check if a user has schedule exemption for a specific date/time
CREATE OR REPLACE FUNCTION is_schedule_exempted(
    p_user_id BIGINT,
    p_date DATE,
    p_time TIME DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    exemption_count INTEGER;
BEGIN
    -- Check for full day exemptions (leave requests)
    SELECT COUNT(*) INTO exemption_count
    FROM schedule_exemptions
    WHERE user_id = p_user_id
      AND exemption_date = p_date
      AND request_type = 'Leave';
    
    IF exemption_count > 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Check for time-specific exemptions (gate pass requests)
    IF p_time IS NOT NULL THEN
        SELECT COUNT(*) INTO exemption_count
        FROM schedule_exemptions
        WHERE user_id = p_user_id
          AND exemption_date = p_date
          AND request_type = 'Gate Pass'
          AND start_time <= p_time
          AND end_time >= p_time;
        
        IF exemption_count > 0 THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION is_schedule_exempted(BIGINT, DATE, TIME) TO authenticated, anon, public;

-- Create view to easily see exempted schedules with details
CREATE OR REPLACE VIEW exempted_schedules_view AS
SELECT 
    se.*,
    u.name as user_name,
    u.email as user_email,
    u.role,
    u.positions,
    r.purpose,
    r.destination,
    r.leave_type,
    r.status as request_status,
    s.day_of_week,
    s.start_time as schedule_start,
    s.end_time as schedule_end,
    s.subject,
    s.room
FROM schedule_exemptions se
JOIN users u ON se.user_id = u.id
JOIN requests r ON se.request_id = r.id
LEFT JOIN schedules s ON s.user_id = se.user_id 
    AND EXTRACT(DOW FROM se.exemption_date) = 
        CASE s.day_of_week
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
            WHEN 'Saturday' THEN 6
            WHEN 'Sunday' THEN 0
        END
ORDER BY se.exemption_date DESC, se.start_time;

-- Grant permissions on the view
GRANT ALL ON exempted_schedules_view TO authenticated, anon, public;
