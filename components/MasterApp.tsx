
import React, { useState, useEffect } from 'react';
import MenuManagementModal from './MenuManagementModal';
import { MenuCategory, ModifierGroup, PizzaIngredient } from '../types';
import { KECLICK_MENU_DATA, KECLICK_MODIFIERS, PIZZA_BASE_PRICES, PIZZA_INGREDIENTS } from '../constants';
import { supabase } from '../utils/supabase';

// --- ESTRUCTURA DE PLANES ---
interface Plan {
    id: string;
    name: string;
    durationDays: number;
    price: number;
}

const DEFAULT_PLANS: Plan[] = [
    { id: 'monthly', name: 'Plan 1 Mes', durationDays: 30, price: 30 },
    { id: 'quarter', name: 'Plan 3 Meses', durationDays: 90, price: 80 },
    { id: 'semester', name: 'Plan 6 Meses', durationDays: 180, price: 150 },
    { id: 'annual', name: 'Plan 1 Año', durationDays: 365, price: 250 },
];

interface NoteEntry {
    date: string;
    text: string;
}

interface ManagedStore {
    id: string;
    name: string;
    ownerPhone: string;
    ownerName?: string;
    email?: string;
    status: 'active' | 'suspended' | 'expired' | 'trial';
    activationDate: string;
    expiryDate: string;
    lastPaymentAmount: number;
    paymentProofUrl?: string;
    totalSales: number;
    notesHistory: NoteEntry[];
    billingModel: 'subscription' | 'commission' | 'hybrid';
    commissionRate: number;
    fixedFee: number;
    planName?: string;
    users?: any[]; // For displaying PIN
    // Datos de Menú para edición remota
    menu?: MenuCategory[];
    modifierGroups?: ModifierGroup[];
    pizzaIngredients?: PizzaIngredient[];
    pizzaBasePrices?: Record<string, number>;
}

interface MasterAppProps {
    onClose?: () => void;
    onSelectStore?: (storeId: string) => void;
}

