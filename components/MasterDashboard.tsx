
import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

interface MasterStore {
    id: string;
    name: string;
    owner_phone: string;
    status: string;
    created_at: string;
    trial_ends_at: string;
}

interface MasterDashboardProps {
    onClose: () => void;
    onSelectStore: (storeId: string) => void;
}

const MasterDashboard: React.FC<MasterDashboardProps> = ({ onClose, onSelectStore }) => {
    const [stores, setStores] = useState<MasterStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setStores(data);
        setLoading(false);
    };

    const filteredStores = stores.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.owner_phone.includes(search)
    );

    const handleUpdatePhone = async (storeId: string, currentPhone: string) => {
        const newPhone = window.prompt(`Nuevo teléfono para esta tienda:`, currentPhone);
        if (newPhone && newPhone !== currentPhone) {
            const { error } = await supabase
                .from('stores')
                .update({ owner_phone: newPhone })
                .eq('id', storeId);

            if (error) {
                alert("Error al actualizar: " + error.message);
            } else {
                setStores(prev => prev.map(s => s.id === storeId ? { ...s, owner_phone: newPhone } : s));
                alert("Teléfono actualizado con éxito.");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col font-sans p-6 overflow-hidden">
            <header className="flex justify-between items-center mb-8 shrink-0">
                <div>
                    <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">
                        <span className="text-red-600">KE</span> MASTER
                    </h1>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Gestión Centralizada de Licencias</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-all font-black"
                >
                    ✕
                </button>
            </header>

            <div className="relative mb-6 shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="BUSCAR POR NOMBRE, ID O TELÉFONO..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-red-600 transition-all uppercase"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-none">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-4">
                        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase text-gray-500">Cargando Universos...</p>
                    </div>
                ) : filteredStores.length === 0 ? (
                    <div className="text-center py-20 text-gray-600 italic uppercase font-black text-xs">No se encontraron registros</div>
                ) : (
                    filteredStores.map(store => (
                        <div key={store.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex justify-between items-center group hover:border-red-600/30 transition-all">
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-white uppercase leading-none">{store.name}</h3>
                                <div className="flex gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                    <span className="text-red-500">{store.id}</span>
                                    <span>•</span>
                                    <button
                                        onClick={() => handleUpdatePhone(store.id, store.owner_phone)}
                                        className="hover:text-red-500 transition-colors flex items-center gap-1"
                                        title="Click para cambiar teléfono"
                                    >
                                        {store.owner_phone}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                </div>
                                <div className="text-[9px] text-gray-600 font-medium">Registrado: {new Date(store.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${store.status === 'trial' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                                    {store.status}
                                </div>
                                <button
                                    onClick={() => onSelectStore(store.id)}
                                    className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20 active:scale-90 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <footer className="mt-8 py-4 border-t border-white/5 text-center shrink-0">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">Keclick Global Network Security v2.0</p>
            </footer>
        </div>
    );
};

export default MasterDashboard;
