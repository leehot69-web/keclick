
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkOrphanStores() {
    const { data: stores } = await supabase.from('stores').select('id, name');
    const { data: settings } = await supabase.from('settings').select('store_id');

    console.log('--- ALL STORES ---');
    console.log(JSON.stringify(stores, null, 2));

    console.log('--- ALL SETTINGS ---');
    console.log(JSON.stringify(settings, null, 2));

    const orphanStores = stores.filter(s => !settings.some(set => set.store_id === s.id));
    console.log('--- ORPHAN STORES (No settings) ---');
    console.log(JSON.stringify(orphanStores, null, 2));
}

checkOrphanStores();
