
const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
const url = content.match(/VITE_SUPABASE_URL=(.*)/)[1].trim().replace(/\"/g, '').replace(/'/g, '');
const key = content.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/\"/g, '').replace(/'/g, '');

const headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
};

async function check() {
    try {
        const r = await fetch(url + '/rest/v1/stores?id=eq.KEMASTER', { headers });
        const data = await r.json();
        console.log('KEMASTER Store exists:', data.length > 0);

        const r2 = await fetch(url + '/rest/v1/settings?store_id=eq.KEMASTER', { headers });
        const data2 = await r2.json();
        console.log('KEMASTER Settings exist:', data2.length > 0);
        if (data2.length > 0) {
            console.log('PIN for KEMASTER:', data2[0].users?.[0]?.pin);
        }
    } catch (e) { console.error(e); }
}
check();
