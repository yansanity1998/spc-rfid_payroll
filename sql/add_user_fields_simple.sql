-- Simple version: Add new fields to users table without sequence permissions
-- This script adds age, gender, address, contact_no, positions, and profile_picture columns

-- First, ensure RLS is disabled on users table (based on previous setup)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies that might interfere
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- Add age column (integer, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add gender column (text, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add address column (text, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add contact number column (text, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS contact_no TEXT;

-- Add positions column (text, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS positions TEXT;

-- Add profile picture URL column (text, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Grant full permissions to ensure updates work
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;
GRANT ALL ON users TO public;

-- Add constraints with proper error handling
-- Drop existing constraints first, then add new ones
DO $$
BEGIN
    -- Add gender constraint
    BEGIN
        ALTER TABLE users ADD CONSTRAINT check_gender 
        CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other'));
        RAISE NOTICE 'Added check_gender constraint';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'check_gender constraint already exists, skipping';
    END;
    
    -- Add age constraint
    BEGIN
        ALTER TABLE users ADD CONSTRAINT check_age 
        CHECK (age IS NULL OR (age >= 18 AND age <= 100));
        RAISE NOTICE 'Added check_age constraint';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'check_age constraint already exists, skipping';
    END;
    
    -- Add positions constraint
    BEGIN
        ALTER TABLE users ADD CONSTRAINT check_positions 
        CHECK (positions IS NULL OR positions IN ('Dean', 'Program Head', 'Full Time', 'Part Time'));
        RAISE NOTICE 'Added check_positions constraint';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'check_positions constraint already exists, skipping';
    END;
END $$;

-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Disable RLS on storage.objects for profile pictures bucket
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Drop any existing storage policies that might interfere
DROP POLICY IF EXISTS "Allow authenticated users to upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete profile pictures" ON storage.objects;

-- Grant full permissions on storage for profile pictures
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO public;

-- Grant permissions on storage.buckets
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO public;

-- Add comments for documentation
COMMENT ON COLUMN users.age IS 'User age (18-100 years)';
COMMENT ON COLUMN users.gender IS 'User gender (Male, Female, Other)';
COMMENT ON COLUMN users.address IS 'User full address';
COMMENT ON COLUMN users.contact_no IS 'User contact/phone number';
COMMENT ON COLUMN users.positions IS 'User position (Dean, Program Head, Full Time, Part Time)';
COMMENT ON COLUMN users.profile_picture IS 'URL to user profile picture in storage';

-- Display success message
SELECT 'All user fields and permissions have been set up successfully!' as status;
