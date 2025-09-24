# Schedule Management Setup Guide

## Database Setup

To set up the schedules table in your Supabase database, follow these steps:

### 1. Create the Schedules Table

Execute the SQL script in `supabase/schedules_table.sql` in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/schedules_table.sql`
4. Click "Run" to execute the script

### 2. Verify Table Creation

After running the script, verify that the `schedules` table was created with the following structure:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables WHERE table_name = 'schedules';

-- View table structure
\d schedules;
```

### 3. Test the Schedule Management

1. Navigate to `/hrAdmin/schedule` in your application
2. Select a Faculty or SA user from the dropdown
3. Create a test schedule entry
4. Use the SQL editor to query the data

## Features

### Schedule Management
- **User Selection**: Filter and select Faculty and SA users only
- **Schedule Creation**: Add schedules with day, time, subject, room, and notes
- **Schedule Viewing**: View all schedules for a selected user in a table format
- **Schedule Deletion**: Remove schedules with confirmation

### SQL Editor
- **Query Execution**: Run SELECT queries on schedules and users tables
- **Quick Queries**: Pre-defined buttons for common queries
- **Results Display**: View query results in formatted JSON
- **Error Handling**: Clear error messages for invalid queries

### Security
- **Row Level Security**: Implemented RLS policies
- **HR Access**: HR Personnel and Administrators can manage all schedules
- **User Access**: Faculty and SA can view their own schedules
- **Data Validation**: Time constraints and data type validation

## Usage Examples

### Creating a Schedule
1. Select a user from the dropdown
2. Click "Add Schedule"
3. Fill in the form with:
   - Day of week
   - Start and end times
   - Subject/activity (optional)
   - Room/location (optional)
   - Notes (optional)
4. Click "Create Schedule"

### Using the SQL Editor
1. Click "SQL Editor" to open the editor
2. Use quick query buttons or write custom SELECT queries
3. Supported tables: `schedules`, `users`
4. Example queries:
   ```sql
   SELECT * FROM schedules;
   SELECT * FROM users WHERE role IN ('Faculty', 'SA');
   SELECT * FROM schedules WHERE day_of_week = 'Monday';
   ```

## Troubleshooting

### Common Issues

1. **Table doesn't exist**: Run the SQL script in `supabase/schedules_table.sql`
2. **Permission denied**: Ensure RLS policies are properly set up
3. **No users showing**: Verify users table has Faculty and SA roles
4. **SQL editor errors**: Only SELECT queries on schedules and users tables are supported

### Database Permissions

Ensure your Supabase project has the following:
- `authenticated` role has access to `schedules` table
- RLS policies are enabled and configured
- Foreign key relationship with `users` table exists

## Table Schema

```sql
CREATE TABLE schedules (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    day_of_week VARCHAR(10) CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject VARCHAR(255),
    room VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```
