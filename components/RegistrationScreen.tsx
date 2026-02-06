import React, { useState } from 'react';

interface RegistrationScreenProps {
    onRegister: (businessName: string, phone: string) => void;
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onRegister }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone) return;
        setLoading(true);
        setTimeout(() => {
            onRegister(name, phone);
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
            <div className="w-full max-w-md space-y-8 animate-fadeIn">
                <div className="text-center">
                    <div className="text-5xl font-black uppercase tracking-tighter italic mb-2">
                        <span className="text-[#FF0000]">Ke</span>
                        <span className="text-[#FFD700]">click</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Bienvenido a la Plataforma</h2>
                    <p className="text-gray-400 mt-2">Registra tu negocio y obtén 5 días de prueba gratis.</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-[#111] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-[#FFD700] mb-2">Nombre del Negocio</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Pizzería La Toscana"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-[#FFD700] mb-2">WhatsApp de Contacto</label>
                            <input
                                required
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej: 584120000000"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] transition-all"
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-lg transition-all transform active:scale-95 shadow-xl ${loading ? 'bg-gray-700' : 'bg-[#FF0000] text-white hover:bg-[#CC0000] shadow-[0_15px_40px_rgba(255,0,0,0.2)]'}`}
                    >
                        {loading ? 'Procesando...' : 'Empezar Prueba Gratis'}
                    </button>
                </form>

                <p className="text-center text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em]">
                    Control Total • Gestión PRO • Multi-Estación
                </p>
            </div>
        </div>
    );
};

export default RegistrationScreen;
