import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

interface MasterStore {
    id: string;
    name: string;
    owner_phone: string;
    owner_name?: string;
    owner_email?: string;
    status: string;
    created_at: string;
    trial_ends_at: string;
    settings?: { users: any[] }[];
}

interface MasterDashboardProps {
    onClose: () => void;
    onSelectStore: (storeId: string) => void;
}

const MasterDashboard: React.FC<MasterDashboardProps> = ({ onClose, onSelectStore }) => {
    const [stores, setStores] = useState<MasterStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    // New Store Form State
    const [newStoreName, setNewStoreName] = useState('');
    const [newStorePhone, setNewStorePhone] = useState('');
    const [newOwnerName, setNewOwnerName] = useState('');
    const [newEmail, setNewEmail] = useState('');

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data) return;

            const { data: settingsData, error: settingsError } = await supabase
                .from('settings')
                .select('store_id, users');

            if (!settingsError && settingsData) {
                const storesWithSettings = data.map(store => ({
                    ...store,
                    settings: settingsData.filter((s: any) => s.store_id === store.id)
                }));
                setStores(storesWithSettings);
            } else {
                setStores(data);
            }
        } catch (err) {
            console.error("Master fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStoreName || !newStorePhone) return;

        const newStoreId = `KC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const now = new Date();

        setLoading(true);
        try {
            const { error: storeError } = await supabase.from('stores').insert({
                id: newStoreId,
                name: newStoreName,
                owner_phone: newStorePhone,
                owner_name: newOwnerName,
                status: 'trial',
                trial_ends_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
            });

            if (storeError) throw storeError;

            const { error: settingsError } = await supabase.from('settings').insert({
                store_id: newStoreId,
                business_name: newStoreName,
                target_number: newStorePhone,
                is_whatsapp_enabled: true,
                kitchen_stations: [{ id: 'general', name: 'Cocina General', color: '#FF0000' }],
                users: [{ id: '1', name: 'Admin', pin: '0000', role: 'admin' }]
            });

            if (settingsError) throw settingsError;

            alert(`Tienda creada con éxito.\nID: ${newStoreId}\nPIN ADMIN: 0000`);
            setShowCreateForm(false);
            setNewStoreName('');
            setNewStorePhone('');
            setNewOwnerName('');
            setNewEmail('');
            fetchStores();
        } catch (err: any) {
            alert("Error al crear tienda: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getAdminPin = (store: MasterStore) => {
        const users = store.settings?.[0]?.users || [];
        const admin = users.find((u: any) => u.role === 'admin');
        return admin?.pin || '0000';
    };

    const filteredStores = stores.filter(s =>
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.owner_phone || '').includes(search) ||
        (s.owner_name || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleUpdatePhone = async (storeId: string, currentPhone: string) => {
        const newPhone = window.prompt(`Nuevo teléfono para esta tienda:`, currentPhone);
        if (newPhone && newPhone !== currentPhone) {
            const { error } = await supabase
                .from('stores')
                .update({ owner_phone: newPhone })
                .eq('id', storeId);

            if (error) alert("Error al actualizar: " + error.message);
            else {
                setStores(prev => prev.map(s => s.id === storeId ? { ...s, owner_phone: newPhone } : s));
                alert("Teléfono actualizado con éxito.");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-[#050505] flex flex-col font-sans p-4 md:p-8 overflow-hidden">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 shrink-0 gap-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter flex items-center gap-3">
                        <span className="bg-red-600 px-3 py-1 rounded-xl">KE</span> MASTER
                    </h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Central Business Control Panel</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex-1 md:flex-none h-14 px-8 bg-red-600 text-white rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-red-600/30 active:scale-95 transition-all"
                    >
                        + Nueva Sede
                    </button>
                    <button
                        onClick={onClose}
                        className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white border border-white/10 hover:bg-red-600 transition-all font-black"
                    >
                        ✕
                    </button>
                </div>
            </header>

            {showCreateForm && (
                <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <form onSubmit={handleCreateStore} className="bg-[#111] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg space-y-5 shadow-2xl">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 text-center">Registrar Nuevo Contrato</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black text-red-500 uppercase mb-2 ml-1">Tienda / Negocio</label>
                                <input required type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-white font-bold focus:border-red-600 outline-none transition-all" placeholder="Nombre Comercial" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-500 uppercase mb-2 ml-1">Nombre del Dueño</label>
                                <input type="text" value={newOwnerName} onChange={e => setNewOwnerName(e.target.value)} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-white font-bold focus:border-red-600 outline-none transition-all" placeholder="Responsable" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black text-gray-500 uppercase mb-2 ml-1">WhatsApp Sede</label>
                                <input required type="tel" value={newStorePhone} onChange={e => setNewStorePhone(e.target.value)} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-white font-bold focus:border-red-600 outline-none transition-all" placeholder="584120000000" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-500 uppercase mb-2 ml-1">Email del Negocio</label>
                                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 py-4 px-5 rounded-2xl text-white font-bold focus:border-red-600 outline-none transition-all" placeholder="admin@tienda.com" />
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 py-4 bg-white/5 text-gray-400 font-bold rounded-2xl uppercase text-[10px]">Cerrar</button>
                            <button type="submit" className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-red-600/30">Activar Licencia</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="relative mb-8 shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filtrar por tienda, dueño, ID o teléfono..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-red-600 transition-all uppercase text-sm shadow-inner"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-6">
                        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[11px] font-black uppercase text-gray-500 tracking-[0.5em] animate-pulse">Sincronizando Network...</p>
                    </div>
                ) : filteredStores.length === 0 ? (
                    <div className="text-center py-24 text-gray-700 italic uppercase font-black text-xs tracking-widest">No se encontraron sedes bajo estos parámetros</div>
                ) : (
                    filteredStores.map(store => (
                        <div key={store.id} className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center group hover:bg-[#151515] hover:border-red-600/40 transition-all duration-300 gap-6">
                            <div className="space-y-4 flex-1 w-full">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[9px] font-black text-red-600 bg-red-600/10 px-3 py-1 rounded-full border border-red-600/20 italic">ID: {store.id}</span>
                                    <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">KEY PIN: {getAdminPin(store)}</span>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{store.name || 'SIN NOMBRE'}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-[11px] font-bold text-gray-400 uppercase">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-600 text-[8px] font-black">Dueño / Responsable:</span>
                                        <span className="text-white break-all">{store.owner_name || 'PENDIENTE REGISTRAR'}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-600 text-[8px] font-black">Teléfono / WhatsApp:</span>
                                        <button onClick={() => handleUpdatePhone(store.id, store.owner_phone)} className="text-white hover:text-red-500 transition-colors flex items-center gap-2 group/btn">
                                            {store.owner_phone || 'N/A'}
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-0 group-hover/btn:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-600 text-[8px] font-black">Correo Electrónico:</span>
                                        <span className="text-white break-all">PENDIENTE</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-600 text-[8px] font-black">Fecha de Alta:</span>
                                        <span className="text-gray-500">{new Date(store.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-600 text-[8px] font-black">Vencimiento Trial:</span>
                                        <span className="text-amber-500/80 italic">{new Date(store.trial_ends_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                                <div className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-center ${store.status === 'trial' ? 'bg-amber-600/10 text-amber-500 border border-amber-500/20' : 'bg-green-600/10 text-green-500 border border-green-500/20'}`}>
                                    {store.status === 'trial' ? 'MODO PRUEBA' : 'LICENCIA ACTIVA'}
                                </div>
                                <button
                                    onClick={() => onSelectStore(store.id)}
                                    className="h-16 bg-white text-black rounded-3xl flex items-center justify-center shadow-xl hover:bg-red-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 group/enter font-black uppercase text-[10px] tracking-widest gap-2"
                                >
                                    <span>Controlar Sede</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <footer className="mt-8 py-6 border-t border-white/5 text-center shrink-0">
                <div className="flex items-center justify-center gap-4 text-[9px] font-black text-gray-700 uppercase tracking-[0.4em]">
                    <span>GLOBAL NETWORK SECURITY</span>
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                    <span>ENCRYPTION V4.0</span>
                </div>
            </footer>
        </div>
    );
};

export default MasterDashboard;
