# Holiday Table Database Relationships

## Table Structure

```
┌─────────────────────────────────────────────────────────┐
│                    holidays                              │
├─────────────────────────────────────────────────────────┤
│ id                SERIAL PRIMARY KEY                     │
│ title             VARCHAR(255) NOT NULL                  │
│ date              DATE NOT NULL UNIQUE                   │
│ description       TEXT                                   │
│ type              VARCHAR(50) NOT NULL                   │
│ is_active         BOOLEAN DEFAULT TRUE                   │
│ created_by        INTEGER → REFERENCES users(id)        │ ← Foreign Key
│ created_at        TIMESTAMP WITH TIME ZONE               │
│ updated_at        TIMESTAMP WITH TIME ZONE               │
└─────────────────────────────────────────────────────────┘
```

## Foreign Key Relationship

### holidays.created_by → users.id

```
┌──────────────────┐                    ┌──────────────────┐
│      users       │                    │    holidays      │
├──────────────────┤                    ├──────────────────┤
│ id (PK)          │◄───────────────────│ created_by (FK)  │
│ name             │   ON DELETE        │ title            │
│ email            │   SET NULL         │ date             │
│ role             │                    │ is_active        │
│ auth_id          │                    │ ...              │
└──────────────────┘                    └──────────────────┘
```

**Relationship Type**: Many-to-One
- One user can create many holidays
- Each holiday is created by one user (or NULL if user is deleted)

**ON DELETE Behavior**: SET NULL
- If a user is deleted, their created holidays remain
- The `created_by` field is set to NULL
- Holidays are preserved for historical records

## Why This Design?

### ✅ Audit Trail
- Track which admin created each holiday
- Useful for accountability and reporting
- Can filter holidays by creator

### ✅ Data Integrity
- Foreign key constraint ensures `created_by` references valid user
- Prevents orphaned references
- Database enforces referential integrity

### ✅ Flexible Deletion
- ON DELETE SET NULL preserves holidays when users are removed
- Historical data remains intact
- No cascade deletions that could lose important holiday data

## Indexes for Performance

```sql
-- Primary index on date (most important for attendance checks)
CREATE INDEX idx_holidays_date ON holidays(date);

-- Composite index for active holiday lookups
CREATE INDEX idx_holidays_active_date ON holidays(date, is_active) 
  WHERE is_active = TRUE;

-- Index on type for filtering
CREATE INDEX idx_holidays_type ON holidays(type);

-- Index on created_by for creator queries
CREATE INDEX idx_holidays_created_by ON holidays(created_by);
```

## Query Examples

### Check if today is a holiday (used by attendance system)
```sql
SELECT id, title, is_active 
FROM holidays 
WHERE date = CURRENT_DATE 
  AND is_active = TRUE;
```
**Uses Index**: `idx_holidays_active_date` (optimal)

### Get all holidays created by a specific admin
```sql
SELECT h.*, u.name as creator_name
FROM holidays h
LEFT JOIN users u ON h.created_by = u.id
WHERE h.created_by = 123
ORDER BY h.date DESC;
```
**Uses Index**: `idx_holidays_created_by`

### Get upcoming active holidays
```sql
SELECT * 
FROM holidays 
WHERE date >= CURRENT_DATE 
  AND is_active = TRUE
ORDER BY date ASC
LIMIT 10;
```
**Uses Index**: `idx_holidays_active_date`

## Integration with Other Tables

### Attendance System
The holidays table is **queried by** the attendance system but doesn't have a direct foreign key relationship:

```
Attendance Check Flow:
1. System checks: "Is today a holiday?"
   → Query holidays table by date
2. If holiday found and is_active = TRUE:
   → Skip marking users as absent
3. If no holiday or is_active = FALSE:
   → Continue with normal absent logic
```

### No Direct Foreign Keys FROM Other Tables
- Other tables don't reference holidays directly
- Holidays is a **reference/lookup table**
- Queried dynamically based on dates
- No need for foreign keys from attendance/users to holidays

## Database Constraints

```sql
-- Primary Key
ALTER TABLE holidays ADD CONSTRAINT holidays_pkey 
  PRIMARY KEY (id);

-- Unique Constraint (only one holiday per date)
ALTER TABLE holidays ADD CONSTRAINT holidays_date_key 
  UNIQUE (date);

-- Foreign Key (created_by references users)
ALTER TABLE holidays ADD CONSTRAINT holidays_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Check Constraint (type must be valid)
ALTER TABLE holidays ADD CONSTRAINT holidays_type_check 
  CHECK (type IN ('Regular Holiday', 'Special Holiday', 'School Event'));
```

## Migration Notes

### If Upgrading Existing Table
```sql
-- Add created_by column to existing table
ALTER TABLE holidays 
ADD COLUMN created_by INTEGER 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_holidays_created_by ON holidays(created_by);

-- Update existing records (optional - set to a default admin)
UPDATE holidays 
SET created_by = (SELECT id FROM users WHERE role = 'Administrator' LIMIT 1)
WHERE created_by IS NULL;
```

## Summary

✅ **Foreign Key Added**: `holidays.created_by → users.id`
✅ **Proper Indexing**: Optimized for common queries
✅ **Data Integrity**: Enforced by database constraints
✅ **Audit Trail**: Track who created each holiday
✅ **Safe Deletion**: ON DELETE SET NULL preserves holidays

The holidays table now has proper relational database design with foreign key constraints for data integrity and audit tracking!
