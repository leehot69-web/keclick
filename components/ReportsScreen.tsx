
import React, { useState, useMemo } from 'react';
import { SaleRecord, OrderItem, StoreProfile, AppSettings, CartItem, View, DayClosure, ExpenseRecord, CashInjectionRecord } from '../types';

interface ReportsScreenProps {
    reports: SaleRecord[];
    dayClosures: DayClosure[];
    onGoToTables: () => void;
    onDeleteReports: (idsToDelete: string[]) => boolean;
    storeProfile?: StoreProfile;
    settings?: AppSettings;
    onStartNewDay?: () => void;
    currentWaiter: string;
    onOpenSalesHistory: () => void;
    onReprintSaleRecord: (sale: SaleRecord) => void;
    isPrinterConnected: boolean;
    onEditPendingReport: (report: SaleRecord, targetView?: View) => void;
    onVoidReport: (reportId: string, reason?: string) => void;
    isAdmin: boolean;
    onShowFloorPlan?: () => void;
    forceRenderCount?: number;
    theme?: string;
}

// Helper functions for bulletproof rendering
const safeNum = (val: any) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
};

const safeStr = (val: any) => {
    if (!val) return '';
    return String(val);
};

const DayClosureModal: React.FC<{
    reports: SaleRecord[];
    settings: AppSettings;
    onClose: () => void;
    onStartNewDay: () => void;
    currentWaiter: string;
    isAdmin: boolean;
}> = ({ reports, settings, onClose, onStartNewDay, currentWaiter, isAdmin }) => {
    const exchangeRate = settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel;
    const today = new Date().toISOString().split('T')[0];
    const waiterName = (currentWaiter || '').toLowerCase().trim();

    const filteredReports = (reports || []).filter(r => {
        if (!r) return false;
        const reportDate = (r.date || '').split('T')[0].trim();
        const reportWaiter = (r.waiter || '').toLowerCase().trim();
        const isTargetWaiter = isAdmin ? true : reportWaiter === waiterName;
        return reportDate === today && isTargetWaiter;
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

const ReportsScreen: React.FC<ReportsScreenProps> = ({
    reports, dayClosures, onGoToTables, onDeleteReports, storeProfile, settings,
    onStartNewDay, currentWaiter, onOpenSalesHistory, onReprintSaleRecord,
    isPrinterConnected, onEditPendingReport, onVoidReport, isAdmin, onShowFloorPlan,
    forceRenderCount = 0, theme = 'keclick'
}) => {
    const [activeSale, setActiveSale] = useState<SaleRecord | null>(null);
    const [showClosureModal, setShowClosureModal] = useState(false);
    const [showClosuresHistory, setShowClosuresHistory] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [timeRange, setTimeRange] = useState<'Shift' | 'Today' | 'Week'>('Shift');

    const exchangeRate = settings ? (settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel) : 1;

    // Safe filtering
    const filteredReports = useMemo(() => {
        const safeReports = Array.isArray(reports) ? reports : [];
        const waiterName = (currentWaiter || '').toLowerCase().trim();

        return safeReports.filter(r => {
            if (!r) return false;
            const reportWaiter = (r.waiter || '').toLowerCase().trim();
            const reportDate = (r.date || '').split('T')[0].trim();
            const isTargetWaiter = isAdmin ? true : reportWaiter === waiterName;

            if (timeRange === 'Today') return isTargetWaiter && reportDate === selectedDate;
            if (timeRange === 'Shift') return isTargetWaiter && reportDate === selectedDate && !r.closed;

            try {
                const d = new Date(selectedDate);
                const rDate = new Date(reportDate);
                const diffTime = Math.abs(d.getTime() - rDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return isTargetWaiter && diffDays <= 7;
            } catch (e) {
                return false;
            }
        });
    }, [reports, currentWaiter, selectedDate, isAdmin, timeRange, forceRenderCount]);

    const stats = useMemo(() => {
        let totalSales = 0;
        let paidCount = 0;
        let pendingTotal = 0;

        filteredReports.forEach(r => {
            const total = safeNum(r.total);
            if (r.notes === 'PENDIENTE') {
                pendingTotal += total;
            } else if (r.notes !== 'ANULADO') {
                totalSales += (r.type === 'refund' ? -total : total);
                paidCount++;
            }
        });

        const avgTicket = paidCount > 0 ? totalSales / paidCount : 0;
        return { totalSales, avgTicket, pendingTotal, paidCount };
    }, [filteredReports]);

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const getStatusInfo = (report: SaleRecord) => {
        if (report.notes === 'PENDIENTE') return { color: 'bg-[#FFD700]', label: 'Pendiente', badge: 'bg-[#FFD700]/10 text-[#FFD700]' };
        if (report.notes === 'ANULADO') return { color: 'bg-white/20', label: 'Anulado', badge: 'bg-white/5 text-white/40' };
        if (report.closed) return { color: 'bg-white/10', label: 'Cerrado', badge: 'bg-white/5 text-white/20' };
        return { color: 'bg-[#0bda19]', label: 'Pagado', badge: 'bg-[#0bda19]/10 text-[#0bda19]' };
    };

    // Safe day closures
    const safeDayClosures = useMemo(() => {
        return Array.isArray(dayClosures) ? dayClosures.filter(c => c && typeof c === 'object') : [];
    }, [dayClosures]);

    return (
        <div className="flex flex-col h-full bg-black text-white overflow-hidden relative font-sans w-full">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FFD700 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            {/* Header */}
            <header className="flex items-center bg-[#111]/90 p-4 justify-between sticky top-0 z-[60] backdrop-blur-xl border-b border-white/5 shrink-0 h-20">
                <button onClick={onGoToTables} className="text-[#FFD700] w-12 h-12 flex items-center justify-center active:scale-95 transition-transform shrink-0">
                    <span className="material-symbols-outlined text-3xl">menu</span>
                </button>
                <button onClick={onShowFloorPlan} className="text-[#ec7f13] w-12 h-12 flex items-center justify-center active:scale-95 transition-transform shrink-0 ml-[-8px]">
                    <span className="material-symbols-outlined text-3xl">grid_view</span>
                </button>
                <div className="flex-1 text-center font-bold px-2 overflow-hidden">
                    <h2 className="text-white text-lg font-black uppercase italic tracking-tighter truncate">Pedidos</h2>
                    <p className="text-[9px] font-black text-[#FFD700] uppercase tracking-[0.2em] truncate">{currentWaiter}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Botones de cierre movidos al Dashboard Admin */}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-grow overflow-y-auto scrollbar-hide pb-36 relative z-10 w-full">

                {/* Filter Selector */}
                <div className="px-5 py-2 w-full">
                    <div className="flex h-12 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/10 p-1 backdrop-blur-md w-full">
                        {(['Shift', 'Today', 'Week'] as const).map(range => (
                            <button key={range} onClick={() => setTimeRange(range)} className={`flex h-full grow items-center justify-center rounded-xl px-2 text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-[#FFD700] text-black shadow-lg font-bold' : 'text-white/30 font-medium'}`}>
                                {range === 'Today' ? 'Hoy' : (range === 'Shift' ? 'Turno' : 'Semana')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ticket List */}
                <div className="px-5 pt-6 w-full">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white text-lg font-black uppercase italic tracking-tighter">Historial</h3>
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="text-[#FFD700] active:scale-90"><span className="material-symbols-outlined text-sm">arrow_back</span></button>
                            <span className="text-[10px] font-black text-white tabular-nums">{selectedDate}</span>
                            <button disabled={isToday} onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className={`text-[#FFD700] active:scale-90 ${isToday ? 'opacity-20' : ''}`}><span className="material-symbols-outlined text-sm">arrow_forward</span></button>
                        </div>
                    </div>
                    <div className="space-y-3 pb-8">
                        {filteredReports.map(report => {
                            const status = getStatusInfo(report);
                            return (
                                <div key={report.id} onClick={() => setActiveSale(report)} className="bg-white/[0.04] border border-white/10 rounded-[2rem] p-5 flex justify-between items-center active:scale-[0.98] transition-transform w-full">
                                    <div className="flex gap-4 items-center overflow-hidden">
                                        <div className={`w-1 h-8 rounded-full ${status.color} shrink-0`}></div>
                                        <div className="overflow-hidden">
                                            <p className={`font-black text-sm tracking-tight truncate ${report.notes === 'ANULADO' ? 'text-white/20 line-through' : 'text-white'}`}>{report.customerName || (report.tableNumber > 0 ? `Boca #${report.tableNumber}` : 'Ticket')}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase shrink-0 ${status.badge}`}>{status.label}</span>
                                                <span className="text-[9px] font-black text-white/20 uppercase tabular-nums truncate">{report.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="font-black text-lg tracking-tighter font-mono">${safeNum(report.total).toFixed(2)}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredReports.length === 0 && (
                            <div className="text-center py-16 opacity-20 italic text-sm">Sin registros</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 w-full bg-[#111]/95 backdrop-blur-2xl border-t border-white/5 px-6 pt-4 pb-8 flex justify-around items-center z-[8000] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <button onClick={onGoToTables} className="flex flex-col items-center gap-1 text-white/30 h-14 justify-center w-16 active:text-white transition-colors">
                    <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Menú</span>
                </button>
                <button onClick={onOpenSalesHistory} className="flex flex-col items-center gap-1 text-white/30 h-14 justify-center w-16 active:text-white transition-colors">
                    <span className="material-symbols-outlined text-2xl">inventory</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Kardex</span>
                </button>
            </nav>

            {/* Modals - High Z-Index to prevent blank screens */}
            {activeSale && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[9500] p-4" onClick={() => setActiveSale(null)}>
                    <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-6 italic">Detalle Venta</h3>
                        <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
                            {(activeSale.order || []).map((item: any, idx) => (
                                <div key={idx} className="pb-3 border-b border-white/5 last:border-0 flex justify-between items-start">
                                    <span className="text-sm font-bold text-white/80 w-[70%]">{item.quantity}x {item.name}</span>
                                    <span className="text-base font-black text-white font-mono w-[30%] text-right">${(safeNum(item.price) * safeNum(item.quantity)).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Total</span>
                            <span className="text-2xl font-black text-[#FFD700] font-mono">${safeNum(activeSale.total).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col gap-3">
                            {activeSale.notes === 'PENDIENTE' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            onEditPendingReport(activeSale, 'menu');
                                            setActiveSale(null);
                                        }}
                                        className="py-4 bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-transform border border-white/10"
                                    >
                                        + Agregar
                                    </button>
                                    <button
                                        onClick={() => {
                                            onEditPendingReport(activeSale, 'checkout');
                                            setActiveSale(null);
                                        }}
                                        className="py-4 bg-[#FFD700] text-black font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-transform shadow-lg shadow-[#FFD700]/20"
                                    >
                                        $$ Cobrar
                                    </button>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                {isAdmin && activeSale.notes !== 'ANULADO' && (
                                    <button
                                        onClick={() => {
                                            const reason = prompt("Razón de la anulación:");
                                            if (reason) {
                                                onVoidReport(activeSale.id, reason);
                                                setActiveSale(null);
                                            }
                                        }}
                                        className="py-4 bg-[#FF0000]/10 text-[#FF0000] font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-transform border border-[#FF0000]/20"
                                    >
                                        Anular
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        onReprintSaleRecord(activeSale);
                                        setActiveSale(null);
                                    }}
                                    className={`py-4 bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-transform border border-white/5 ${!isAdmin ? 'col-span-2' : ''}`}
                                >
                                    Imprimir
                                </button>
                            </div>
                            <button onClick={() => setActiveSale(null)} className="w-full py-4 text-white/20 font-black uppercase text-[10px] tracking-[0.3em] bg-white/5 rounded-xl active:bg-white/10 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DayClosureModal and History moved to AdminDashboard */}
        </div>
    );
};

export default ReportsScreen;
