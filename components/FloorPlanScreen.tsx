
import React, { useMemo, useState, useEffect } from 'react';
import { SaleRecord, AppSettings } from '../types';

interface FloorPlanScreenProps {
    reports: SaleRecord[];
    settings: AppSettings;
    onGoBack: () => void;
    onEditOrder: (report: SaleRecord) => void;
    onViewOrder: (report: SaleRecord) => void;
    onReopenOrder: (reportId: string) => void;
    onCloseOrder: (reportId: string) => void;
    forceRenderCount?: number;
}

const FloorPlanScreen: React.FC<FloorPlanScreenProps> = ({ reports, settings, onGoBack, onEditOrder, onViewOrder, onReopenOrder, onCloseOrder, forceRenderCount = 0 }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const activeOrders = useMemo(() => {
        const today = new Date().toLocaleDateString('en-CA');

        return (Array.isArray(reports) ? reports : []).filter(r => {
            // REGLAS ESTRICTAS: 1. No anulados, 2. No liberados manualmente, 3. NO CERRADOS EN CAJA
            if (!r || r.closed || r.notes === 'ANULADO' || r.notes?.includes('(LIBERADA)')) return false;

            const rDate = (r.date || '').split('T')[0];
            const rTimestamp = r.createdAt ? new Date(r.createdAt).getTime() : 0;
            const nowTime = Date.now();

            const isToday = rDate === today;
            const isRecent = rTimestamp > 0 && (nowTime - rTimestamp < 18 * 60 * 60 * 1000);

            return isToday || isRecent;
        }).sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    }, [reports, forceRenderCount]);

    const getTimeElapsed = (createdAt?: string) => {
        if (!createdAt) return '00:00';
        const start = new Date(createdAt).getTime();
        const diff = Math.max(0, currentTime - start);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full bg-black text-white overflow-hidden font-sans">
            {/* Header Surgical Style */}
            <header className="bg-[#111]/95 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-6 py-4 shrink-0 h-20 z-[100]">
                <div className="flex items-center gap-4">
                    <button onClick={onGoBack} className="text-[#FFD700] w-12 h-12 flex items-center justify-center active:scale-90 transition-transform bg-white/5 rounded-2xl border border-white/5">
                        <span className="material-symbols-outlined text-3xl font-light">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">Mapa en <span className="text-[#FFD700]">Vivo</span></h1>
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">{activeOrders.length} MESAS EN PANTALLA</p>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="flex gap-2 bg-black/50 p-2 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2 px-2 border-r border-white/10 pr-4">
                            <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse"></div>
                            <span className="text-[8px] font-bold opacity-40 uppercase">Abierto</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 pl-4">
                            <div className="w-2 h-2 rounded-full bg-[#444]"></div>
                            <span className="text-[8px] font-bold opacity-40 uppercase">Pagado</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Canvas */}
            <main className="flex-grow overflow-y-auto p-5 scrollbar-hide pb-32 relative">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FFD700 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                {activeOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                        <span className="material-symbols-outlined text-8xl mb-6">layers_clear</span>
                        <p className="text-xs font-black uppercase tracking-[0.4em]">Sin información activa</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 relative z-10">
                        {activeOrders.map(order => {
                            const isPending = order.notes === 'PENDIENTE';
                            // Lo que se paga se pone en gris, abierto se queda en oro
                            const statusColor = isPending ? '#FFD700' : '#444';
                            const elapsed = getTimeElapsed(order.createdAt);

                            return (
                                <div key={order.id} className={`relative group ${!isPending ? 'opacity-80 grayscale-[0.3]' : ''}`}>
                                    <button
                                        onClick={() => {
                                            if (isPending) {
                                                onEditOrder(order);
                                            } else {
                                                onViewOrder(order);
                                            }
                                        }}
                                        className={`w-full aspect-square rounded-[2.5rem] bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between p-6 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden active:scale-95 group-hover:bg-white/[0.04] group-hover:border-white/20`}
                                    >
                                        {/* EL RELOJ ROJO EN LA ESQUINA (User Request) */}
                                        <div className="absolute top-0 right-0 bg-red-600 px-3 py-1.5 rounded-bl-3xl flex items-center gap-1.5 shadow-2xl z-20 border-l border-b border-red-400/30">
                                            <span className="material-symbols-outlined text-[10px] text-white animate-spin-slow">schedule</span>
                                            <span className="text-[10px] font-mono font-black text-white tracking-tighter tabular-nums">{elapsed}</span>
                                        </div>

                                        {/* Color Signature Bar (Surgical) */}
                                        <div
                                            className="absolute left-0 top-10 bottom-10 w-1.5 rounded-r-full"
                                            style={{
                                                backgroundColor: statusColor,
                                                boxShadow: `0 0 20px ${statusColor}66`
                                            }}
                                        ></div>

                                        {/* Top Section */}
                                        <div className="flex justify-between items-start pl-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <div className={`px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${isPending ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20' : 'bg-white/5 text-white/30 border-white/10'}`}>
                                                    {isPending ? 'ABIERTO' : 'PAGADO'}
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-mono font-bold text-white/5 mr-16">{order.time?.split(':').slice(0, 2).join(':')}</span>
                                        </div>

                                        {/* Center Section */}
                                        <div className="flex flex-col items-start pl-4 overflow-hidden py-1">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">
                                                {order.tableNumber > 0 ? `Mesa #${order.tableNumber}` : 'Ticket'}
                                            </span>
                                            <h3 className="text-xl font-black text-white italic tracking-tighter truncate w-full leading-none group-hover:scale-105 transition-transform duration-300 drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
                                                {order.customerName || 'Cliente'}
                                            </h3>
                                        </div>

                                        {/* Bottom Section */}
                                        <div className="w-full flex justify-between items-end pl-4">
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.3em] mb-1">Total USD</span>
                                                <span className={`text-2xl font-mono font-black tracking-tighter ${isPending ? 'text-white' : 'text-white/40'}`}>
                                                    ${order.total.toFixed(2)}
                                                </span>
                                            </div>
                                            {!isPending && (
                                                <div className="w-10 h-10 rounded-full bg-[#0bda19]/10 border border-[#0bda19]/30 flex items-center justify-center text-[#0bda19] shadow-inner">
                                                    <span className="material-symbols-outlined text-xl font-black text-[#0bda19]/50">verified_user</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Premium Lighting Overlays */}
                                        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/[0.02] blur-[40px] rounded-full pointer-events-none"></div>
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                    </button>

                                    {/* Action Button for PAID but still occupying the table */}
                                    {!isPending && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm("¿Liberar mesa y archivar pedido?")) {
                                                    onCloseOrder(order.id);
                                                }
                                            }}
                                            className="absolute -bottom-2 -right-2 bg-red-600 text-white w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center active:scale-75 transition-all z-50 border-[6px] border-black hover:scale-110"
                                            title="La mesa se desocupó"
                                        >
                                            <span className="material-symbols-outlined text-xl font-black">close</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default FloorPlanScreen;
