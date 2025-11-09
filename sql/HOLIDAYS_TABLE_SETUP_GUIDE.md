# Holidays Table Setup Guide

## Choose the Right Script

### Option 1: Fresh Installation (Recommended for new setup)
**File**: `create_holidays_table_fresh.sql`

**Use when**:
- ✅ You're creating the holidays table for the first time
- ✅ The table doesn't exist yet
- ✅ You want a clean installation

**Steps**:
1. Open Supabase SQL Editor
2. Copy and paste the entire contents of `create_holidays_table_fresh.sql`
3. Click "Run"
4. You should see: "Holidays table created successfully!"

---

### Option 2: Safe Update (For existing tables)
**File**: `create_holidays_table_safe.sql`

**Use when**:
- ✅ The holidays table already exists
- ✅ You want to add the `created_by` column to existing table
- ✅ You don't want to lose existing data

**Steps**:
1. Open Supabase SQL Editor
2. Copy and paste the entire contents of `create_holidays_table_safe.sql`
3. Click "Run"
4. You should see success notices in the output

---

## Troubleshooting

### Error: "column created_by does not exist"

**Cause**: The table exists but doesn't have the `created_by` column yet.

**Solution**: Use `create_holidays_table_safe.sql` instead of the original script.

---

### Error: "relation holidays already exists"

**Cause**: The table already exists.

**Solution**: 
- Use `create_holidays_table_safe.sql` to update it
- OR if you want to start fresh (⚠️ **WARNING: Deletes all data**):
  ```sql
  DROP TABLE IF EXISTS holidays CASCADE;
  ```
  Then run `create_holidays_table_fresh.sql`

---

### Error: "foreign key constraint"

**Cause**: The `users` table doesn't exist or doesn't have an `id` column.

**Solution**: Make sure the `users` table is created first with:
```sql
SELECT * FROM users LIMIT 1;
```

If users table doesn't exist, create it first before creating holidays table.

---

## Verification

After running the script, verify the table was created correctly:

```sql
-- Check if table exists
SELECT * FROM holidays;

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'holidays'
ORDER BY ordinal_position;

-- Check foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'holidays' 
    AND tc.constraint_type = 'FOREIGN KEY';
```

**Expected Result**:
- Table name: `holidays`
- Foreign key: `created_by` → `users.id`
- Columns: id, title, date, description, type, is_active, created_by, created_at, updated_at

---

## Quick Start

### For First-Time Setup:
```sql
-- Just copy and paste this entire file: create_holidays_table_fresh.sql
```

### For Updating Existing Table:
```sql
-- Just copy and paste this entire file: create_holidays_table_safe.sql
```

---

## What Each Script Does

### create_holidays_table_fresh.sql
1. Creates new holidays table with all columns
2. Adds foreign key `created_by → users.id`
3. Creates all indexes
4. Sets up permissions
5. Adds comments

### create_holidays_table_safe.sql
1. Creates table if it doesn't exist
2. Adds `created_by` column if missing
3. Adds UNIQUE constraint on date if missing
4. Creates indexes if they don't exist
5. Updates permissions
6. Adds comments safely

---

## After Setup

Once the table is created successfully:

1. ✅ Navigate to `/hrAdmin/holiday` in your app
2. ✅ Click "Add Holiday" to create your first holiday
3. ✅ The system will automatically track who created it
4. ✅ Users will be exempted from attendance on holiday dates

---

## Need Help?

If you're still getting errors:

1. Check which script you're using
2. Verify the `users` table exists
3. Make sure you're running the script in Supabase SQL Editor
4. Copy the ENTIRE script (don't run line by line)
5. Check the error message for specific column/table names

---

**Last Updated**: November 9, 2024
