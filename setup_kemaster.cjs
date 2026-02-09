
const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
const url = content.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/\"/g, '').replace(/'/g, '');
const key = content.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/\"/g, '').replace(/'/g, '');

const headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
};

async function run() {
    try {
        console.log('Target URL:', url);
        const r1 = await fetch(url + '/rest/v1/stores', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                id: 'KEMASTER',
                name: 'KECLICK HQ - CONTROL GLOBAL',
                owner_phone: 'SISTEMA',
                owner_email: 'admin@keclick.com',
                status: 'active',
                subscription_plan: 'lifetime'
            })
        });
        console.log('Store response:', r1.status);

        const r2 = await fetch(url + '/rest/v1/settings', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                store_id: 'KEMASTER',
                business_name: 'KECLICK HQ',
                users: [{ id: 'admin-master', name: 'SUPER ADMIN', pin: '1985', role: 'admin' }],
                is_whatsapp_enabled: false
            })
        });
        console.log('Settings response:', r2.status);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
run();
