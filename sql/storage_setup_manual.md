# Manual Storage Setup for Profile Pictures

Since you can't modify storage permissions via SQL due to ownership restrictions, you need to set up storage manually in the Supabase dashboard.

## Steps to Set Up Profile Picture Storage:

### 1. Go to Supabase Dashboard
- Open your Supabase project dashboard
- Navigate to **Storage** in the left sidebar

### 2. Create Bucket (if not exists)
- Click **"New bucket"**
- Bucket name: `profile-pictures`
- Make it **Public**: ✅ Yes
- Click **"Save"**

### 3. Set Up Storage Policies
Go to **Storage** → **Policies** and create these policies for the `profile-pictures` bucket:

#### Policy 1: Allow Public Read
```sql
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');
```

#### Policy 2: Allow Authenticated Upload
```sql
CREATE POLICY "Allow authenticated upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');
```

#### Policy 3: Allow Authenticated Update
```sql
CREATE POLICY "Allow authenticated update" ON storage.objects
FOR UPDATE USING (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');
```

#### Policy 4: Allow Authenticated Delete
```sql
CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE USING (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');
```

### 4. Alternative: Disable RLS on Storage (if allowed)
If you have sufficient permissions, you can try:
```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

## Test Profile Picture Upload
After setting up storage:
1. Create a new user with a profile picture
2. Check if the image uploads successfully
3. Verify the URL is saved in the `profile_picture` column

## Troubleshooting
- If uploads fail, check the browser console for storage errors
- Ensure the bucket is public
- Verify the policies are correctly applied
- Check that the bucket name matches exactly: `profile-pictures`
