
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://squtybkgujjgrxeqmrfs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxdXR5YmtndWpqZ3J4ZXFtcmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMjQ5MzAsImV4cCI6MjA3MTYwMDkzMH0.JKBFqotKygBRl1Ej060yeIRJbLzfTv7bnwAKDtwxHcY';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase