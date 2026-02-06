import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
// @ts-ignore
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    console.warn('⚠️ Supabase URL is missing. Sync will not work. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
