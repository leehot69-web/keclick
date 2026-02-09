
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
    forceRenderCount?: number;
}

const AdminDashboard: React.FC<AdminDashboardProps & { theme?: string }> = ({
    reports,
    settings,
    onGoToView,
    onEditOrder,
    onVoidOrder,
    onReprintOrder,
    isPrinterConnected,
    forceRenderCount = 0,
    theme = 'keclick'
}) => {
    const isBrutalist = theme === 'brutalist';
    const activeRate = settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel;
    const today = new Date().toISOString().split('T')[0];

    // Datos del día
    const todayReports = useMemo(() => reports.filter(r => r.date === today), [reports, today, forceRenderCount]);

    const stats = useMemo(() => {
        const paid = todayReports.reduce((acc, r) => {
            if (r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO') {
                return r.type === 'refund' ? acc - r.total : acc + r.total;
            }
            return acc;
        }, 0);
        const pending = todayReports.reduce((acc, r) => r.notes === 'PENDIENTE' ? acc + r.total : acc, 0);
        const count = todayReports.filter(r => r.notes !== 'ANULADO').length;

        // Simulación de tendencia (para el diseño)
        const trend = 12.4;
        const avgTicket = count > 0 ? paid / count : 0;

        return { paid, pending, count, trend, avgTicket };
    }, [todayReports]);

    // Productos más vendidos
    const topProducts = useMemo(() => {
        const counts: Record<string, { count: number, total: number }> = {};
        todayReports.forEach(r => {
            if (r.notes !== 'ANULADO') {
                r.order.forEach((item: any) => {
                    if (!counts[item.name]) counts[item.name] = { count: 0, total: 0 };
                    counts[item.name].count += item.quantity;
                    counts[item.name].total += (item.price * item.quantity);
                });
            }
        });
        return Object.entries(counts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 4)
            .map(([name, data]) => ({ name, ...data }));
    }, [todayReports]);

    const [now, setNow] = React.useState(new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const pendingOrders = todayReports.filter(r => r.notes === 'PENDIENTE');
    const recentPaidOrders = todayReports.filter(r => r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO').slice(0, 5);

    // Leaderboard de Meseros
    const waiterStats = useMemo(() => {
        const stats: Record<string, { sales: number, count: number, pending: number }> = {};
        todayReports.forEach(r => {
            if (!stats[r.waiter]) stats[r.waiter] = { sales: 0, count: 0, pending: 0 };
            if (r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO') {
                stats[r.waiter].sales += r.total;
                stats[r.waiter].count += 1;
            } else if (r.notes === 'PENDIENTE') {
                stats[r.waiter].pending += r.total;
            }
        });
        return Object.entries(stats)
            .sort((a, b) => b[1].sales - a[1].sales)
            .map(([name, data]) => ({ name, ...data }));
    }, [todayReports]);

    return (
        <div className={`h-full flex flex-col relative overflow-hidden ${isBrutalist ? 'bg-[#121212]' : 'bg-gray-50'}`}>
            {/* Esferas de luz fija (solo Brutalist) */}
            {isBrutalist && (
                <>
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-crimson/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                </>
            )}

            {/* Header */}
            <header className={`flex items-center p-6 justify-between sticky top-0 z-50 backdrop-blur-md border-b ${isBrutalist ? 'bg-black/20 border-white/5' : 'bg-white border-gray-100'}`}>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${isBrutalist ? 'text-[--brand-color] border-white/10 bg-white/5' : 'text-gray-400 bg-gray-100 border-gray-200'}`}>
                    <span className="material-symbols-outlined text-2xl">dashboard</span>
                </div>
                <h2 className={`text-lg font-bold leading-tight tracking-tight flex-1 text-center ${isBrutalist ? 'text-white' : 'text-gray-900'}`}>Dashboard Analytics</h2>
                <div className="flex w-10 items-center justify-end">
                    <button onClick={() => onGoToView('menu')} className={`flex size-10 items-center justify-center rounded-xl border active:scale-95 transition-all ${isBrutalist ? 'bg-white/5 text-[--accent-color] border-white/10' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
                {/* Summary Cards */}
                <div className="flex overflow-x-auto gap-4 p-6 no-scrollbar">
                    {/* Total Sales */}
                    <div className={`flex min-w-[180px] flex-1 flex-col gap-3 rounded-2xl p-5 shadow-2xl relative overflow-hidden border-l-4 ${isBrutalist ? 'bg-white/[0.03] border-white/10 border-l-[--brand-color] backdrop-blur-xl' : 'bg-white border-blue-500'}`}>
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${isBrutalist ? 'text-[--brand-color]' : 'text-blue-500'}`}>payments</span>
                            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-[0.2em]">Total Cobrado</p>
                        </div>
                        <p className={`tracking-tighter text-2xl font-bold leading-none ${isBrutalist ? 'text-white' : 'text-black'}`}>${stats.paid.toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-green-400 text-xs">trending_up</span>
                            <p className="text-green-400 text-[10px] font-bold">+{stats.trend}%</p>
                        </div>
                    </div>

                    {/* Pending Sales */}
                    <div className={`flex min-w-[180px] flex-1 flex-col gap-3 rounded-2xl p-5 shadow-2xl relative overflow-hidden border-l-4 ${isBrutalist ? 'bg-white/[0.03] border-white/10 border-l-[--accent-color] backdrop-blur-xl' : 'bg-white border-amber-500'}`}>
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${isBrutalist ? 'text-[--accent-color]' : 'text-amber-500'}`}>table_restaurant</span>
                            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-[0.2em]">Por Cobrar</p>
                        </div>
                        <p className={`tracking-tighter text-2xl font-bold leading-none ${isBrutalist ? 'text-white' : 'text-black'}`}>${stats.pending.toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[--accent-color] text-xs animate-pulse">sync</span>
                            <p className="text-[--accent-color] text-[10px] font-bold">Live</p>
                        </div>
                    </div>

                    {/* Avg Ticket */}
                    <div className={`flex min-w-[180px] flex-1 flex-col gap-3 rounded-2xl p-5 shadow-2xl relative overflow-hidden border-l-4 ${isBrutalist ? 'bg-white/[0.03] border-white/10 border-l-indigo-500 backdrop-blur-xl' : 'bg-white border-indigo-500'}`}>
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${isBrutalist ? 'text-indigo-400' : 'text-indigo-500'}`}>confirmation_number</span>
                            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-[0.2em]">Ticket Promedio</p>
                        </div>
                        <p className={`tracking-tighter text-2xl font-bold leading-none ${isBrutalist ? 'text-white' : 'text-black'}`}>${stats.avgTicket.toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-indigo-400 text-xs text-xs">analytics</span>
                            <p className="text-indigo-400 text-[10px] font-bold">Analytics</p>
                        </div>
                    </div>
                </div>

                {/* Sales Velocity Chart */}
                <div className="px-6 pb-6">
                    <div className={`rounded-3xl p-6 overflow-hidden border relative ${isBrutalist ? 'bg-white/[0.02] border-white/5 backdrop-blur-md shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className={`text-lg font-bold tracking-tight ${isBrutalist ? 'text-white' : 'text-gray-900'}`}>Velocidad de Ventas</h3>
                                <p className="text-gray-400 text-[10px] uppercase font-semibold tracking-widest mt-1">Rendimiento en Tiempo Real</p>
                            </div>
                            <div className="text-right">
                                <p className={`text-2xl font-bold ${isBrutalist ? 'text-white' : 'text-black'}`}>${(stats.paid / 4).toFixed(2)}/h</p>
                                <p className="text-[10px] text-[--brand-color] font-bold uppercase tracking-widest">Peak: 8:30 PM</p>
                            </div>
                        </div>
                        <div className="relative h-48 w-full mt-4">
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 150">
                                <defs>
                                    <linearGradient id="crimsonGradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#dc2626" stopOpacity="0.4"></stop>
                                        <stop offset="100%" stopColor="#dc2626" stopOpacity="0.0"></stop>
                                    </linearGradient>
                                </defs>
                                <path d="M0,150 L0,110 C40,90 60,130 100,80 C140,30 180,60 220,20 C260,10 300,50 340,40 C380,30 400,0 400,0 L400,150 Z" fill="url(#crimsonGradient)"></path>
                                <path d="M0,110 C40,90 60,130 100,80 C140,30 180,60 220,20 C260,10 300,50 340,40 C380,30 400,0 400,0" fill="none" stroke={isBrutalist ? "#DC143C" : "#dc2626"} strokeLinecap="round" strokeWidth="3"></path>
                            </svg>
                            <div className="flex justify-between mt-6 border-t border-white/5 pt-3">
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">12pm</span>
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">4pm</span>
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">8pm</span>
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Now</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Radar de Comandas (Active Tables) - Visual Refinement */}
                <div className="px-6 pb-6">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className={`text-lg font-bold tracking-tight ${isBrutalist ? 'text-white' : 'text-gray-900'}`}>Radar de Comandas</h3>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${isBrutalist ? 'bg-[--accent-color]/10 text-[--accent-color]' : 'bg-amber-100 text-amber-600'}`}>{pendingOrders.length} ABIERTAS</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {pendingOrders.length === 0 ? (
                            <div className={`col-span-full py-12 flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed ${isBrutalist ? 'border-white/10 text-white/20' : 'border-gray-200 text-gray-400'}`}>
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">dining</span>
                                <p className="text-xs italic">No hay mesas activas en este momento</p>
                            </div>
                        ) : (
                            pendingOrders.map(order => (
                                <div key={order.id} className={`group relative rounded-[2.5rem] p-5 border transition-all active:scale-[0.98] cursor-pointer shadow-xl ${isBrutalist ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/20' : 'bg-white border-gray-100'}`}
                                    onClick={() => onEditOrder(order, 'menu')}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[--brand-color]/20 to-[--brand-color]/5 flex items-center justify-center">
                                                <span className={`material-symbols-outlined text-xl ${isBrutalist ? 'text-[--brand-color]' : 'text-red-600'}`}>table_restaurant</span>
                                            </div>
                                            <div>
                                                <h4 className={`font-bold leading-none ${isBrutalist ? 'text-white' : 'text-black'}`}>{order.customerName || `Mesa ${order.tableNumber}`}</h4>
                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{order.waiter}</p>
                                            </div>
                                        </div>
                                        <p className={`text-lg font-black tracking-tight ${isBrutalist ? 'text-white' : 'text-black'}`}>${order.total.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex -space-x-1.5 overflow-hidden">
                                            {order.order.slice(0, 3).map((item: any, i) => (
                                                <div key={i} className="size-5 rounded-full bg-white/10 border-2 border-[#121212] flex items-center justify-center">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.isServed ? 'bg-purple-500' : (Object.values(item.kitchenStatus || {}).includes('ready') ? 'bg-green-500' : 'bg-amber-500')}`}></div>
                                                </div>
                                            ))}
                                            {order.order.length > 3 && <div className="size-5 rounded-full bg-white/5 border-2 border-[#121212] flex items-center justify-center text-[7px] font-bold text-white/40">+{order.order.length - 3}</div>}
                                        </div>
                                        <span className="text-[9px] font-bold text-[--accent-color] uppercase tracking-[0.2em]">{order.time}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Most Sold Products */}
                <div className="px-6 pb-6 mt-4">
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className={`text-lg font-bold tracking-tighter ${isBrutalist ? 'text-white' : 'text-gray-900'}`}>Éxitos del Día</h3>
                        <button className="text-[--brand-color] text-[10px] font-bold uppercase tracking-[0.2em]">Ver Todo</button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {topProducts.map((p, idx) => (
                            <div key={p.name} className={`rounded-2xl p-4 border flex flex-col gap-3 relative overflow-hidden transition-all hover:translate-x-1 ${isBrutalist ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black h-5 w-5 rounded-md flex items-center justify-center ${idx === 0 ? 'bg-[--accent-color] text-black' : 'bg-white/5 text-white/40'}`}>{idx + 1}</span>
                                        <span className={`text-sm font-semibold tracking-tight ${isBrutalist ? 'text-white' : 'text-gray-800'}`}>{p.name}</span>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isBrutalist ? 'text-[--brand-color]' : 'text-red-500'}`}>{p.count} ORD</span>
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                                    <div className={`h-full bg-gradient-to-r from-[--brand-color]/60 to-[--brand-color] rounded-full transition-all duration-1000`}
                                        style={{ width: `${(p.count / topProducts[0].count) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Waiter Leaderboard */}
                <div className="px-6 pb-12 mt-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className={`text-lg font-bold tracking-tight ${isBrutalist ? 'text-white' : 'text-gray-900'}`}>Rendimiento Meseros</h3>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Efficiency Metrics</span>
                    </div>
                    <div className="space-y-4">
                        {waiterStats.map((w, idx) => (
                            <div key={w.name} className={`bg-white/[0.01] border border-white/5 p-5 rounded-[2.5rem] flex flex-col gap-4 relative overflow-hidden`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className={`size-12 rounded-full flex items-center justify-center font-black text-lg border-2 shadow-xl ${idx === 0 ? 'border-[--brand-color] bg-[--brand-color]/10 text-[--brand-color]' : 'border-white/10 bg-white/5 text-white/30'}`}>
                                                {w.name.charAt(0)}
                                            </div>
                                            <div className={`absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-[#121212] ${idx === 0 ? 'bg-[--accent-color] text-black' : 'bg-white/20 text-white'}`}>{idx + 1}</div>
                                        </div>
                                        <div>
                                            <p className={`font-bold tracking-tight leading-none mb-1 ${isBrutalist ? 'text-white' : 'text-black'}`}>{w.name}</p>
                                            <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">${w.sales.toFixed(2)} Cobrado</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black text-sm tracking-tighter ${isBrutalist ? 'text-white' : 'text-black'}`}>98%</p>
                                        <p className="text-[--brand-color] text-[8px] font-black uppercase tracking-[0.2em]">EFICACIA</p>
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className={`h-full bg-gradient-to-r from-crimson-start via-orange-400 to-amber-500 w-[98%] rounded-full`}></div>
                                </div>
                                {w.pending > 0 && (
                                    <div className="flex justify-between items-center opacity-60">
                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">En mesas abiertas</span>
                                        <span className="text-[10px] font-black text-[--accent-color] tracking-tighter">${w.pending.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Navigation Space for App.tsx Nav */}
            <div className="h-20 shrink-0"></div>
        </div>
    );
};

export default AdminDashboard;
