
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())));

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStores() {
    const { data, error } = await supabase.from('stores').select('id, name').limit(10);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('STORES_RESULT:' + JSON.stringify(data));
    }
}

checkStores();
