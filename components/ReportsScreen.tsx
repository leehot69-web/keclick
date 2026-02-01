
import React, { useState, useMemo } from 'react';
import { SaleRecord, OrderItem, StoreProfile, AppSettings, CartItem, View, DayClosure } from '../types';

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
    onVoidReport: (reportId: string) => void;
    isAdmin: boolean;
}

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
    const filteredReports = reports.filter(r => r.date === today && (isAdmin ? true : r.waiter === currentWaiter));
    // Solo sumamos al total lo que NO esté cerrado
    const totalPaid = filteredReports.reduce((acc, r) => (r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO' && !r.closed) ? acc + (r.type === 'refund' ? -r.total : r.total) : acc, 0);
    const totalPending = filteredReports.reduce((acc, r) => r.notes === 'PENDIENTE' ? acc + r.total : acc, 0);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 my-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black uppercase text-gray-800 tracking-tighter">Cierre {isAdmin ? 'General' : `de ${currentWaiter}`}</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                        <p className="text-[10px] font-black text-green-600 uppercase mb-1">Total Cobrado (Caja)</p>
                        <div className="flex justify-between items-end">
                            <p className="text-2xl font-black text-green-900">${totalPaid.toFixed(2)}</p>
                            <p className="text-sm font-bold text-green-700">Bs. {(totalPaid * exchangeRate).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Por Cobrar (Pendiente)</p>
                        <div className="flex justify-between items-end">
                            <p className="text-2xl font-black text-amber-900">${totalPending.toFixed(2)}</p>
                            <p className="text-sm font-bold text-amber-700">Bs. {(totalPending * exchangeRate).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-8 space-y-3">
                    <button onClick={onStartNewDay} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg uppercase tracking-widest">Finalizar Jornada</button>
                </div>
            </div>
        </div>
    );
};

const ReportsScreen: React.FC<ReportsScreenProps> = ({ reports, dayClosures, onGoToTables, onDeleteReports, storeProfile, settings, onStartNewDay, currentWaiter, onOpenSalesHistory, onReprintSaleRecord, isPrinterConnected, onEditPendingReport, onVoidReport, isAdmin }) => {
    const [activeSale, setActiveSale] = useState<SaleRecord | null>(null);
    const [showClosureModal, setShowClosureModal] = useState(false);
    const [showClosuresHistory, setShowClosuresHistory] = useState(false);
    const exchangeRate = settings ? (settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel) : 1;
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const filteredByWaiterAndDate = useMemo(() => {
        return reports.filter(r => (isAdmin ? true : r.waiter === currentWaiter) && r.date === selectedDate);
    }, [reports, currentWaiter, selectedDate, isAdmin]);

    // Solo sumamos al "Total Cobrado" los registros que NO estén cerrados (closed)
    const totalPaid = filteredByWaiterAndDate.reduce((sum, r) => (r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO' && !r.closed) ? (r.type === 'refund' ? sum - r.total : sum + r.total) : sum, 0);
    const totalPending = filteredByWaiterAndDate.reduce((sum, r) => r.notes === 'PENDIENTE' ? sum + r.total : sum, 0);

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const getStatusColor = (report: SaleRecord) => {
        if (report.notes === 'PENDIENTE') return 'bg-amber-400';
        if (report.notes === 'ANULADO') return 'bg-gray-400';
        if (report.closed) return 'bg-gray-300'; // Cerrado = gris
        return 'bg-green-500';
    };

    const getBadgeClass = (report: SaleRecord) => {
        if (report.notes === 'PENDIENTE') return 'bg-amber-100 text-amber-600';
        if (report.notes === 'ANULADO') return 'bg-gray-100 text-gray-600';
        if (report.closed) return 'bg-gray-200 text-gray-500'; // Cerrado = gris
        return 'bg-green-100 text-green-600';
    };

    const getClosedLabel = (report: SaleRecord) => {
        if (report.closed) return 'CERRADO';
        return report.notes || 'PAGADO';
    };

    return (
        <>
            <div className="max-w-4xl mx-auto h-screen flex flex-col bg-white">
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b">
                    <button onClick={onGoToTables} className="p-2 bg-gray-100 rounded-xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                    <div className="text-center">
                        <h1 className="text-sm font-black uppercase text-gray-800 leading-none">Ventas: {isAdmin ? 'Global' : currentWaiter}</h1>
                    </div>
                    <button onClick={() => setShowClosuresHistory(true)} className="p-2 bg-purple-100 rounded-xl text-purple-600" title="Ver Cierres Anteriores">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                </header>

                <div className="bg-gray-50 border-b p-4 flex items-center justify-between shadow-inner">
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-md active:scale-90 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'text-red-500' : 'text-gray-400'}`}>{isToday ? 'Hoy' : 'Historial'}</span>
                        <span className="text-lg font-black text-black tabular-nums">{selectedDate}</span>
                    </div>
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} disabled={isToday} className={`w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-md active:scale-90 transition-transform ${isToday ? 'opacity-30' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-600 p-4 rounded-3xl text-white shadow-lg">
                            <p className="text-[10px] font-black uppercase opacity-80 mb-1">Total Cobrado</p>
                            <p className="text-2xl font-black">${totalPaid.toFixed(2)}</p>
                        </div>
                        <div className="bg-amber-500 p-4 rounded-3xl text-white shadow-lg">
                            <p className="text-[10px] font-black uppercase opacity-80 mb-1">Por Cobrar</p>
                            <p className="text-2xl font-black">${totalPending.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onOpenSalesHistory} className="flex-1 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Inventario</button>
                        {isToday && <button onClick={() => setShowClosureModal(true)} className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Cerrar Caja</button>}
                    </div>

                    <div className="space-y-3">
                        {filteredByWaiterAndDate.map(report => (
                            <div key={report.id} onClick={() => setActiveSale(report)} className={`p-4 rounded-2xl border flex justify-between items-center active:bg-gray-50 transition-colors cursor-pointer shadow-sm ${report.closed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>
                                <div className="flex gap-3 items-center">
                                    <div className={`w-2 h-10 rounded-full ${getStatusColor(report)}`}></div>
                                    <div>
                                        <p className={`font-bold text-sm leading-none mb-1 ${report.notes === 'ANULADO' || report.closed ? 'text-gray-400' : 'text-black'} ${report.notes === 'ANULADO' ? 'line-through' : ''}`}>{report.customerName || (report.tableNumber > 0 ? `Ref: ${report.tableNumber}` : 'Pedido')}</p>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${getBadgeClass(report)}`}>{getClosedLabel(report)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-lg leading-none ${report.notes === 'ANULADO' || report.closed ? 'text-gray-400' : 'text-black'}`}>${report.total.toFixed(2)}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1">Bs. {(report.total * exchangeRate).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {activeSale && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[110] p-4" onClick={() => setActiveSale(null)}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-black text-black uppercase tracking-tight">Detalle de Venta</h3>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${getBadgeClass(activeSale)}`}>{getClosedLabel(activeSale)}</span>
                        </div>
                        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                            {activeSale.order.map((item: any, idx) => (
                                <div key={idx} className="flex flex-col text-sm border-b border-gray-50 pb-2 last:border-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-gray-600 font-bold leading-tight">{item.quantity}x {item.name}</span>
                                        <span className="font-black text-black shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {(() => {
                                                const groups: Record<string, string[]> = {};
                                                item.selectedModifiers.forEach((m: any) => {
                                                    const title = m.groupTitle || 'Extra';
                                                    if (!groups[title]) groups[title] = [];
                                                    groups[title].push(m.option.name);
                                                });
                                                return Object.entries(groups).map(([groupTitle, options]) => (
                                                    <p key={groupTitle} className="text-[9px] text-gray-500 leading-tight pl-2">
                                                        <span className="font-bold uppercase text-[7px] text-gray-400 mr-1">{groupTitle}:</span>
                                                        {options.join(', ')}
                                                    </p>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 space-y-3">
                            {activeSale.notes === 'PENDIENTE' && (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => { onEditPendingReport(activeSale, 'checkout'); setActiveSale(null); }}
                                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        Cobrar Cuenta
                                    </button>
                                    <button
                                        onClick={() => { onEditPendingReport(activeSale, 'menu'); setActiveSale(null); }}
                                        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Añadir más productos
                                    </button>
                                </div>
                            )}
                            {activeSale.notes !== 'ANULADO' && (
                                <button
                                    onClick={() => onVoidReport(activeSale.id)}
                                    className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Anular Ticket (Admin PIN)
                                </button>
                            )}
                            <button
                                onClick={() => onReprintSaleRecord(activeSale)}
                                disabled={activeSale.notes === 'ANULADO'}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${isPrinterConnected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white shadow-xl'}`}
                            >
                                {isPrinterConnected ? 'Imprimir Recibo' : 'Imprimir (PC / Cable)'}
                            </button>
                            <button onClick={() => setActiveSale(null)} className="w-full py-3 bg-gray-200 text-gray-700 rounded-2xl font-bold uppercase tracking-widest">Cerrar Detalle</button>
                        </div>
                    </div>
                </div>
            )}

            {showClosureModal && settings && onStartNewDay && <DayClosureModal reports={reports} settings={settings} onClose={() => setShowClosureModal(false)} onStartNewDay={onStartNewDay} currentWaiter={currentWaiter} isAdmin={isAdmin} />}

            {/* Modal de Historial de Cierres */}
            {showClosuresHistory && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm overflow-y-auto" onClick={() => setShowClosuresHistory(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-black uppercase text-gray-800 tracking-tighter">Historial de Cierres</h2>
                            <button onClick={() => setShowClosuresHistory(false)} className="p-2 bg-gray-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
                            {dayClosures
                                .filter(c => isAdmin ? true : c.closedBy === currentWaiter)
                                .filter(c => c.date === selectedDate)
                                .length === 0 ? (
                                <div className="py-12 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="text-gray-400 italic">No hay cierres registrados para esta fecha.</p>
                                </div>
                            ) : (
                                dayClosures
                                    .filter(c => isAdmin ? true : c.closedBy === currentWaiter)
                                    .filter(c => c.date === selectedDate)
                                    .map(closure => (
                                        <div key={closure.id} className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-[10px] font-black text-green-600 uppercase">Cierre #{closure.id.slice(-4)}</p>
                                                    <p className="text-sm font-bold text-gray-800">{new Date(closure.closedAt).toLocaleTimeString()}</p>
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${closure.isAdminClosure ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {closure.isAdminClosure ? 'Admin' : closure.closedBy}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="bg-white/60 rounded-lg p-2">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Total Cerrado</p>
                                                    <p className="text-lg font-black text-green-700">${closure.totalPaid.toFixed(2)}</p>
                                                </div>
                                                <div className="bg-white/60 rounded-lg p-2">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Ventas</p>
                                                    <p className="text-lg font-black text-gray-700">{closure.salesCount}</p>
                                                </div>
                                            </div>
                                            {closure.totalPending > 0 && (
                                                <div className="mt-2 text-[10px] font-bold text-amber-600">
                                                    ⚠️ Pendiente al cierre: ${closure.totalPending.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ReportsScreen;
