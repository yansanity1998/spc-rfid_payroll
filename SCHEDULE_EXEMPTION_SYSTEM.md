# Schedule Exemption System Implementation Guide

## Overview

The Schedule Exemption System automatically exempts faculty schedules when their gatepass and leave requests are fully approved. This ensures that faculty members who have approved requests are not penalized for missing their scheduled classes or work sessions.

## Features Implemented

### 1. Database Structure
- **`schedule_exemptions` table**: Tracks exempted schedules with request details
- **Automatic triggers**: Creates exemptions when requests are approved
- **View integration**: `exempted_schedules_view` for easy data access

### 2. Automatic Exemption Logic
- **Gate Pass Requests**: Creates time-specific exemptions for the requested time period
- **Leave Requests**: Creates full-day exemptions for each day in the leave period
- **Trigger-based**: Automatically activates when request status changes to "Approved"

### 3. Attendance System Integration
- **Scanner Integration**: Both regular and class schedule scanners check for exemptions
- **Exemption Messages**: Users receive informative messages when exempted
- **Penalty Prevention**: Exempted users are not penalized for missing attendance

### 4. User Interface Enhancements
- **Faculty Request View**: Shows current exempted schedules
- **Visual Indicators**: Clear display of exemption reason and duration
- **Real-time Updates**: Exemptions appear immediately after approval

## Installation Steps

### Step 1: Run Database Setup
Execute the SQL script to create the exemption system:

```sql
-- Run this in your Supabase SQL editor
\i 'sql/create_schedule_exemptions.sql'
```

### Step 2: Verify Database Tables
Check that the following tables were created:
- `schedule_exemptions`
- `exempted_schedules_view` (view)

### Step 3: Test the System
1. Create a test faculty user
2. Submit a gatepass or leave request
3. Approve the request (status = "Approved")
4. Verify exemption appears in `schedule_exemptions` table
5. Test RFID scanner with exempted user

## How It Works

### Gate Pass Exemptions
When a gate pass request is approved:
1. System extracts `time_out` and `time_in` from the request
2. Creates exemption record for that specific date and time range
3. Faculty member is exempted only during the requested time period

### Leave Request Exemptions
When a leave request is approved:
1. System calculates all dates between `start_date` and `end_date`
2. Creates exemption records for each day in the period
3. Faculty member is exempted for full days during leave

### Attendance Scanner Behavior
When faculty scans RFID:
1. System checks for active exemptions for current date/time
2. If exempted, displays exemption message and prevents attendance recording
3. If not exempted, proceeds with normal attendance flow

## Database Schema

### schedule_exemptions Table
```sql
CREATE TABLE schedule_exemptions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    request_id BIGINT NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    exemption_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Functions
- `create_schedule_exemptions()`: Trigger function for automatic exemption creation
- `is_schedule_exempted()`: Check if user is exempted for specific date/time
- `exempted_schedules_view`: Combined view with user and request details

## Usage Examples

### Example 1: Gate Pass Request
```
Faculty: John Doe
Request: Gate Pass from 2:00 PM to 4:00 PM on 2024-10-03
Status: Approved

Result: 
- Exemption created for 2024-10-03, 14:00-16:00
- John cannot scan attendance during this period
- Shows message: "You are exempted from attendance during 14:00 - 16:00 due to: Business Meeting"
```

### Example 2: Leave Request
```
Faculty: Jane Smith
Request: Sick Leave from 2024-10-05 to 2024-10-07
Status: Approved

Result:
- Exemptions created for 2024-10-05, 2024-10-06, 2024-10-07 (full days)
- Jane cannot scan attendance on these dates
- Shows message: "You are exempted from attendance for the entire day due to: Sick Leave: Medical appointment"
```

## Testing Checklist

### Database Tests
- [ ] `schedule_exemptions` table created successfully
- [ ] Trigger function `create_schedule_exemptions()` exists
- [ ] View `exempted_schedules_view` accessible
- [ ] Function `is_schedule_exempted()` works correctly

### Functional Tests
- [ ] Gate pass approval creates time-specific exemption
- [ ] Leave approval creates full-day exemptions for all dates
- [ ] Scanner shows exemption message for exempted users
- [ ] Non-exempted users can scan normally
- [ ] Faculty request view shows current exemptions

### UI Tests
- [ ] Exempted schedules display in Faculty Request component
- [ ] Exemption cards show correct information
- [ ] Color coding works (blue for gate pass, purple for leave)
- [ ] Date and time formatting is correct

## Troubleshooting

### Common Issues

1. **Exemptions not created after approval**
   - Check if trigger `trigger_create_schedule_exemptions` exists
   - Verify request status is exactly "Approved"
   - Check trigger function logs

2. **Scanner not recognizing exemptions**
   - Verify `checkScheduleExemption()` function is called
   - Check exemption date format (YYYY-MM-DD)
   - Ensure time comparison logic is correct

3. **UI not showing exemptions**
   - Check if `exempted_schedules_view` returns data
   - Verify user authentication and ID matching
   - Check component state updates

### Debug Queries

```sql
-- Check exemptions for a user
SELECT * FROM schedule_exemptions WHERE user_id = [USER_ID];

-- Check exempted schedules view
SELECT * FROM exempted_schedules_view WHERE user_id = [USER_ID];

-- Check if function works
SELECT is_schedule_exempted([USER_ID], '2024-10-03', '14:30');
```

## Security Considerations

- **RLS Disabled**: Schedule exemptions table has Row Level Security disabled for unrestricted access
- **Automatic Creation**: Exemptions are created automatically by database triggers
- **Audit Trail**: All exemptions linked to original requests for accountability
- **Time Validation**: System validates time ranges and dates

## Future Enhancements

### Potential Improvements
1. **Partial Exemptions**: Allow exemptions for specific classes only
2. **Recurring Exemptions**: Support for weekly/monthly recurring exemptions
3. **Exemption Notifications**: Email/SMS notifications when exemptions are created
4. **Admin Override**: Allow HR to manually create/modify exemptions
5. **Reporting**: Generate reports on exemption usage and patterns

### Integration Opportunities
1. **Calendar Integration**: Sync with institutional calendars
2. **Mobile App**: Mobile interface for viewing exemptions
3. **API Endpoints**: REST API for external system integration
4. **Backup Systems**: Alternative attendance methods during exemptions

## Support

For technical support or questions about the Schedule Exemption System:
1. Check this documentation first
2. Review database logs and error messages
3. Test with sample data to isolate issues
4. Contact system administrator for database-level problems

## Version History

- **v1.0**: Initial implementation with basic exemption functionality
- **v1.1**: Added UI components and visual indicators
- **v1.2**: Enhanced scanner integration and error handling

---

**Note**: This system is designed to work with the existing SPC RFID Payroll system. Ensure all dependencies are properly installed and configured before implementation.
