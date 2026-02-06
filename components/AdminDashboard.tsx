
import React, { useMemo } from 'react';
import { SaleRecord, AppSettings, View } from '../types';

interface AdminDashboardProps {
    reports: SaleRecord[];
    settings: AppSettings;
    onGoToView: (view: View) => void;
    onEditOrder: (report: SaleRecord, targetView?: View) => void;
    onVoidOrder: (reportId: string) => void;
    onReprintOrder: (sale: SaleRecord) => void;
    isPrinterConnected: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
    reports,
    settings,
    onGoToView,
    onEditOrder,
    onVoidOrder,
    onReprintOrder,
    isPrinterConnected
}) => {
    const activeRate = settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel;
    const today = new Date().toISOString().split('T')[0];

    // Filtros de datos para el día de hoy
    const todayReports = useMemo(() => reports.filter(r => r.date === today), [reports, today]);

    const stats = useMemo(() => {
        const paid = todayReports.reduce((acc, r) => {
            if (r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO') {
                return r.type === 'refund' ? acc - r.total : acc + r.total;
            }
            return acc;
        }, 0);
        const pending = todayReports.reduce((acc, r) => r.notes === 'PENDIENTE' ? acc + r.total : acc, 0);
        const count = todayReports.filter(r => r.notes !== 'ANULADO').length;
        return { paid, pending, count };
    }, [todayReports]);

    const [selectedWaiter, setSelectedWaiter] = React.useState<string | 'all'>('all');

    const pendingOrders = todayReports.filter(r => r.notes === 'PENDIENTE');
    const recentPaidOrders = todayReports.filter(r => r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO').slice(0, 5); // Últimos 5 cobrados

    // Obtener lista única de meseros del sistema + meseros con órdenes hoy
    const allWaiters = useMemo(() => {
        const fromSettings = settings.users.filter(u => u.role === 'mesero').map(u => u.name);
        const fromOrders = todayReports.map(o => o.waiter);
        return Array.from(new Set([...fromSettings, ...fromOrders]));
    }, [settings.users, todayReports]);

    const filteredPendingOrders = useMemo(() => {
        if (selectedWaiter === 'all') return pendingOrders;
        return pendingOrders.filter(o => o.waiter === selectedWaiter);
    }, [pendingOrders, selectedWaiter]);

    const filteredRecentPaidOrders = useMemo(() => {
        if (selectedWaiter === 'all') return recentPaidOrders;
        return recentPaidOrders.filter(o => o.waiter === selectedWaiter);
    }, [recentPaidOrders, selectedWaiter]);

    const [now, setNow] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getElapsedTime = (createdAt?: string) => {
        if (!createdAt) return null;
        const start = new Date(createdAt);
        const diff = Math.floor((now.getTime() - start.getTime()) / 60000);

        if (diff < 1) return 'Recién';
        if (diff < 60) return `${diff} min`;

        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return `${hours}h ${mins}m`;
    };

    const getTimeColorClass = (createdAt?: string) => {
        if (!createdAt) return 'text-gray-400';
        const start = new Date(createdAt);
        const diff = Math.floor((now.getTime() - start.getTime()) / 60000);

        if (diff > 45) return 'text-red-600 font-black';
        if (diff > 30) return 'text-amber-600 font-bold';
        if (diff > 15) return 'text-blue-600 font-bold';
        return 'text-green-600 font-bold';
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 font-sans overflow-hidden">
            {/* Header Informativo */}
            <header className="bg-white p-4 border-b flex justify-between items-center shadow-sm">
                <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Panel de Control</h1>
                <div className="flex gap-2 text-[10px] font-black uppercase text-gray-500">
                    <span>{today}</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col">
                {/* Grid de KPIs (Compacto en móvil) */}
                <div className="p-4 grid grid-cols-2 gap-3 shrink-0">
                    <div className="bg-gradient-to-br from-[#111] to-[#FF0000] p-4 rounded-3xl text-white shadow-lg overflow-hidden relative border border-white/5">
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Cobrado Hoy</p>
                            <p className="text-2xl font-black">${stats.paid.toFixed(2)}</p>
                            <p className="text-[9px] font-bold opacity-60">Bs. {(stats.paid * activeRate).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="bg-[#FFD700] p-4 rounded-3xl text-black shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Por Cobrar</p>
                            <p className="text-2xl font-black">${stats.pending.toFixed(2)}</p>
                            <p className="text-[9px] font-bold opacity-60">Bs. {(stats.pending * activeRate).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Grid Principal de 3 Columnas */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-full px-6 pb-20 lg:pb-6 lg:overflow-hidden">

                    {/* COLUMNA 1: POR COBRAR */}
                    <div className="flex flex-col h-auto lg:h-full bg-white/40 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="p-6 border-b border-gray-50 bg-white/60 flex justify-between items-center bg-opacity-95">
                            <div>
                                <h2 className="text-[11px] font-black uppercase text-amber-500 tracking-[0.2em] mb-1">Por Cobrar</h2>
                                <p className="text-[18px] font-black text-gray-900 leading-none">Radar de Comandas</p>
                            </div>
                            <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black">{filteredPendingOrders.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            {filteredPendingOrders.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center italic text-gray-300 text-xs">
                                    No hay pedidos pendientes
                                </div>
                            ) : (
                                filteredPendingOrders.map(order => (
                                    <div key={order.id} className="bg-white rounded-[1.8rem] border border-gray-50 shadow-sm p-4 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-black text-[13px] uppercase text-gray-800 leading-tight mb-1">{order.customerName || `Mesa ${order.tableNumber}`}</h3>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase">{order.waiter} • {order.time}</p>
                                                {/* Puntos de Estado de Cocina */}
                                                <div className="flex flex-wrap gap-1 mt-2 max-w-[120px]">
                                                    {order.order.map((item: any, idx) => {
                                                        if (order.notes === 'ANULADO') return <div key={idx} className="w-1.5 h-1.5 rounded-full bg-red-200" title="Anulado" />;
                                                        let dotClass = 'bg-gray-200';
                                                        const statuses = Object.values(item.kitchenStatus || {});
                                                        if (item.isServed) dotClass = 'bg-purple-500';
                                                        else if (statuses.includes('ready')) dotClass = 'bg-green-500 animate-pulse';
                                                        else if (statuses.includes('preparing')) dotClass = 'bg-amber-500 animate-pulse';
                                                        return <div key={idx} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} title={`${item.quantity}x ${item.name}`} />;
                                                    })}
                                                </div>
                                            </div>
                                            <p className="text-[15px] font-black text-gray-900">${order.total.toFixed(2)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => onEditOrder(order, 'menu')} className="py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase border border-blue-100 active:scale-95 transition-all">Editar / Cobrar</button>
                                            <button onClick={() => onVoidOrder(order.id)} className="py-2.5 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase border border-red-100 active:scale-95 transition-all">Anular</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* COLUMNA 2: COBRADO */}
                    <div className="flex flex-col h-auto lg:h-full bg-white/40 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                        <div className="p-6 border-b border-gray-50 bg-white/60 flex justify-between items-center bg-opacity-95">
                            <div>
                                <h2 className="text-[11px] font-black uppercase text-green-500 tracking-[0.2em] mb-1">Cobrado</h2>
                                <p className="text-[18px] font-black text-gray-900 leading-none">Flujo de Caja</p>
                            </div>
                            <button onClick={() => onGoToView('reports')} className="text-[9px] font-black text-purple-600 border-b border-purple-600 uppercase">Ver Todo</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            {filteredRecentPaidOrders.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center italic text-gray-300 text-xs">
                                    Aún no hay ventas cobradas
                                </div>
                            ) : (
                                filteredRecentPaidOrders.map(order => (
                                    <div key={order.id} onClick={() => onReprintOrder(order)} className="bg-gradient-to-r from-white to-green-50/30 rounded-[1.8rem] border border-green-50 shadow-sm p-4 flex justify-between items-center cursor-pointer hover:border-green-200 transition-all group active:scale-95">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-green-500 rounded-full group-hover:scale-y-125 transition-transform"></div>
                                            <div>
                                                <h3 className="font-bold text-[13px] text-gray-800 uppercase leading-none mb-1">{order.customerName || `Mesa ${order.tableNumber}`}</h3>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{order.waiter} • {order.notes}</p>
                                                <div className="flex flex-wrap gap-1 mt-1.5 max-w-[100px]">
                                                    {order.order.map((item: any, idx) => {
                                                        if (order.notes === 'ANULADO') return <div key={idx} className="w-1.5 h-1.5 rounded-full bg-red-200" title="Anulado" />;
                                                        let dotClass = 'bg-gray-200';
                                                        const statuses = Object.values(item.kitchenStatus || {});
                                                        if (item.isServed) dotClass = 'bg-purple-500';
                                                        else if (statuses.includes('ready')) dotClass = 'bg-green-500 animate-pulse';
                                                        else if (statuses.includes('preparing')) dotClass = 'bg-amber-500 animate-pulse';
                                                        return <div key={idx} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} title={`${item.quantity}x ${item.name}`} />;
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[15px] font-black text-green-600 leading-none">${order.total.toFixed(2)}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{order.time}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* COLUMNA 3: EQUIPO */}
                    <div className="flex flex-col h-auto lg:h-full bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[400px]">
                        <div className="p-6 border-b border-white/5 bg-black/20 shrink-0">
                            <h2 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.2em] mb-1">Rendimiento</h2>
                            <p className="text-[18px] font-black text-white leading-none italic">Control de Equipo</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            {allWaiters.map(waiter => {
                                const waiterSales = todayReports.filter(r => r.waiter === waiter && r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO');
                                const total = waiterSales.reduce((acc, r) => r.type === 'refund' ? acc - r.total : acc + r.total, 0);
                                const pending = todayReports.filter(r => r.waiter === waiter && r.notes === 'PENDIENTE').reduce((acc, r) => acc + r.total, 0);

                                if (total === 0 && waiterSales.length === 0 && pending === 0) return null;

                                return (
                                    <div key={waiter} className="group">
                                        <div className="flex justify-between items-end mb-2">
                                            <p className="text-sm font-black uppercase italic text-white group-hover:text-[#FFD700] transition-colors">{waiter}</p>
                                            <p className="text-xl font-black italic text-[#FFD700] leading-none">${total.toFixed(0)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between mt-2">
                                            <span className="text-[8px] font-bold text-gray-500 uppercase">{waiterSales.length} Ventas</span>
                                            {pending > 0 && <span className="text-[8px] font-black text-amber-500 uppercase">Pend: ${pending.toFixed(0)}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 bg-black/40 border-t border-white/5">
                            <button
                                onClick={() => onGoToView('reports')}
                                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                Historial General
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
