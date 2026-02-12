
import React, { useMemo } from 'react';
import { SaleRecord, AppSettings, View } from '../types';

interface AdminDashboardProps {
    reports: SaleRecord[];
    settings: AppSettings;
    onGoToView: (view: View) => void;
    onEditOrder: (report: SaleRecord, targetView?: View) => void;
    onVoidOrder: (reportId: string) => void;
    onReprintOrder: (sale: SaleRecord | { id: string, isZReport: boolean, rawCommands: string }) => void;
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
    const [activeTab, setActiveTab] = React.useState('COBRANZA');

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

    const handlePrintZReport = (shouldCloseDay: boolean = false) => {
        // Generate Z Report Data
        const commands = isPrinterConnected ? (
            `\x1B\x40` + // Initialize
            `\x1B\x61\x01` + // Center align
            `\x1B\x45\x01${settings.businessName}\x1B\x45\x00\n` +
            `\x1D\x21\x01REPORTE Z\x1D\x21\x00\n` +
            `\x1B\x61\x00` + // Left align
            `--------------------------------\n` +
            `FECHA: ${new Date().toLocaleDateString()}\n` +
            `HORA: ${new Date().toLocaleTimeString()}\n` +
            `--------------------------------\n` +
            `\x1B\x45\x01RESUMEN DE CAJA\x1B\x45\x00\n` +
            `VENTAS TOTALES: $${stats.paid.toFixed(2)}\n` +
            `(Bs. ${(stats.paid * activeRate).toFixed(2)})\n` +
            `TICKET PROMEDIO: $${stats.avgTicket.toFixed(2)}\n` +
            `TRANSACCIONES: ${stats.count}\n` +
            `ANULADOS: ${todayReports.filter(r => r.notes === 'ANULADO').length}\n` +
            `\n` +
            `\x1B\x45\x01DESGLOSE POR PAGO\x1B\x45\x00\n` +
            Object.entries(stats.paymentBreakdown).map(([method, data]) =>
                `${method.padEnd(15)}: $${(data as any).amount.toFixed(2)}`
            ).join('\n') + `\n` +
            `\n` +
            `--------------------------------\n` +
            `\x1B\x45\x01MOVIMIENTOS DE CAJA\x1B\x45\x00\n` +
            `(+) INYECCIONES: $${stats.totalInjections.toFixed(2)}\n` +
            `(-) GASTOS: $${stats.totalExpenses.toFixed(2)}\n` +
            `================================\n` +
            `\x1D\x21\x11EFECTIVO NETO: $${stats.netCash.toFixed(2)}\x1D\x21\x00\n` +
            `================================\n` +
            `\n` +
            `\x1B\x45\x01TOP PRODUCTOS\x1B\x45\x00\n` +
            topProducts.map(p => `${p.name.substring(0, 20).padEnd(20)} ${p.count}x`).join('\n') + `\n` +
            `\n` +
            `\x1B\x45\x01MESEROS\x1B\x45\x00\n` +
            waiterStats.map(w => `${w.name.padEnd(15)} $${w.sales.toFixed(2)}`).join('\n') + `\n` +
            `\n\n\n\n\x1D\x56\x00` // Cut paper
        ) : null;

        if (isPrinterConnected && commands) {
            onReprintOrder({ ...reports[0], id: 'Z-REPORT', isZReport: true, rawCommands: commands } as any);
        } else {
            // PDF / Browser Print Logic using the main ReceiptPrinter
            const htmlContent = `
                <div class="text-center font-bold mb-4">
                    <div class="text-xl uppercase border-b-2 border-black pb-2 mb-2">${settings.businessName}</div>
                    <div class="italic underline">REPORTE Z</div>
                </div>
                
                <div class="flex justify-between text-xs mb-1">
                    <span>FECHA: ${new Date().toLocaleDateString()}</span>
                    <span>HORA: ${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="border-b border-black mb-4"></div>

                <div class="mb-4">
                    <div class="font-bold bg-gray-100 uppercase p-1 mb-2 text-center text-[10px]">Resumen de Caja</div>
                    <div class="flex justify-between text-xs mb-1"><span>Ventas Totales:</span><span class="font-bold">$${stats.paid.toFixed(2)}</span></div>
                    <div class="flex justify-between text-[10px] text-gray-500 mb-1"><span>(En Bolívares):</span><span>Bs. ${(stats.paid * activeRate).toFixed(2)}</span></div>
                    <div class="flex justify-between text-xs mb-1"><span>Ticket Promedio:</span><span>$${stats.avgTicket.toFixed(2)}</span></div>
                    <div class="flex justify-between text-xs mb-1"><span>Transacciones:</span><span>${stats.count}</span></div>
                    <div class="flex justify-between text-xs mb-1"><span>Anulados:</span><span>${todayReports.filter(r => r.notes === 'ANULADO').length}</span></div>
                </div>

                <div class="mb-4">
                    <div class="font-bold bg-gray-100 uppercase p-1 mb-2 text-center text-[10px]">Desglose por Pago</div>
                    ${Object.entries(stats.paymentBreakdown).map(([method, data]) => `
                        <div class="flex justify-between text-xs mb-1">
                            <span>${method}:</span>
                            <span class="font-bold">$${(data as any).amount.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="mb-4 border-t border-black pt-2">
                    <div class="font-bold uppercase mb-2 text-[10px]">Movimientos de Caja</div>
                    <div class="flex justify-between text-xs mb-1 text-green-600"><span>(+) Inyecciones:</span><span>$${stats.totalInjections.toFixed(2)}</span></div>
                    <div class="flex justify-between text-xs mb-1 text-red-600"><span>(-) Gastos:</span><span>$${stats.totalExpenses.toFixed(2)}</span></div>
                </div>

                <div class="border-y-2 border-black py-2 mb-6">
                    <div class="flex justify-between text-lg font-black uppercase">
                        <span>Efectivo Neto:</span>
                        <span>$${stats.netCash.toFixed(2)}</span>
                    </div>
                </div>

                <div class="mb-4">
                    <div class="font-bold bg-gray-100 uppercase p-1 mb-2 text-center text-[10px]">Top Productos</div>
                    ${topProducts.map(p => `
                        <div class="flex justify-between text-xs mb-1">
                            <span>${p.name.substring(0, 20)} (${p.count})</span>
                            <span>$${p.total.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="mb-8">
                    <div class="font-bold bg-gray-100 uppercase p-1 mb-2 text-center text-[10px]">Meseros</div>
                    ${waiterStats.map(w => `
                        <div class="flex justify-between text-xs mb-1">
                            <span>${w.name}:</span>
                            <span>$${w.sales.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="text-center text-[10px] text-gray-400 mt-8">Generado por KECLICK SYSTEM</div>
            `;

            // Send to main app printer
            onReprintOrder({ rawHtml: htmlContent } as any);
        }

        if (shouldCloseDay && onStartNewDay) {
            setTimeout(() => {
                onStartNewDay();
            }, 1000);
        }
    };

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
                    onStartNewDay={() => handlePrintZReport(true)}
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
                        onClick={() => handlePrintZReport(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white active:scale-95 transition-all shadow-lg"
                        title="Imprimir Reporte Z"
                    >
                        <span className="material-symbols-outlined text-xl font-bold">print</span>
                    </button>
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
            </header >

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
                {/* Summary Cards */}
                {/* New Top Summary - Clean Rectangular Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                    {/* Global Effectiveness (Mock for now, using paid count vs total) */}
                    <div className="bg-white border-2 border-blue-500 rounded p-4 flex flex-col justify-between h-24 relative overflow-hidden group hover:shadow-lg transition-all">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efectividad Global</p>
                        <p className="text-3xl font-black text-blue-600 tracking-tighter">
                            {stats.count > 0 ? Math.round((stats.paid / (stats.paid + stats.pending || 1)) * 100) : 0}%
                        </p>
                        <div className="w-full h-1 bg-gray-100 mt-2">
                            <div className="h-full bg-blue-500" style={{ width: `${stats.count > 0 ? Math.round((stats.paid / (stats.paid + stats.pending || 1)) * 100) : 0}%` }}></div>
                        </div>
                    </div>

                    {/* Total Supplies (Using Expenses) */}
                    <div className="bg-white border-2 border-orange-500 rounded p-4 flex flex-col justify-between h-24 hover:shadow-lg transition-all">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Gastos</p>
                        <p className="text-3xl font-black text-gray-800 tracking-tighter">${stats.totalExpenses.toFixed(2)}</p>
                        <div className="flex justify-between items-center mt-1">
                            <button onClick={() => { setAuditType('expense'); setShowAuditModal(true); }} className="text-[9px] font-bold text-orange-500 hover:underline uppercase">+ Registrar Gasto</button>
                        </div>
                    </div>

                    {/* Total Collected (Net Cash) */}
                    <div className="bg-white border-2 border-[#0bda19] rounded p-4 flex flex-col justify-between h-24 hover:shadow-lg transition-all">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Cobrado (Caja)</p>
                        <p className="text-3xl font-black text-[#0bda19] tracking-tighter">${stats.netCash.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Bs. {(stats.netCash * activeRate).toFixed(2)}</p>
                    </div>

                    {/* Pending/Investment */}
                    <div className="bg-white border-2 border-red-500 rounded p-4 flex flex-col justify-between h-24 hover:shadow-lg transition-all">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Por Cobrar / Pendiente</p>
                        <p className="text-3xl font-black text-red-500 tracking-tighter">${stats.pending.toFixed(2)}</p>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-[9px] font-bold text-red-400 uppercase">{pendingOrders.length} Mesas Activas</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="px-6 flex gap-6 overflow-x-auto border-b border-gray-100 pb-1 mb-6">
                    {['COBRANZA', 'INTELIGENCIA', 'RENTABILIDAD', 'FACTURAS'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${activeTab === tab ? 'text-[#0bda19] border-[#0bda19]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                        >
                            {tab === 'COBRANZA' ? '$ ' : ''}{tab}
                        </button>
                    ))}
                </div>

                {/* VIEW: COBRANZA (General Ledger) */}
                {activeTab === 'COBRANZA' && (
                    <div className="mx-6 mb-12 bg-white rounded-t-lg shadow-sm border border-gray-100 overflow-hidden">
                        {/* Table Header */}
                        <div className="bg-[#0bda19] px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-black uppercase text-sm tracking-widest">Control Interno de Cobranza</h3>
                            <div className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
                                Recaudación: ${stats.paid.toFixed(2)}
                            </div>
                        </div>

                        {/* Table Columns Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                            <div className="col-span-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">#</div>
                            <div className="col-span-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fecha y Hora</div>
                            <div className="col-span-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Sucursal / Mesa</div>
                            <div className="col-span-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Responsable</div>
                            <div className="col-span-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Monto</div>
                            <div className="col-span-1 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Gestión</div>
                        </div>

                        {/* Table Rows (Active Orders + Closed Orders) */}
                        <div className="divide-y divide-gray-100 bg-white">
                            {[...todayReports].sort((a, b) => b.time.localeCompare(a.time)).map((report, idx) => (
                                <div key={report.id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-blue-50/30 ${report.notes === 'ANULADO' ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
                                    {/* Index */}
                                    <div className="col-span-1">
                                        <span className="bg-gray-100 text-gray-500 font-bold text-[10px] px-2 py-1 rounded-md">
                                            {idx + 1}
                                        </span>
                                    </div>

                                    {/* Date/Time */}
                                    <div className="col-span-3 flex flex-col">
                                        <span className="text-xs font-bold text-gray-800">{report.time}</span>
                                        <span className="text-[10px] text-gray-400 font-mono">{report.date}</span>
                                    </div>

                                    {/* Branch/Table */}
                                    <div className="col-span-3">
                                        <p className="text-xs font-black text-gray-800 uppercase truncate">{report.customerName || `Mesa ${report.tableNumber}`}</p>
                                        <p className="text-[9px] text-gray-400 uppercase">{settings.businessName || 'Sucursal Principal'}</p>
                                    </div>

                                    {/* Responsible */}
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${report.notes === 'PENDIENTE' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                            {(report.waiter || 'A').charAt(0)}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-600 uppercase truncate">{report.waiter || 'Admin'}</span>
                                    </div>

                                    {/* Amount */}
                                    <div className="col-span-2 text-right">
                                        <p className={`text-sm font-black tracking-tight ${report.notes === 'PENDIENTE' ? 'text-amber-500' : (report.notes === 'ANULADO' ? 'text-gray-400 line-through' : 'text-[#0bda19]')}`}>
                                            ${report.total.toFixed(2)}
                                        </p>
                                        <span className="text-[9px] uppercase font-bold text-gray-300">{report.notes === 'PENDIENTE' ? 'Pendiente' : report.notes}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex justify-center gap-2">
                                        <button
                                            onClick={() => onEditOrder(report, 'menu')}
                                            title="Ver detalles"
                                            className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">search</span>
                                        </button>
                                        <button
                                            onClick={() => onReprintOrder(report)}
                                            title="Imprimir"
                                            className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">print</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                const textText = `Hola *${report.customerName}*! 🧾\nAquí está tu recibo de *${settings.businessName}*:\n\nTotal: *$${report.total.toFixed(2)}*\nFecha: ${report.date}\nHora: ${report.time}\n\nGracias por tu compra!`;
                                                const url = `https://wa.me/?text=${encodeURIComponent(textText)}`;
                                                window.open(url, '_blank');
                                            }}
                                            title="Compartir WhatsApp"
                                            className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-green-100 hover:text-green-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">share</span>
                                        </button>
                                        {report.notes !== 'ANULADO' && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("¿Seguro que quieres anular esta orden?")) {
                                                        onVoidOrder(report.id);
                                                    }
                                                }}
                                                title="Anular / Borrar"
                                                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">shield</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {todayReports.length === 0 && (
                            <div className="py-12 text-center bg-white flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">inbox</span>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No hay registros hoy</p>
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW: INTELIGENCIA (Waiters) */}
                {activeTab === 'INTELIGENCIA' && (
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
                )}

                {/* VIEW: RENTABILIDAD (Expenses & Injections) */}
                {activeTab === 'RENTABILIDAD' && (
                    <div className="px-6 pb-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Expenses */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-orange-500">Gastos Registrados</h3>
                                    <button onClick={() => { setAuditType('expense'); setShowAuditModal(true); }} className="text-[10px] font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-200">+ NUEVO</button>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    {todayExpenses && todayExpenses.length > 0 ? (
                                        <div className="divide-y divide-gray-100">
                                            {todayExpenses.map((exp: any, i: number) => (
                                                <div key={i} className="p-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">{exp.description}</p>
                                                        <p className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded inline-block mt-1">{exp.time ? new Date(exp.time).toLocaleTimeString() : 'N/A'}</p>
                                                    </div>
                                                    <p className="text-sm font-black text-orange-500">-${Number(exp.amount).toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-gray-400 text-xs">No hay gastos registrados hoy</div>
                                    )}
                                </div>
                            </div>

                            {/* Injections */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-green-500">Ingresos / Inyecciones</h3>
                                    <button onClick={() => { setAuditType('injection'); setShowAuditModal(true); }} className="text-[10px] font-bold bg-green-100 text-green-600 px-3 py-1 rounded-full hover:bg-green-200">+ NUEVO</button>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    {todayInjections && todayInjections.length > 0 ? (
                                        <div className="divide-y divide-gray-100">
                                            {todayInjections.map((inj: any, i: number) => (
                                                <div key={i} className="p-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">{inj.description}</p>
                                                        <p className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded inline-block mt-1">{inj.time ? new Date(inj.time).toLocaleTimeString() : 'N/A'}</p>
                                                    </div>
                                                    <p className="text-sm font-black text-green-500">+${Number(inj.amount).toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-gray-400 text-xs">No hay inyecciones registradas hoy</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: FACTURAS (Pending vs Paid) */}
                {activeTab === 'FACTURAS' && (
                    <div className="px-6 pb-12">
                        {/* Summary Headers */}
                        <div className="flex gap-4 mb-6">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex-1">
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Por Cobrar</p>
                                <p className="text-2xl font-black text-red-600">${stats.pending.toFixed(2)}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex-1">
                                <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Cobrado</p>
                                <p className="text-2xl font-black text-green-600">${stats.paid.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Detailed Lists */}
                        <div className="space-y-8">
                            {/* Pending Orders */}
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2">Facturas Por Cobrar (Mesas Activas)</h3>
                                {pendingOrders.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {pendingOrders.map(order => (
                                            <div key={order.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                                                <div className="absolute right-0 top-0 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl uppercase tracking-widest">Pendiente</div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-black text-gray-800 uppercase">Mesa {order.tableNumber}</p>
                                                        <p className="text-[10px] text-gray-400">{order.customerName || 'Cliente General'}</p>
                                                    </div>
                                                    <p className="text-xl font-black text-red-500">${order.total?.toFixed(2) || '0.00'}</p>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-gray-400 border-t pt-2 mt-2">
                                                    <span>{new Date(order.startTime).toLocaleTimeString()}</span>
                                                    <span>{order.items?.length || 0} Items</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm italic">No hay facturas por cobrar.</p>
                                )}
                            </div>

                            {/* Paid Orders (Short List) */}
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2">Facturas Cobradas (Últimas 10)</h3>
                                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                    {todayReports.slice(0, 10).map((report) => (
                                        <div key={report.id} className="p-4 border-b border-gray-50 flex justify-between items-center last:border-0 hover:bg-gray-50">
                                            <div>
                                                <p className="font-bold text-gray-700 text-sm">{report.customerName || `Mesa ${report.tableNumber}`}</p>
                                                <p className="text-[10px] text-gray-400">{report.time} - {report.paymentMethod}</p>
                                            </div>
                                            <p className="font-black text-green-500">${report.total.toFixed(2)}</p>
                                        </div>
                                    ))}
                                    {todayReports.length > 10 && (
                                        <div className="p-3 text-center text-[10px] text-gray-400 font-bold uppercase cursor-pointer hover:bg-gray-50">
                                            Ver todas en "Cobranza"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation Space for App.tsx Nav */}
            <div className="h-20 shrink-0"></div>
            {/* Audit Modal */}
            {
                showAuditModal && (
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
                )
            }
        </div >
    );
};

export default AdminDashboard;
