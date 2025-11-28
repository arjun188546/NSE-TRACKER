import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xnfscozxsooaunugyxdu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZnNjb3p4c29vYXVudWd5eGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTAwNTgsImV4cCI6MjA3ODk2NjA1OH0.d2o9SitDN9klSoMs8AwvLybpsreL70fgkecdIMPinjM';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please check your .env file.');
}

/**
 * Main Supabase client for database operations
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Server-side doesn't need persistent sessions
  },
});

/**
 * Initialize Supabase (legacy function for compatibility)
 */
export const initializeSupabase = () => {
  return supabase;
};

