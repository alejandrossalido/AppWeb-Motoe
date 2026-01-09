import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qijzycmrtiwqvvrfoahx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpanp5Y21ydGl3cXZ2cmZvYWh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDI4MDcsImV4cCI6MjA4MzQ3ODgwN30.H0W4jZ4OEJ5G6YHkj4ynWaUUIN5DJowO_R85fyc5sPk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
