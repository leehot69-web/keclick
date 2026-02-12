
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
    expenses?: any[];
    injections?: any[];
    onAddExpense?: (amount: number, description: string, category: string) => void;
    onAddInjection?: (amount: number, description: string) => void;
    dayClosures?: any[];
    onStartNewDay?: () => void;
}

const safeNum = (val: any) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
};

const DayClosureModal: React.FC<{
    reports: SaleRecord[];
    settings: AppSettings;
    onClose: () => void;
    onStartNewDay: () => void;
}> = ({ reports, settings, onClose, onStartNewDay }) => {
    const exchangeRate = settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel;
    const today = new Date().toISOString().split('T')[0];

    // Filter reports for today to calculate closure totals
    const filteredReports = reports.filter(r => {
        if (!r) return false;
        const reportDate = (r.date || '').split('T')[0].trim();
        return reportDate === today;
    });

    const totalPaid = filteredReports.reduce((acc, r) => {
        const total = safeNum(r.total);
        if (r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO' && !r.closed) {
            return acc + (r.type === 'refund' ? -total : total);
        }
        return acc;
    }, 0);

    const totalPending = filteredReports.reduce((acc, r) => {
        const total = safeNum(r.total);
        return r.notes === 'PENDIENTE' ? acc + total : acc;
    }, 0);

    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9000] p-4 backdrop-blur-md overflow-y-auto">
            <div className="bg-[#111] border border-[#FFD700]/30 rounded-3xl w-full max-w-md shadow-2xl p-6 my-auto text-white relative">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black uppercase text-[#FFD700] tracking-tighter">Confirmar Cierre</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-[#FFD700]/20">
                        <p className="text-[10px] font-black text-[#FFD700] uppercase mb-1 tracking-widest">Caja (USD)</p>
                        <div className="flex justify-between items-end">
                            <p className="text-3xl font-black text-white tracking-tighter">${totalPaid.toFixed(2)}</p>
                            <p className="text-sm font-bold text-white/40 font-mono">Bs. {(totalPaid * exchangeRate).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-black text-white/40 uppercase mb-1 tracking-widest">Pendiente</p>
                        <div className="flex justify-between items-end">
                            <p className="text-3xl font-black text-white/60 tracking-tighter">${totalPending.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-8 space-y-3">
                    <button onClick={() => { onStartNewDay(); onClose(); }} className="w-full py-4 bg-[#FFD700] text-black font-black rounded-2xl shadow-lg uppercase tracking-widest active:scale-95 transition-all text-sm">Finalizar Turno</button>
                    <button onClick={onClose} className="w-full py-3 text-white/20 font-bold uppercase tracking-widest text-[10px]">Volver</button>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard: React.FC<AdminDashboardProps & { theme?: string }> = ({
    reports,
    settings,
    onGoToView,
    onEditOrder,
    onVoidOrder,
    onReprintOrder,
    isPrinterConnected,
    forceRenderCount = 0,
    theme = 'keclick',
    expenses = [],
    injections = [],
    onAddExpense,
    onAddInjection,
    dayClosures = [],
    onStartNewDay
}) => {
    const isBrutalist = theme === 'brutalist';
    const activeRate = settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel;
    const today = new Date().toISOString().split('T')[0];

    const [showClosureModal, setShowClosureModal] = React.useState(false);
    const [showClosuresHistory, setShowClosuresHistory] = React.useState(false);

    // Datos del día
    const todayReports = useMemo(() => reports.filter(r => r.date === today), [reports, today, forceRenderCount]);

    const todayExpenses = useMemo(() => (expenses || []).filter(e => e.date === today), [expenses, today, forceRenderCount]);
    const todayInjections = useMemo(() => (injections || []).filter(i => i.date === today), [injections, today, forceRenderCount]);

    const stats = useMemo(() => {
        const paymentBreakdown: Record<string, { amount: number, count: number }> = {};

        const paid = todayReports.reduce((acc, r) => {
            if (r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO') {
                // Normalizar nombre del método de pago (quitar " (LIBERADA)" si existe para agrupar)
                const rawMethod = r.notes || 'Otros';
                const method = rawMethod.replace(' (LIBERADA)', '');

                if (!paymentBreakdown[method]) paymentBreakdown[method] = { amount: 0, count: 0 };
                paymentBreakdown[method].amount += r.total;
                paymentBreakdown[method].count += 1;

                return r.type === 'refund' ? acc - r.total : acc + r.total;
            }
            return acc;
        }, 0);
        const pending = todayReports.reduce((acc, r) => r.notes === 'PENDIENTE' ? acc + r.total : acc, 0);
        const count = todayReports.filter(r => r.notes !== 'ANULADO').length;

        const avgTicket = count > 0 ? paid / count : 0;
        const totalExpenses = todayExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
        const totalInjections = todayInjections.reduce((acc, i) => acc + Number(i.amount), 0);
        const netCash = paid + totalInjections - totalExpenses;

        return { paid, pending, count, avgTicket, totalExpenses, totalInjections, netCash, paymentBreakdown };
    }, [todayReports, todayExpenses, todayInjections]);

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
    const [showAuditModal, setShowAuditModal] = React.useState(false);
    const [auditType, setAuditType] = React.useState<'expense' | 'injection'>('expense');
    const [auditAmount, setAuditAmount] = React.useState('');
    const [auditDesc, setAuditDesc] = React.useState('');

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

            {showClosureModal && onStartNewDay && (
                <DayClosureModal
                    reports={reports}
                    settings={settings}
                    onClose={() => setShowClosureModal(false)}
                    onStartNewDay={onStartNewDay}
                />
            )}

            {showClosuresHistory && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[10000] flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-8 shrink-0">
                            <div>
                                <h3 className="text-xl font-black uppercase text-white tracking-tighter italic">Historial de Cierres</h3>
                                <p className="text-[9px] font-black text-[#A855F7] uppercase tracking-[0.2em]">{dayClosures.length} Registros</p>
                            </div>
                            <button onClick={() => setShowClosuresHistory(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/20 active:scale-95 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto scrollbar-hide pr-1">
                            {dayClosures.length > 0 ? (
                                dayClosures.map((closure) => (
                                    <div key={closure.id} className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">{new Date(closure.closedAt || closure.date).toLocaleDateString()}</p>
                                                <p className="text-white/60 text-[11px] font-bold">Cerrado por: <span className="text-white">{closure.closedBy}</span></p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-[#0bda19] tracking-tighter">${safeNum(closure.totalPaid).toFixed(2)}</p>
                                                <p className="text-[9px] font-bold text-white/20 font-mono">Bs. {(safeNum(closure.totalPaid) * activeRate).toFixed(0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center">
                                    <span className="material-symbols-outlined text-4xl text-white/5 mb-2">receipt_long</span>
                                    <p className="text-white/20 text-xs font-bold uppercase italic tracking-widest">No hay cierres registrados</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 shrink-0">
                            <button onClick={() => setShowClosuresHistory(false)} className="w-full py-4 text-white/20 font-black uppercase text-[10px] tracking-[0.3em] bg-white/5 rounded-xl active:bg-white/10 transition-colors">Volver</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className={`flex items-center p-6 justify-between sticky top-0 z-50 backdrop-blur-md border-b ${isBrutalist ? 'bg-black/20 border-white/5' : 'bg-white border-gray-100'}`}>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${isBrutalist ? 'text-[--brand-color] border-white/10 bg-white/5' : 'text-gray-400 bg-gray-100 border-gray-200'}`}>
                    <span className="material-symbols-outlined text-2xl">dashboard</span>
                </div>
                <h2 className={`text-lg font-bold leading-tight tracking-tight flex-1 text-center ${isBrutalist ? 'text-white' : 'text-gray-900'}`}>Analytics</h2>

                {/* Closure Controls added here */}
                <div className="flex items-center gap-2 mr-2">
                    <button
                        onClick={() => setShowClosureModal(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0bda19] text-black active:scale-95 transition-all shadow-lg"
                        title="Cerrar Caja"
                    >
                        <span className="material-symbols-outlined text-xl font-bold">point_of_sale</span>
                    </button>
                    <button
                        onClick={() => setShowClosuresHistory(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/30 active:scale-95 transition-all"
                        title="Historial de Cierres"
                    >
                        <span className="material-symbols-outlined text-xl">receipt_long</span>
                    </button>
                </div>

                <div className="flex w-10 items-center justify-end">
                    <button onClick={() => onGoToView('menu')} className={`flex size-10 items-center justify-center rounded-xl border active:scale-95 transition-all ${isBrutalist ? 'bg-white/5 text-[--accent-color] border-white/10' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
                {/* Summary Cards */}
                <div className="flex overflow-x-auto gap-4 p-6 no-scrollbar">
                    {/* Net Cash */}
                    <div className={`flex min-w-[220px] flex-1 flex-col gap-3 rounded-3xl p-6 shadow-2xl relative overflow-hidden border-l-4 ${isBrutalist ? 'bg-[#FFD700] text-black' : 'bg-green-600 text-white'}`}>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm opacity-50">account_balance_wallet</span>
                            <p className="opacity-50 text-[10px] font-black uppercase tracking-[0.2em]">Balance de Caja</p>
                        </div>
                        <p className="tracking-tighter text-3xl font-black leading-none">${stats.netCash.toFixed(2)}</p>
                        <div className="flex gap-2 mb-2">
                            <span className="text-[9px] font-bold opacity-60">-${stats.totalExpenses.toFixed(0)} Gastos</span>
                            <span className="text-[9px] font-bold opacity-60">+${stats.totalInjections.toFixed(0)} Ingr.</span>
                        </div>
                        <div className="mt-auto grid grid-cols-2 gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setAuditType('injection'); setShowAuditModal(true); }}
                                className="py-1.5 bg-black/10 rounded-lg text-[9px] font-black uppercase tracking-widest border border-black/5 active:scale-95 transition-all"
                            >
                                + Ingre.
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setAuditType('expense'); setShowAuditModal(true); }}
                                className="py-1.5 bg-black/10 rounded-lg text-[9px] font-black uppercase tracking-widest border border-black/5 active:scale-95 transition-all"
                            >
                                - Gasto
                            </button>
                        </div>
                    </div>

                    {/* Total Sales */}
                    <div className={`flex min-w-[180px] flex-1 flex-col gap-3 rounded-2xl p-5 shadow-2xl relative overflow-hidden border-l-4 ${isBrutalist ? 'bg-white/[0.03] border-white/10 border-l-[--brand-color] backdrop-blur-xl' : 'bg-white border-blue-500'}`}>
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${isBrutalist ? 'text-[--brand-color]' : 'text-blue-500'}`}>payments</span>
                            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-[0.2em]">Ventas Totales</p>
                        </div>
                        <p className={`tracking-tighter text-2xl font-bold leading-none ${isBrutalist ? 'text-white' : 'text-black'}`}>${stats.paid.toFixed(2)}</p>
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

                {/* Payment Methods Breakdown */}
                <div className="px-6 pb-6 mt-4">
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className={`text-lg font-bold tracking-tighter ${isBrutalist ? 'text-white' : 'text-gray-900'}`}>Distribución de Ingresos</h3>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Por Método de Pago</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(stats.paymentBreakdown).map(([method, data]) => {
                            const d = data as { amount: number, count: number };
                            return (
                                <div key={method} className={`rounded-[2rem] p-5 border flex flex-col gap-2 relative overflow-hidden transition-all hover:translate-y-[-2px] ${isBrutalist ? 'bg-white/[0.03] border-white/5 shadow-2xl' : 'bg-white border-gray-100 shadow-lg'}`}>
                                    <div className="flex justify-between items-start">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isBrutalist ? 'text-white/40' : 'text-gray-400'}`}>{method}</span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isBrutalist ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'}`}>{d.count}</span>
                                    </div>
                                    <p className={`text-xl font-black tracking-tight ${isBrutalist ? 'text-white' : 'text-black'}`}>${d.amount.toFixed(2)}</p>
                                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1">
                                        <div className={`h-full bg-gradient-to-r from-[--brand-color] to-[--accent-color] rounded-full`}
                                            style={{ width: `${(d.amount / stats.paid) * 100}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
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

                {/* Audit Movements */}
                {(todayExpenses.length > 0 || todayInjections.length > 0) && (
                    <div className="px-6 pb-6 mt-4">
                        <div className="flex items-center justify-between mb-5 px-1">
                            <h3 className={`text-lg font-bold tracking-tighter ${isBrutalist ? 'text-white' : 'text-gray-900'}`}>Auditoría de Movimientos</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            {[...todayExpenses, ...todayInjections]
                                .sort((a, b) => b.time.localeCompare(a.time))
                                .slice(0, 5)
                                .map((mov, idx) => (
                                    <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between ${isBrutalist ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined text-lg ${'category' in mov ? 'text-red-500' : 'text-green-500'}`}>
                                                {'category' in mov ? 'do_not_disturb_on' : 'add_circle'}
                                            </span>
                                            <div>
                                                <p className={`text-xs font-bold ${isBrutalist ? 'text-white' : 'text-black'}`}>{mov.description}</p>
                                                <p className="text-[9px] text-white/30 uppercase font-black">{mov.user} • {mov.time}</p>
                                            </div>
                                        </div>
                                        <p className={`font-black text-sm ${'category' in mov ? 'text-red-500' : 'text-green-500'}`}>
                                            {'category' in mov ? '-' : '+'}${Number(mov.amount).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

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
            {/* Audit Modal */}
            {showAuditModal && (
                <div className="fixed inset-0 bg-black/98 backdrop-blur-xl z-[9000] flex items-center justify-center p-6">
                    <div className={`w-full max-w-sm rounded-[2.5rem] border p-8 shadow-2xl relative overflow-hidden ${isBrutalist ? 'bg-[#111] border-white/10' : 'bg-white border-gray-100'}`}>
                        <div className="flex justify-between items-center mb-8">
                            <h3 className={`text-xl font-black uppercase tracking-tighter italic ${isBrutalist ? 'text-[--brand-color]' : 'text-red-600'}`}>
                                {auditType === 'expense' ? 'Registrar Gasto' : 'Inyectar Capital'}
                            </h3>
                            <button onClick={() => setShowAuditModal(false)} className="text-white/20"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Monto (USD)</label>
                                <input
                                    type="number"
                                    value={auditAmount}
                                    onChange={e => setAuditAmount(e.target.value)}
                                    className={`w-full p-5 rounded-2xl outline-none text-2xl font-black transition-all ${isBrutalist ? 'bg-white/5 border-white/5 text-white focus:border-[--brand-color]/30' : 'bg-gray-50 border-gray-100 text-black'}`}
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Descripción / Razón</label>
                                <textarea
                                    value={auditDesc}
                                    onChange={e => setAuditDesc(e.target.value)}
                                    className={`w-full p-5 rounded-2xl outline-none text-sm font-bold min-h-[100px] transition-all resize-none ${isBrutalist ? 'bg-white/5 border-white/5 text-white focus:border-[--brand-color]/30' : 'bg-gray-50 border-gray-100 text-black'}`}
                                    placeholder="Ej: Pago de hielo, transporte, base..."
                                />
                            </div>
                        </div>

                        <div className="mt-10 grid grid-cols-2 gap-4">
                            <button onClick={() => setShowAuditModal(false)} className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isBrutalist ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400'}`}>
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const amount = parseFloat(auditAmount);
                                    if (amount > 0 && auditDesc) {
                                        if (auditType === 'expense') onAddExpense?.(amount, auditDesc, 'General');
                                        else onAddInjection?.(amount, auditDesc);
                                        setAuditAmount('');
                                        setAuditDesc('');
                                        setShowAuditModal(false);
                                    }
                                }}
                                className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95 ${isBrutalist ? 'bg-gradient-to-br from-[--brand-color] to-[--accent-color] text-white' : 'bg-red-600 text-white'}`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
