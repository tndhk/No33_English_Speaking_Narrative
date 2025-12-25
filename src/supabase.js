import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// These will be replaced by environment variables or values from `supabase start`
// Fallback to local Supabase defaults if env vars are missing (e.g. running in Wrangler directly)
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'http://127.0.0.1:54321';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
