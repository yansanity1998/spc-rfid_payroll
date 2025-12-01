-- Migration: Alter users.semester and users.schoolYear to TEXT to accept non-numeric values
-- Run this migration in your database (Supabase SQL editor or psql).

BEGIN;

-- Change column type to TEXT, preserving existing values
ALTER TABLE public.users
  ALTER COLUMN semester TYPE TEXT USING semester::text;

ALTER TABLE public.users
  ALTER COLUMN "schoolYear" TYPE TEXT USING "schoolYear"::text;

-- If there are constraints or indexes on these columns, you may need to adjust or drop/recreate them.
-- Example: if a CHECK constraint enforces numeric range, drop it first.

COMMENT ON COLUMN public.users.semester IS 'Semester or term identifier (e.g., 1, 2, Summer)';
COMMENT ON COLUMN public.users."schoolYear" IS 'Academic year (e.g., 2024 or 2024-2025)';

COMMIT;

/* Run instructions:
 - Supabase SQL editor: paste and run this script.
 - psql: psql "<connection_string>" -f alter_semester_to_text.sql

After applying this migration, the app can store values like "Summer" in the semester field.
*/
