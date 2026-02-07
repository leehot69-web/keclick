import React, { useState } from 'react';

interface RegistrationScreenProps {
    onRegister: (businessName: string, phone: string) => void;
    onJoin: (storeId: string) => Promise<boolean>;
    onRecover: (phone: string) => Promise<{ id: string, name: string } | null>;
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onRegister, onJoin, onRecover }) => {
    const [mode, setMode] = useState<'register' | 'join' | 'recover'>('register');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [joinId, setJoinId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [recoveredData, setRecoveredData] = useState<{ id: string, name: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mode === 'register') {
                if (!name || !phone) throw new Error('Completa todos los campos');
                onRegister(name, phone);
            } else if (mode === 'join') {
                if (!joinId) throw new Error('Ingresa un código de tienda');
                const success = await onJoin(joinId.toUpperCase());
                if (!success) throw new Error('Código de tienda no encontrado');
            } else if (mode === 'recover') {
                if (!phone) throw new Error('Ingresa el teléfono registrado');
                const data = await onRecover(phone);
                if (!data) throw new Error('No se encontró ninguna tienda asociada a este teléfono');
                setRecoveredData(data);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center">
                    <div className="text-6xl font-black uppercase tracking-tighter italic mb-4">
                        <span className="text-[#FF0000]">Ke</span>
                        <span className="text-[#FFD700]">click</span>
                    </div>
                    <div className="inline-flex bg-white/5 p-1 rounded-2xl mb-8">
                        <button
                            type="button"
                            onClick={() => setMode('register')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-[#FF0000] text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Nuevo Negocio
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('join')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'join' ? 'bg-[#FF0000] text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Tengo un Código
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-[#111] p-10 rounded-[3rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF0000] to-transparent"></div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {mode === 'register' ? (
                            <>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700] mb-3">Nombre del Negocio</label>
                                    <input
                                        required
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="EJ: PIZZERÍA LA TOSCANA"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-700 focus:outline-none focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] transition-all uppercase font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700] mb-3">WhatsApp de Contacto</label>
                                    <input
                                        required
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="EJ: 584120000000"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-700 focus:outline-none focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] transition-all font-bold"
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700] mb-3">Código de Tienda (ID)</label>
                                <input
                                    required
                                    type="text"
                                    value={joinId}
                                    onChange={(e) => setJoinId(e.target.value)}
                                    placeholder="EJ: KC-AX42Y"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white placeholder-gray-700 focus:outline-none focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] transition-all text-center text-3xl font-black tracking-widest uppercase"
                                />
                                <div className="mt-6 flex justify-between items-center px-2">
                                    <p className="text-[10px] text-gray-500 leading-relaxed max-w-[180px]">
                                        Encuentra este código en la sección de <strong className="text-gray-300">Ajustes</strong>.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setMode('recover'); setError(''); }}
                                        className="text-[10px] font-black text-[#FFD700] underline uppercase tracking-tighter"
                                    >
                                        ¿Olvidaste tu código?
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'recover' && (
                            <div className="space-y-6">
                                {!recoveredData ? (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD700] mb-3">Teléfono Registrado</label>
                                            <input
                                                required
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="EJ: 584120000000"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-700 focus:outline-none focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] transition-all font-bold"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                                            Ingresa el número de WhatsApp que usaste al registrar tu negocio para recuperar tu ID.
                                        </p>
                                    </>
                                ) : (
                                    <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 p-6 rounded-3xl text-center space-y-4">
                                        <h4 className="text-[#FFD700] font-black uppercase text-xs">¡Tienda Encontrada!</h4>
                                        <div>
                                            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">{recoveredData.name}</p>
                                            <p className="text-3xl font-black text-white tracking-widest">{recoveredData.id}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setJoinId(recoveredData.id); setMode('join'); setRecoveredData(null); }}
                                            className="w-full py-3 bg-[#FFD700] text-black font-black rounded-xl uppercase text-xs active:scale-95 transition-all"
                                        >
                                            Usar este Código
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setMode('join'); setRecoveredData(null); setError(''); }}
                                    className="w-full text-[10px] font-black text-gray-500 uppercase tracking-widest text-center"
                                >
                                    Volver a Conectar
                                </button>
                            </div>
                        )}
                    </div>

                    {mode !== 'recover' || !recoveredData ? (
                        <button
                            disabled={loading}
                            type="submit"
                            className={`mt-10 w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all transform active:scale-95 shadow-2xl flex items-center justify-center gap-3 ${loading ? 'bg-gray-800 text-gray-500' : 'bg-[#FF0000] text-white hover:bg-[#CC0000] shadow-[0_20px_50px_rgba(255,0,0,0.3)]'}`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>{mode === 'recover' ? 'BUSCANDO...' : 'CONECTANDO...'}</span>
                                </>
                            ) : (
                                <span>
                                    {mode === 'register' ? 'CREAR NEGOCIO' : mode === 'join' ? 'CONECTAR TIENDA' : 'RECUPERAR CÓDIGO'}
                                </span>
                            )}
                        </button>
                    ) : null}
                </form>

                <div className="flex items-center justify-center gap-8 grayscale opacity-20 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                    <div className="text-[8px] font-black uppercase tracking-widest">REALTIME SYNC</div>
                    <div className="text-[8px] font-black uppercase tracking-widest">MULTI-DEVICE</div>
                    <div className="text-[8px] font-black uppercase tracking-widest">CLOUD POS</div>
                </div>
            </div>
        </div>
    );
};

export default RegistrationScreen;