const MasterApp: React.FC<MasterAppProps> = ({ onClose, onSelectStore }) => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [pin, setPin] = useState('');
    const [selectedStore, setSelectedStore] = useState<ManagedStore | null>(null);
    const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
    const [isStoreDetailOpen, setIsStoreDetailOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMenuEditorOpen, setIsMenuEditorOpen] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [newStorePhone, setNewStorePhone] = useState('');
    const [newOwnerName, setNewOwnerName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [isCreating, setIsCreating] = useState(false);


    const [plans, setPlans] = useState<Plan[]>(() => {
        const saved = localStorage.getItem('kemaster_plans_v3');
        return saved ? JSON.parse(saved) : DEFAULT_PLANS;
    });

    useEffect(() => {
        localStorage.setItem('kemaster_plans_v3', JSON.stringify(plans));
    }, [plans]);

    const activeExchangeRate = 50; // Mock rate for BS calculation

    const [stores, setStores] = useState<ManagedStore[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStores = async () => {
        setIsLoading(true);
        console.log('🛰️ Radar KeMaster: Escaneando naves en Supabase...');

        const { data: storesData, error: storesError } = await supabase
            .from('stores')
            .select('*, settings!inner(*)');

        if (storesError) {
            console.error('Error fetching stores:', storesError);
            setIsLoading(false);
            return;
        }

        const mappedStores: ManagedStore[] = await Promise.all(storesData.map(async (s: any) => {
            // 1. Obtener Ventas
            const { data: salesData } = await supabase
                .from('sales')
                .select('total')
                .eq('store_id', s.id);
            const totalSales = salesData?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

            // 2. Obtener Menú Real (NUEVAS TABLAS)
            const { data: cats } = await supabase.from('menu_categories').select('*').eq('store_id', s.id).order('order_index');
            const { data: items } = await supabase.from('menu_items').select('*').eq('store_id', s.id);
            const { data: mods } = await supabase.from('modifier_groups').select('*').eq('store_id', s.id);

            let realMenu = s.settings?.menu || KECLICK_MENU_DATA;
            if (cats && cats.length > 0 && items) {
                realMenu = cats.map(c => ({
                    title: c.title,
                    items: items.filter(i => i.category_id === c.id).map(i => ({
                        name: i.name,
                        price: parseFloat(i.price),
                        available: i.available,
                        description: i.description,
                        image: i.image,
                        isPizza: i.is_pizza,
                        isSpecialPizza: i.is_special_pizza,
                        defaultIngredients: i.default_ingredients,
                        isCombo: i.is_combo,
                        comboIncludes: i.combo_includes,
                        kitchenStations: i.kitchen_stations,
                        modifierGroupTitles: i.modifier_group_titles
                    }))
                }));
            }

            const realMods = mods && mods.length > 0 ? mods.map(m => ({
                title: m.title,
                selectionType: m.selection_type,
                minSelection: m.min_selection,
                maxSelection: m.max_selection,
                options: m.options,
                freeSelectionCount: m.free_selection_count,
                extraPrice: m.extra_price
            })) : (s.settings?.modifier_groups || KECLICK_MODIFIERS);

            return {
                id: s.id,
                name: s.name,
                ownerPhone: s.owner_phone || '',
                ownerName: s.owner_name || '',
                email: s.owner_email || 'N/A',
                status: s.status as any,
                activationDate: s.created_at?.split('T')[0] || '',
                expiryDate: s.trial_ends_at?.split('T')[0] || '',
                lastPaymentAmount: 0,
                totalSales: totalSales,
                notesHistory: [],
                billingModel: 'subscription',
                commissionRate: 0,
                fixedFee: 0,
                menu: realMenu,
                modifierGroups: realMods,
                users: s.settings?.users || []
            };
        }));

        setStores(mappedStores);
        setIsLoading(false);
    };

    useEffect(() => {
        if (isAuthorized) {
            fetchStores();
        }
    }, [isAuthorized]);

    const handleLogin = () => {
        if (pin === '1985') setIsAuthorized(true);
        else alert("Acceso Denegado 🛑");
    };

    const toggleStatus = async (storeId: string) => {
        const store = stores.find(s => s.id === storeId);
        if (!store) return;

        const newStatus = store.status === 'active' ? 'suspended' : 'active';

        const { error } = await supabase
            .from('stores')
            .update({ status: newStatus })
            .eq('id', storeId);

        if (!error) {
            setStores(prev => prev.map(s => s.id === storeId ? { ...s, status: newStatus } : s));
        } else {
            alert("Error al cambiar status: " + error.message);
        }
    };

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStoreName || !newStorePhone) return;

        const newStoreId = `KC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const now = new Date();

        setIsCreating(true);
        try {
            // 1. Crear registro en 'stores'
            const { error: storeError } = await supabase.from('stores').insert({
                id: newStoreId,
                name: newStoreName,
                owner_phone: newStorePhone,
                owner_name: newOwnerName,
                owner_email: newEmail,
                status: 'trial',
                trial_ends_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
            });

            if (storeError) throw storeError;

            // 2. Crear settings iniciales
            const { error: settingsError } = await supabase.from('settings').insert({
                store_id: newStoreId,
                business_name: newStoreName,
                target_number: newStorePhone,
                is_whatsapp_enabled: true,
                kitchen_stations: [{ id: 'general', name: 'Cocina General', color: '#FF0000' }],
                users: [{ id: '1', name: 'Admin', pin: '0000', role: 'admin' }]
            });

            if (settingsError) throw settingsError;

            alert(`🚀 NAVE REGISTRADA CON ÉXITO.\nID: ${newStoreId}\nPIN ADMIN: 0000`);
            setShowCreateForm(false);
            setNewStoreName('');
            setNewStorePhone('');
            setNewOwnerName('');
            setNewEmail('');
            fetchStores();
        } catch (err: any) {
            alert("❌ Error al registrar nave: " + err.message);
        } finally {
            setIsCreating(false);
        }
    };

    const deleteStore = async (storeId: string, storeName: string) => {
        if (!window.confirm(`¿Estás SEGURO de eliminar definitivamente la tienda "${storeName}"?\n\nEsta acción borrará todas sus ventas, configuraciones y acceso de forma IRREVERSIBLE.`)) return;

        const { error } = await supabase
            .from('stores')
            .delete()
            .eq('id', storeId);

        if (!error) {
            setStores(prev => prev.filter(s => s.id !== storeId));
            alert("🛸 Nave desintegrada del radar.");
        } else {
            alert("Error al desintegrar: " + error.message);
        }
    };

    const activatePlan = async (plan: Plan, model: 'subscription' | 'commission' | 'hybrid', rate: number = 0, fixed: number = 0, payment: number = 0) => {
        if (!selectedStore) return;
        const now = new Date();
        const futureDate = new Date(now.getTime() + (plan.durationDays * 24 * 60 * 60 * 1000));

        const { error } = await supabase
            .from('stores')
            .update({
                status: 'active',
                trial_ends_at: futureDate.toISOString()
            })
            .eq('id', selectedStore.id);

        if (!error) {
            setStores(prev => prev.map(s => s.id === selectedStore.id ? {
                ...s,
                status: 'active',
                expiryDate: futureDate.toISOString().split('T')[0],
            } : s));

            setIsActivationModalOpen(false);
            setIsStoreDetailOpen(false);
            alert(`🛰️ NAVE DESBLOQUEADA. Próximo aterrizaje: ${futureDate.toISOString().split('T')[0]}`);
        } else {
            alert("Error al activar: " + error.message);
        }
    };

    const updateAdminPin = async (storeId: string) => {
        const newPin = window.prompt("Ingresa el nuevo PIN de Administrador (4 números):");
        if (!newPin || newPin.length !== 4 || isNaN(Number(newPin))) {
            alert("❌ PIN inválido. Debe ser de 4 dígitos.");
            return;
        }

        try {
            const { data: currentSettings, error: fetchError } = await supabase
                .from('settings')
                .select('users')
                .eq('store_id', storeId)
                .single();

            if (fetchError) throw fetchError;

            const updatedUsers = (currentSettings.users || []).map((u: any) =>
                u.role === 'admin' ? { ...u, pin: newPin } : u
            );

            const { error: updateError } = await supabase
                .from('settings')
                .update({ users: updatedUsers })
                .eq('store_id', storeId);

            if (updateError) throw updateError;

            setStores(prev => prev.map(s => s.id === storeId ? { ...s, users: updatedUsers } : s));
            alert("✅ PIN Maestro actualizado con éxito.");
        } catch (err: any) {
            alert("❌ Error al actualizar PIN: " + err.message);
        }
    };

    const addNote = (storeId: string, text: string) => {
        if (!text.trim()) return;
        setStores(prev => prev.map(s => s.id === storeId ? {
            ...s,
            notesHistory: [{ date: new Date().toISOString().split('T')[0], text }, ...s.notesHistory]
        } : s));
    };

    const syncMenu = async (categories: MenuCategory[], modifiers: ModifierGroup[]) => {
        if (!selectedStore) return { success: false, error: { message: 'No store selected' } };

        try {
            console.log('📤 [KeMaster] Sincronizando menú remoto...');

            // 1. Limpiar datos viejos
            await supabase.from('modifier_groups').delete().eq('store_id', selectedStore.id);
            await supabase.from('menu_items').delete().eq('store_id', selectedStore.id);
            await supabase.from('menu_categories').delete().eq('store_id', selectedStore.id);

            // 2. Insertar Modificadores
            if (modifiers.length > 0) {
                const modsToInsert = modifiers.map(m => ({
                    store_id: selectedStore.id,
                    title: m.title,
                    selection_type: m.selectionType,
                    min_selection: m.minSelection,
                    max_selection: m.maxSelection,
                    options: m.options,
                    free_selection_count: m.freeSelectionCount,
                    extra_price: m.extraPrice
                }));
                const { error: modErr } = await supabase.from('modifier_groups').insert(modsToInsert);
                if (modErr) throw modErr;
            }

            // 3. Insertar Categorias e Items
            for (let i = 0; i < categories.length; i++) {
                const cat = categories[i];
                const { data: catData, error: catErr } = await supabase
                    .from('menu_categories')
                    .insert({
                        store_id: selectedStore.id,
                        title: cat.title,
                        order_index: i
                    })
                    .select()
                    .single();

                if (catErr) throw catErr;

                if (cat.items.length > 0) {
                    const itemsToInsert = cat.items.map(item => ({
                        store_id: selectedStore.id,
                        category_id: catData.id,
                        name: item.name,
                        price: item.price,
                        available: item.available,
                        description: item.description,
                        image: item.image,
                        is_pizza: item.isPizza,
                        is_special_pizza: item.isSpecialPizza,
                        default_ingredients: item.defaultIngredients,
                        is_combo: item.isCombo,
                        combo_includes: item.comboIncludes,
                        kitchen_stations: item.kitchenStations,
                        modifier_group_titles: item.modifierGroupTitles
                    }));
                    const { error: itemErr } = await supabase.from('menu_items').insert(itemsToInsert);
                    if (itemErr) throw itemErr;
                }
            }

            console.log('✅ [KeMaster] Menú sincronizado exitosamente.');
            return { success: true };
        } catch (err: any) {
            console.error('❌ [KeMaster] Error sincronizando menú:', err);
            return { success: false, error: err };
        }
    };

    if (!isAuthorized) {
        return (
            <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center p-6 text-white font-sans text-center">
                <div className="w-20 h-20 bg-[#FF0000] rounded-2xl mb-6 flex items-center justify-center shadow-[0_0_40px_rgba(255,0,0,0.4)] animate-pulse border-2 border-[#FFD700]">
                    <span className="text-3xl font-black italic">KM</span>
                </div>
                <h1 className="text-xl font-black tracking-widest italic mb-8 uppercase">Ke<span className="text-[#FFD700]">Master</span></h1>
                <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN CRÍTICO" className="bg-[#111] border border-white/5 p-4 rounded-xl text-center text-xl w-48 font-black outline-none focus:border-[#FF0000] mb-6 shadow-inner" />
                <button onClick={handleLogin} className="bg-[#FF0000] px-10 py-4 rounded-xl font-black uppercase text-xs tracking-[0.3em] shadow-lg hover:scale-105 transition-all">Autorizar Sistemas</button>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#050505] text-white font-sans flex flex-col antialiased overflow-hidden">
            {/* Header de Comando */}
            <header className="p-5 bg-black/80 backdrop-blur-md border-b border-white/5 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#FF0000] rounded-xl flex items-center justify-center font-black italic text-xl shadow-lg border border-white/10">KM</div>
                    <div>
                        <h1 className="text-lg font-black uppercase italic leading-none">Ke<span className="text-[#FFD700]">Master</span></h1>
                        <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.5em] mt-1">Sistemas Globales de Control</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="h-10 px-6 bg-[#FF0000] text-white rounded-xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                    >
                        + Nueva Nave
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-[#FFD700]/20 transition-all flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-[10px] font-black uppercase hidden md:inline">Tarifas</span>
                    </button>
                    <button onClick={fetchStores} disabled={isLoading} className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-50">
                        <svg className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-red-600 transition-all">
                            ✕
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
                {/* Panel de Clarificación */}
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-amber-500 text-xs font-black uppercase tracking-tight">
                        EL MENÚ SE GESTIONA DENTRO DE CADA TIENDA (Expediente Final → Gestionar Menú de Nave)
                    </p>
                </div>

                {/* MODAL: REGISTRO DE NUEVA TIENDA */}
                {showCreateForm && (
                    <div className="fixed inset-0 z-[2000] bg-black/98 backdrop-blur-xl flex items-center justify-center p-6">
                        <form onSubmit={handleCreateStore} className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] w-full max-w-md space-y-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Habilitar Nueva Nave</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-[#FFD700] uppercase mb-3 tracking-widest">Nombre del Negocio / Nave</label>
                                    <input
                                        required
                                        type="text"
                                        value={newStoreName}
                                        onChange={e => setNewStoreName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 py-5 px-6 rounded-2xl text-white font-bold text-lg focus:outline-none focus:border-red-600 transition-all uppercase"
                                        placeholder="EJ: PIZZERÍA GALÁCTICA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[#FFD700] uppercase mb-3 tracking-widest">Email del Negocio</label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 py-5 px-6 rounded-2xl text-white font-bold text-lg focus:outline-none focus:border-red-600 transition-all"
                                        placeholder="EJ: admin@tienda.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[#FFD700] uppercase mb-3 tracking-widest">Nombre del Dueño (Opcional)</label>
                                    <input
                                        type="text"
                                        value={newOwnerName}
                                        onChange={e => setNewOwnerName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 py-5 px-6 rounded-2xl text-white font-bold text-lg focus:outline-none focus:border-red-600 transition-all uppercase"
                                        placeholder="EJ: JUAN PÉREZ"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="flex-1 py-5 bg-white/5 text-gray-500 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:text-white transition-all"
                                >
                                    Abortar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-[2] py-5 bg-red-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-red-600/30 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isCreating ? 'PROCESANDO...' : 'REGISTRAR NAVE'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Panel Inteligente de Flota */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#0a0a0a] p-5 rounded-[2rem] border border-white/5">
                        <p className="text-[8px] font-black text-gray-500 uppercase mb-2 tracking-widest">Flota Activa</p>
                        <p className="text-3xl font-black italic">{stores.filter(s => s.status === 'active').length} / {stores.length}</p>
                    </div>
                    <div className="bg-[#0a0a0a] p-5 rounded-[2rem] border border-white/5 border-t-[#FFD700]">
                        <p className="text-[8px] font-black text-[#FFD700] uppercase mb-2 tracking-widest">Cartera Pendiente</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-[#FFD700]">$</span>
                            <p className="text-3xl font-black italic text-[#FFD700]">
                                {stores.reduce((acc, s) => acc + s.fixedFee + (s.totalSales * s.commissionRate), 0).toFixed(0)}
                            </p>
                        </div>
                    </div>
                    <div className="bg-[#0a0a0a] p-5 rounded-[2rem] border border-white/5">
                        <p className="text-[8px] font-black text-gray-500 uppercase mb-2 tracking-widest">Bases Fijas</p>
                        <p className="text-3xl font-black italic text-green-500">${stores.reduce((a, b) => a + b.fixedFee, 0)}</p>
                    </div>
                    <div className="bg-[#FF0000] p-5 rounded-[2rem] shadow-2xl">
                        <p className="text-[8px] font-black text-white/50 uppercase mb-2 tracking-widest">Total GMV</p>
                        <p className="text-3xl font-black italic">${stores.reduce((a, b) => a + b.totalSales, 0).toFixed(0)}</p>
                    </div>
                </div>

                {/* Radar de Naves */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-24">
                    {stores.map(store => {
                        const daysLeft = Math.ceil((new Date(store.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return (
                            <div key={store.id} className={`bg-[#0a0a0a] border ${store.status === 'active' ? 'border-white/5' : 'border-[#FF0000]/20'} rounded-[2.5rem] p-7 transition-all hover:bg-[#0f0f0f] relative overflow-hidden group shadow-xl`}>
                                {/* Tags de Inteligencia */}
                                <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                                    <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${store.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'}`}>
                                        {store.status === 'active' ? 'EN VUELO' : store.status.toUpperCase()}
                                    </span>
                                    <span className="text-[6px] font-black text-gray-500 uppercase tracking-widest">{store.planName || 'Plan Especial'}</span>
                                </div>

                                <div className="flex gap-5 items-start mb-8">
                                    <div className="w-16 h-16 bg-[#111] rounded-[1.5rem] flex flex-col items-center justify-center border-2 border-white/5 shadow-inner">
                                        <span className="font-black text-2xl text-white italic leading-none">{store.name.charAt(0)}</span>
                                        <span className="text-[6px] font-black text-gray-600 mt-1 uppercase">ID: {store.id}</span>
                                    </div>
                                    <div className="pt-1 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-xl uppercase italic group-hover:text-[#FFD700] transition-colors leading-none">{store.name}</h3>
                                            <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">PIN: {store.users?.find((u: any) => u.role === 'admin')?.pin || '0000'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 mb-3">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter truncate w-full flex items-center gap-2">
                                                <span className="text-gray-600">CLIENTE:</span> {store.ownerName || 'PENDIENTE'}
                                                <span className="text-gray-600 ml-2">CEL:</span> {store.ownerPhone || 'N/A'}
                                            </p>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter truncate w-full">
                                                <span className="text-gray-600">EMAIL:</span> {store.email || 'SIN CORREO'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[6px] font-black text-gray-500 uppercase">Aterrizaje</span>
                                                <span className={`text-[10px] font-black ${daysLeft < 5 ? 'text-[#FF0000]' : 'text-white'}`}>{store.expiryDate}</span>
                                            </div>
                                            <div className="w-px h-6 bg-white/5"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[6px] font-black text-gray-500 uppercase">A Favor</span>
                                                <span className="text-[10px] font-black text-[#FFD700] italic">${(store.fixedFee + (store.totalSales * store.commissionRate)).toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-8">
                                    <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[6px] font-black text-gray-600 uppercase mb-1 whitespace-nowrap">Último Pago</p>
                                        <p className="text-sm font-black text-green-500">${store.lastPaymentAmount.toFixed(0)}</p>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[6px] font-black text-gray-600 uppercase mb-1">Ventas</p>
                                        <p className="text-sm font-black text-white italic">${store.totalSales.toFixed(0)}</p>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[6px] font-black text-gray-600 uppercase mb-1">Modelo</p>
                                        <p className="text-[8px] font-black text-gray-300 uppercase truncate mt-1">{store.billingModel}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => selectedStore && onSelectStore && onSelectStore(selectedStore.id)} className="flex-grow py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] hover:bg-[#FF0000] hover:text-white transition-all flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        Controlar Nave
                                    </button>
                                    <button onClick={() => { setSelectedStore(store); setIsStoreDetailOpen(true); }} className="flex-grow py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-gray-500">
                                        Expediente Final
                                    </button>
                                    <button onClick={() => toggleStatus(store.id)} className={`w-14 h-14 rounded-2xl border transition-all flex items-center justify-center group/sw ${store.status === 'active' ? 'bg-[#FF0000]/10 border-[#FF0000]/20 hover:bg-[#FF0000]' : 'bg-green-500/10 border-green-500/20 hover:bg-green-500'}`}>
                                        <svg className={`w-6 h-6 ${store.status === 'active' ? 'text-[#FF0000] group-hover/sw:text-white' : 'text-green-500 group-hover/sw:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                    </button>
                                    <button onClick={() => {
                                        const amount = (store.fixedFee + (store.totalSales * store.commissionRate)).toFixed(0);
                                        const msg = `*REPORTE KECLICK* 🛰️\n*${store.name}*\n\n⚙️ Fijo: $${store.fixedFee}\n📈 Ventas: $${store.totalSales.toFixed(0)}\n💎 Com: $${(store.totalSales * store.commissionRate).toFixed(0)}\n\n🚀 *TOTAL: $${amount}*`;
                                        window.open(`https://wa.me/${store.ownerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }} className="w-14 h-14 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-2xl hover:bg-[#FFD700] group/b flex items-center justify-center transition-all">
                                        <svg className="w-6 h-6 text-[#FFD700] group-hover/b:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    </button>
                                    <button onClick={() => deleteStore(store.id, store.name)} className="w-14 h-14 bg-red-900/10 border border-red-900/20 rounded-2xl hover:bg-red-600 group/d flex items-center justify-center transition-all">
                                        <svg className="w-6 h-6 text-red-600 group-hover/d:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* MODAL: EXPEDIENTE DE NAVE (INFORMACIÓN INTELIGENTE) */}
            {isStoreDetailOpen && selectedStore && (
                <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-4xl rounded-[3rem] p-8 shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-hide relative">
                        <button onClick={() => setIsStoreDetailOpen(false)} className="absolute top-6 right-8 text-gray-500 hover:text-white font-black uppercase text-[10px]">Cerrar Escotilla</button>

                        <div className="flex flex-col md:flex-row gap-8 mb-10">
                            <div className="w-32 h-32 bg-[#FF0000]/10 border-4 border-[#FF0000]/20 rounded-[2.5rem] flex items-center justify-center text-4xl font-black italic shadow-2xl shrink-0">
                                {selectedStore.name.charAt(0)}
                            </div>
                            <div className="flex-grow">
                                <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest mb-1">Expediente de Nave Inteligente</p>
                                <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4">{selectedStore.name}</h2>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <span className="text-[7px] text-gray-500 font-black block uppercase mb-1">Dueño / Responsable</span>
                                        <span className="text-sm font-black text-white">{selectedStore.ownerName || 'PENDIENTE'}</span>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <span className="text-[7px] text-gray-500 font-black block uppercase mb-1">WhatsApp Sede</span>
                                        <span className="text-sm font-black text-white">{selectedStore.ownerPhone || 'N/A'}</span>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <span className="text-[7px] text-gray-500 font-black block uppercase mb-1">Email Contractual</span>
                                        <span className="text-sm font-black text-white break-all">{selectedStore.email || 'N/A'}</span>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <span className="text-[7px] text-gray-500 font-black block uppercase mb-1">ID Único de Sistema</span>
                                        <span className="text-sm font-black font-mono text-white">{selectedStore.id}</span>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 relative group/pin">
                                        <span className="text-[7px] text-gray-500 font-black block uppercase mb-1">PIN Maestro (Admin)</span>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-black text-amber-500">{selectedStore.users?.find((u: any) => u.role === 'admin')?.pin || '0000'}</span>
                                            <button onClick={() => updateAdminPin(selectedStore.id)} className="text-[8px] font-black text-blue-500 uppercase hover:underline">Cambiar</button>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <span className="text-[7px] text-gray-500 font-black block uppercase mb-1">Próximo Saldo</span>
                                        <span className="text-sm font-black text-[#FFD700]">${(selectedStore.fixedFee + (selectedStore.totalSales * selectedStore.commissionRate)).toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Bitácora de Comentarios */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-widest border-l-2 border-[#FF0000] pl-4 mb-6">Bitácora del Capitán (Notas Históricas)</h3>
                                <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 space-y-4 max-h-64 overflow-y-auto">
                                    {selectedStore.notesHistory.map((n, i) => (
                                        <div key={i} className="border-b border-white/5 pb-3">
                                            <p className="text-[8px] font-black text-gray-600 mb-1">{n.date}</p>
                                            <p className="text-xs text-gray-300 italic">"{n.text}"</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input id="new-note" type="text" placeholder="Anotar comentario de hoy..." className="flex-grow bg-[#111] border border-white/5 p-4 rounded-xl text-xs outline-none focus:border-[#FF0000]" />
                                    <button onClick={() => {
                                        const input = document.getElementById('new-note') as HTMLInputElement;
                                        addNote(selectedStore.id, input.value);
                                        input.value = '';
                                    }} className="px-6 bg-[#FF0000] rounded-xl font-black uppercase text-[10px]">Anotar</button>
                                </div>
                            </div>

                            {/* Gestión de Pagos y Activación */}
                            <div className="space-y-6">
                                <div className="bg-[#111] p-8 rounded-[2rem] border border-white/5 space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-gray-500 mb-2">Administración Técnica</h3>
                                    <button
                                        onClick={() => {
                                            setIsMenuEditorOpen(true);
                                            setIsStoreDetailOpen(false);
                                        }}
                                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-blue-500 transition-all active:scale-95"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Gestionar Menú de Nave
                                    </button>

                                    <div className="border-t border-white/5 my-4"></div>

                                    <button onClick={() => setIsActivationModalOpen(true)} className="w-full py-5 bg-[#FFD700] text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-[#FFD700]/10 hover:scale-95 transition-all">Sincronizar Nuevo Ciclo</button>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleStatus(selectedStore.id)} className="flex-grow py-4 bg-[#FF0000]/10 border border-[#FF0000]/20 text-[#FF0000] rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-[#FF0000] hover:text-white transition-all">
                                            {selectedStore.status === 'active' ? 'Apagar Sistema' : 'Encender Sistema'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: EDITOR DE MENÚ REMOTO */}
            {isMenuEditorOpen && selectedStore && (
                <MenuManagementModal
                    menu={selectedStore.menu || KECLICK_MENU_DATA}
                    modifierGroups={selectedStore.modifierGroups || KECLICK_MODIFIERS}
                    pizzaIngredients={selectedStore.pizzaIngredients || PIZZA_INGREDIENTS}
                    pizzaBasePrices={selectedStore.pizzaBasePrices || PIZZA_BASE_PRICES}
                    kitchenStations={[{ id: 'general', name: 'Cocina General', color: '#FF0000' }]}
                    onClose={() => {
                        setIsMenuEditorOpen(false);
                        setIsStoreDetailOpen(true);
                    }}
                    onSave={async (newMenu, newMods) => {
                        try {
                            setIsLoading(true); // Mostrar carga en el dashboard
                            // 1. Guardar en Settings (Respaldo)
                            const { error } = await supabase
                                .from('settings')
                                .update({
                                    menu: newMenu,
                                    modifier_groups: newMods
                                })
                                .eq('store_id', selectedStore.id);

                            if (error) throw error;

                            // 2. Sincronizar automáticamente con las tablas normalizadas (Menú Real)
                            const syncRes = await syncMenu(newMenu, newMods);
                            if (!syncRes.success) throw syncRes.error;

                            // 3. Recargar TODO desde la base de datos para estar seguros
                            await fetchStores();

                            alert("✅ Menú Guardado y Publicado en la Nube con éxito.");
                            setIsMenuEditorOpen(false);
                            setIsStoreDetailOpen(true);
                        } catch (err: any) {
                            alert("❌ Error al guardar y publicar: " + err.message);
                        } finally {
                            setIsLoading(false);
                        }
                    }}
                    onUpdatePizzaConfig={(newIngs, newPrices) => {
                        setStores(prev => prev.map(s => s.id === selectedStore.id ? {
                            ...s,
                            pizzaIngredients: newIngs,
                            pizzaBasePrices: newPrices
                        } : s));
                    }}
                    syncMenu={syncMenu}
                />
            )}

            {/* MODAL: CONFIGURACIÓN DE PLANES */}
            {isActivationModalOpen && selectedStore && (
                <div className="fixed inset-0 z-[2000] bg-black/98 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl rounded-[3rem] p-6 md:p-10 my-auto overflow-hidden">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic text-center mb-6 md:mb-10 underline underline-offset-8 decoration-[#FF0000]">Selector de Vuelo PRO: {selectedStore.name}</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Fijo */}
                            <div className="bg-white/2 p-6 rounded-3xl border border-white/5 space-y-3">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase text-center mb-4">SaaS Fijo</h4>
                                {plans.map(p => (
                                    <button key={p.id} onClick={() => activatePlan(p, 'subscription', 0, p.price, p.price)} className="w-full p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center font-black uppercase text-[10px] hover:bg-white hover:text-black transition-all">
                                        <span>{p.name}</span> <span>${p.price}</span>
                                    </button>
                                ))}
                            </div>
                            {/* Dual */}
                            <div className="bg-[#FF0000]/5 p-8 rounded-[2.5rem] border-2 border-[#FF0000]/30 scale-105 shadow-2xl space-y-6">
                                <h4 className="text-[10px] font-black text-white uppercase text-center mb-4">Plan Dual Híbrido</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[30, 50, 70, 100].map(v => (
                                        <button key={v} onClick={() => activatePlan(plans[0], 'hybrid', 0.01, v, v)} className="p-4 bg-white/10 border border-white/10 rounded-xl font-black text-[11px] hover:bg-white hover:text-black transition-all">${v}+1%</button>
                                    ))}
                                </div>
                                <div className="bg-black/80 p-5 rounded-2xl border border-white/10">
                                    <div className="flex gap-2">
                                        <div className="flex-grow"><span className="text-[6px] font-black text-gray-600 block mb-1">BASE $</span><input id="dual-f-2" type="number" defaultValue="50" className="w-full bg-black border border-white/10 p-2 rounded-lg text-white font-black text-xs" /></div>
                                        <div className="flex-grow"><span className="text-[6px] font-black text-gray-600 block mb-1">COM %</span><input id="dual-r-2" type="number" defaultValue="1" className="w-full bg-black border border-white/10 p-2 rounded-lg text-white font-black text-xs" /></div>
                                    </div>
                                    <button onClick={() => {
                                        const f = parseFloat((document.getElementById('dual-f-2') as HTMLInputElement).value) || 0;
                                        const r = (parseFloat((document.getElementById('dual-r-2') as HTMLInputElement).value) || 0) / 100;
                                        const amt = parseFloat((document.getElementById('pay-amt') as HTMLInputElement)?.value) || f;
                                        activatePlan(plans[0], 'hybrid', r, f, amt);
                                    }} className="w-full mt-4 py-4 bg-[#FFD700] text-black font-black uppercase text-[10px] rounded-xl">Lanzar Plan Dual</button>
                                </div>
                            </div>
                            {/* Com */}
                            <div className="bg-white/2 p-6 rounded-3xl border border-white/5 space-y-4 text-center">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase mb-4">Solo Comisiones</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[0.01, 0.02, 0.03, 0.05, 0.10, 0.20].map(r => (
                                        <button key={r} onClick={() => activatePlan(plans[2], 'commission', r, 0, 0)} className="p-4 bg-white/5 border border-white/5 rounded-xl font-black text-[11px] hover:bg-white hover:text-black transition-all">{(r * 100).toFixed(0)}%</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsActivationModalOpen(false)} className="w-full mt-10 text-gray-700 font-black uppercase text-[10px] tracking-[1em]">Cerrar</button>
                    </div>
                </div>
            )}

            {/* Modal de Tarifas Globales */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#0a0a0a] border border-[#FFD700]/30 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl my-auto">
                        <h2 className="text-xl font-black uppercase italic mb-8 text-center">Costos Operativos</h2>
                        <div className="space-y-4">
                            {plans.map(p => (
                                <div key={p.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                                    <input type="text" value={p.name} onChange={(e) => setPlans(prev => prev.map(pl => pl.id === p.id ? { ...pl, name: e.target.value } : pl))} className="bg-transparent font-black text-xs uppercase text-white w-24 border-none outline-none" />
                                    <div className="flex gap-2 items-center">
                                        <input type="number" value={p.price} onChange={(e) => setPlans(prev => prev.map(pl => pl.id === p.id ? { ...pl, price: parseFloat(e.target.value) || 0 } : pl))} className="bg-black w-14 p-2 rounded-lg border border-[#FFD700]/20 text-right font-black text-xs outline-none text-[#FFD700]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setIsSettingsOpen(false)} className="w-full mt-8 py-5 bg-[#FFD700] text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl">Guardar</button>
                    </div>
                </div>
            )}

            <footer className="mt-auto p-12 text-center opacity-30">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[1em]">KeMaster Global Fleet OS v2.0 • Capitán Master</p>
            </footer>
        </div>
    );
};

export default MasterApp;
