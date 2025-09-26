# Deploy Updated Edge Function

To deploy the updated `create-user` Edge Function that now handles all user fields:

## Option 1: Using Supabase CLI (Recommended)

1. Open terminal in your project root directory
2. Run the following command:

```bash
supabase functions deploy create-user
```

## Option 2: Manual Deployment via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to "Edge Functions" 
3. Find the `create-user` function
4. Click "Edit Function"
5. Copy the updated content from `supabase/functions/create-user/index.ts`
6. Paste it and save/deploy

## What the Updated Function Now Handles

The Edge Function now includes all these fields in the initial user creation:
- ✅ age
- ✅ gender  
- ✅ address
- ✅ contact_no
- ✅ positions
- ✅ All existing fields (name, email, role, department, etc.)

**Note**: Profile pictures still need to be uploaded separately due to file handling limitations in Edge Functions.

## Testing After Deployment

1. Try creating a new user with all fields filled
2. Check your Supabase users table to verify all fields are saved
3. Profile pictures should upload after the user is created
