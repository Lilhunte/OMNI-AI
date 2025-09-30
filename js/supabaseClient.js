import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Centralized Supabase configuration
const supabaseUrl = 'https://oztifuyijinimlowqviu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dGlmdXlpamluaW1sb3dxdml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTE5MzIsImV4cCI6MjA3NDcyNzkzMn0.eXTGVvWyk025L414pt9Yj0jifPAMP5sDgsPMW-z6GLE';

// Export a single, shared Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);