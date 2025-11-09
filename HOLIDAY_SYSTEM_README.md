# Holiday Management System

## Overview
The Holiday Management System allows HR Admins to create and manage holidays, special holidays, and school events. When a date is marked as an **active holiday**, users are automatically **exempted from attendance requirements** for that day.

## Key Features

### 1. Holiday Creation & Management
- **Add Holidays**: Create new holidays with title, date, type, and description
- **Edit Holidays**: Modify existing holiday details
- **Delete Holidays**: Remove holidays from the system
- **Toggle Active Status**: Enable/disable holidays without deleting them

### 2. Holiday Types
- **Regular Holiday**: National/official holidays (e.g., Christmas, New Year)
- **Special Holiday**: Special non-working days
- **School Event**: School-specific events or closures

### 3. Attendance Exemption Logic

#### How It Works:
1. **Admin Creates Holiday**: HR Admin sets a date as a holiday through the Holiday Management interface
2. **Automatic Exemption**: When the system runs the auto-absent check (after 7:00 PM), it first checks if today is an active holiday
3. **Skip Absent Marking**: If today is a holiday, the system skips marking users as absent entirely
4. **No Penalties**: Users who don't tap in on holidays will NOT receive absent penalties

#### Technical Flow:
```
Daily Auto-Absent Check (after 7:00 PM)
    ↓
Check: Is today an active holiday?
    ↓
YES → Skip all absent marking (users are exempted)
    ↓
NO → Continue with normal absent logic
    ↓
    Check: Does user have attendance record?
        ↓
    NO → Mark as absent with ₱240 penalty
```

## Database Schema

### holidays Table
```sql
CREATE TABLE holidays (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL UNIQUE,              -- Only one holiday per date
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'Regular Holiday',
  is_active BOOLEAN DEFAULT TRUE,         -- Toggle to enable/disable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Key Fields:
- **date**: UNIQUE constraint ensures only one holiday per date
- **is_active**: Allows temporary disabling without deletion
  - `TRUE` = Holiday is active, users are exempted
  - `FALSE` = Holiday is inactive, normal attendance rules apply

## User Interface

### Holiday Management Page (`/hrAdmin/holiday`)
- **Card Grid Layout**: Visual display of all holidays
- **Color-Coded Types**:
  - Regular Holiday: Red badge
  - Special Holiday: Blue badge
  - School Event: Green badge
- **Visual Indicators**:
  - Active holidays: Normal appearance
  - Inactive holidays: Dimmed with "Inactive" badge
- **Actions**: Edit, Delete buttons for each holiday

### Holiday Form Modal
- **Title**: Name of the holiday (required)
- **Date**: Date picker (required, unique)
- **Type**: Dropdown selection (required)
- **Description**: Optional notes
- **Active Checkbox**: Toggle attendance exemption
  - Label: "Active (Users will be exempted from attendance on this date)"

## Usage Examples

### Example 1: National Holiday
```
Title: Christmas Day
Date: 2024-12-25
Type: Regular Holiday
Description: National holiday - Christmas celebration
Active: ✓ (checked)

Result: All users exempted from attendance on Dec 25, 2024
```

### Example 2: School Event
```
Title: Foundation Day
Date: 2024-11-15
Type: School Event
Description: Annual school foundation celebration
Active: ✓ (checked)

Result: All users exempted from attendance on Nov 15, 2024
```

### Example 3: Temporarily Disabled Holiday
```
Title: Special Working Day
Date: 2024-12-26
Type: Special Holiday
Description: Originally a holiday but converted to working day
Active: ✗ (unchecked)

Result: Normal attendance rules apply on Dec 26, 2024
```

## Integration with Attendance System

### Modified Files:
1. **`src/components/HRAdmin/Holiday.tsx`**
   - Complete holiday management interface
   - CRUD operations for holidays

2. **`src/components/HRAdmin/Attendance.tsx`**
   - Modified `addAutomaticAbsentRecords()` function
   - Added holiday check before marking users absent

3. **`sql/create_holidays_table.sql`**
   - Database schema with proper indexes
   - RLS disabled for unrestricted access

### Code Integration:
```typescript
// In Attendance.tsx - addAutomaticAbsentRecords()
const { data: holidayCheck } = await supabase
  .from("holidays")
  .select("id, title, is_active")
  .eq("date", today)
  .eq("is_active", true)
  .maybeSingle();

if (holidayCheck) {
  console.log(`Today is a holiday: "${holidayCheck.title}". Skipping auto-absent logic.`);
  return; // Exit early - no one marked absent
}
```

## Setup Instructions

### 1. Create Database Table
Run the SQL script to create the holidays table:
```bash
# In Supabase SQL Editor, run:
sql/create_holidays_table.sql
```

### 2. Access Holiday Management
1. Login as HR Admin
2. Navigate to Holiday menu item (below Schedule)
3. Click "Add Holiday" to create your first holiday

### 3. Test the System
1. Create a holiday for today's date
2. Ensure "Active" checkbox is checked
3. Wait until after 7:00 PM
4. Check Attendance page - users should NOT be marked absent

## Important Notes

### ✅ DO:
- Create holidays in advance for the entire year
- Use descriptive titles (e.g., "Christmas Day", not just "Holiday")
- Add descriptions for clarity
- Keep holidays active when they should apply

### ❌ DON'T:
- Create multiple holidays for the same date (database will reject)
- Forget to check the "Active" checkbox for holidays that should apply
- Delete holidays - use "Active" toggle instead for historical records

## Benefits

1. **Automatic Exemption**: No manual intervention needed
2. **Fair System**: Users aren't penalized for not working on holidays
3. **Flexible**: Can temporarily disable holidays if needed
4. **Transparent**: Clear visual indicators of active/inactive holidays
5. **Audit Trail**: All holidays are logged with creation timestamps

## Future Enhancements (Optional)

- [ ] Bulk import holidays from CSV
- [ ] Holiday templates for recurring annual holidays
- [ ] Email notifications when holidays are created
- [ ] Calendar view of all holidays
- [ ] Holiday approval workflow
- [ ] Integration with payroll for holiday pay calculations

## Support

For issues or questions about the Holiday Management System:
1. Check console logs for "[AutoAbsent]" messages
2. Verify holiday is marked as "Active" in the system
3. Ensure database table was created correctly
4. Check that date format matches (YYYY-MM-DD)

---

**Last Updated**: November 9, 2024
**Version**: 1.0
**Maintained By**: HR Admin Team
