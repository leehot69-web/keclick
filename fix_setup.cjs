
const url = 'https://drweoyyparwecxicsrgx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd2VveXlwYXJ3ZWN4aWNzcmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDk3NjEsImV4cCI6MjA4NTkyNTc2MX0.6XhYm7gg81fKuRBxGXCLE5NSqFodOQpTdl6azGHcYmU';

const headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
};

async function run() {
    console.log('--- Creando KEMASTER (Columnas corregidas) ---');
    try {
        const r1 = await fetch(url + '/rest/v1/stores', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                id: 'KEMASTER',
                name: 'KECLICK HQ - CONTROL GLOBAL',
                owner_phone: 'SISTEMA',
                status: 'active',
                owner_name: 'SUPER ADMIN'
            })
        });
        console.log('Stores Status:', r1.status);
        if (r1.status >= 400) console.log('Error Stores:', await r1.text());

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
        console.log('Settings Status:', r2.status);
        if (r2.status >= 400) console.log('Error Settings:', await r2.text());

    } catch (e) { console.error(e); }
}
run();
