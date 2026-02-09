
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())));

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STORE_ID = 'KC-L8VYNK';

async function setupTestMenu() {
    console.log('🚀 Iniciando creación de menú de prueba para:', STORE_ID);

    // 1. Crear Categoría
    const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .insert([{ store_id: STORE_ID, title: 'Hamburguesas', order_index: 1 }])
        .select()
        .single();

    if (catError) {
        console.error('Error creando categoría:', catError);
        return;
    }
    const categoryId = catData.id;
    console.log('✅ Categoría creada:', catData.title);

    // 2. Crear Grupos de Modificadores
    const modifierGroups = [
        {
            store_id: STORE_ID,
            title: 'Extras (Añadir)',
            selection_type: 'multiple',
            min_selection: 0,
            max_selection: 5,
            options: [
                { name: 'Queso Extra', price: 1.5 },
                { name: 'Tocineta', price: 2.0 },
                { name: 'Huevo', price: 1.0 }
            ]
        },
        {
            store_id: STORE_ID,
            title: 'Personalización (Quitar)',
            selection_type: 'multiple',
            min_selection: 0,
            max_selection: 5,
            options: [
                { name: 'Sin Cebolla', price: 0 },
                { name: 'Sin Tomate', price: 0 },
                { name: 'Sin Salsas', price: 0 }
            ]
        }
    ];

    const { error: modError } = await supabase
        .from('modifier_groups')
        .insert(modifierGroups);

    if (modError) {
        console.error('Error creando modificadores:', modError);
        return;
    }
    console.log('✅ Grupos de modificadores creados');

    // 3. Crear el Item (Hamburguesa)
    const { error: itemError } = await supabase
        .from('menu_items')
        .insert([{
            store_id: STORE_ID,
            category_id: categoryId,
            name: 'Hamburguesa Master AI',
            price: 12.50,
            description: 'Nuestra hamburguesa insignia procesada por IA',
            kitchen_stations: ['Plancha'],
            modifier_group_titles: ['Extras (Añadir)', 'Personalización (Quitar)']
        }]);

    if (itemError) {
        console.error('Error creando producto:', itemError);
        return;
    }
    console.log('✅ Hamburguesa Master AI creada correctamente');
    console.log('🎉 PROCESO COMPLETADO. Abre la app con el ID:', STORE_ID);
}

setupTestMenu();
