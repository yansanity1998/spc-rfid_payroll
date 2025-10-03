# Class Schedule Attendance Exemption Patch

## Goal
Add "Exempted" status to the class schedule attendance table in HRAdmin Attendance view.

## Manual Changes Required

### File: `src/components/HRAdmin/Attendance.tsx`

You need to make **TWO changes**:

## Change 1: Update Class Schedule Data Processing

**Find this code around line 500-520 (in the class schedule data processing section):**

```typescript
// If no attendance record exists, mark as absent
let attendanceStatus = 'Absent';
if (!mostRecentRecord) {
  attendanceStatus = 'Absent';
}

return {
  ...schedule,
  attendance_record: mostRecentRecord,
  att_date: mostRecentRecord?.att_date || new Date().toISOString().split('T')[0],
  time_in: mostRecentRecord?.time_in || null,
  time_out: mostRecentRecord?.time_out || null,
  attendance: mostRecentRecord?.attendance || attendanceStatus,
  status: mostRecentRecord?.status || false
};
```

**Replace it with:**

```typescript
// Check for exemptions for this user and date
const scheduleDate = mostRecentRecord?.att_date || new Date().toISOString().split('T')[0];
const exemptionCheck = await checkUserExemption(schedule.user_id, scheduleDate);

// If no attendance record exists, check if exempted or mark as absent
let attendanceStatus = 'Absent';
if (exemptionCheck.isExempted) {
  attendanceStatus = 'Exempted';
} else if (!mostRecentRecord) {
  attendanceStatus = 'Absent';
}

return {
  ...schedule,
  attendance_record: mostRecentRecord,
  att_date: scheduleDate,
  time_in: mostRecentRecord?.time_in || null,
  time_out: mostRecentRecord?.time_out || null,
  attendance: exemptionCheck.isExempted ? 'Exempted' : (mostRecentRecord?.attendance || attendanceStatus),
  status: mostRecentRecord?.status || false,
  exemption: exemptionCheck // Add exemption info
};
```

## Change 2: Update Class Schedule Status Styling

**Find this code around line 1224-1230 (in the class schedule attendance table rendering):**

```typescript
<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
  record.attendance === "Present"
    ? "bg-green-100 text-green-800"
    : record.attendance === "Late"
    ? "bg-yellow-100 text-yellow-800"
    : record.attendance === "Absent"
    ? "bg-red-100 text-red-800"
    : "bg-gray-100 text-gray-800"
}`}>
```

**Replace it with:**

```typescript
<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
  record.attendance === "Present"
    ? "bg-green-100 text-green-800"
    : record.attendance === "Late"
    ? "bg-yellow-100 text-yellow-800"
    : record.attendance === "Absent"
    ? "bg-red-100 text-red-800"
    : record.attendance === "Exempted"
    ? "bg-purple-100 text-purple-800"
    : "bg-gray-100 text-gray-800"
}`}>
```

## Expected Result

After applying these changes, the class schedule attendance table will show:

### Status Colors:
- 🟢 **Present** - Faculty attended the class
- 🟡 **Late** - Faculty was late to class  
- 🔴 **Absent** - Faculty missed the class
- 🟣 **Exempted** - Faculty has approved gatepass/leave request
- ⚪ **Unknown** - No data available

### Exemption Logic:
- **Full Day Leave**: All classes for that day show "Exempted"
- **Time-Specific Gate Pass**: Only classes during gate pass time show "Exempted"
- **Normal Classes**: Show regular attendance status (Present/Late/Absent)

## Testing Steps

1. **Apply both changes** to the Attendance.tsx file
2. **Refresh the HRAdmin Attendance page**
3. **Look for purple "Exempted" badges** in the class schedule table
4. **Verify exemption details** in browser console logs

## Verification Query

Run this to see which class schedules should show as exempted:

```sql
-- Check class schedules that should be exempted today
SELECT 
    u.name as faculty_name,
    s.subject,
    s.start_time,
    s.end_time,
    se.request_type,
    se.reason,
    CASE 
        WHEN se.request_type = 'Leave' THEN 'FULL DAY EXEMPTED'
        WHEN se.request_type = 'Gate Pass' AND 
             se.start_time <= s.start_time AND 
             se.end_time >= s.end_time THEN 'CLASS TIME EXEMPTED'
        ELSE 'NOT EXEMPTED'
    END as exemption_status
FROM schedules s
JOIN users u ON s.user_id = u.id
LEFT JOIN schedule_exemptions se ON u.id = se.user_id 
    AND se.exemption_date = CURRENT_DATE
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
ORDER BY u.name, s.start_time;
```

This will show you exactly which classes should appear as "Exempted" in the table!
