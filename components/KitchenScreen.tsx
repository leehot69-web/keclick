
import React, { useMemo, useState, useEffect } from 'react';
import { SaleRecord, AppSettings, User, CartItem } from '../types';

interface KitchenScreenProps {
    reports: SaleRecord[];
    settings: AppSettings;
    currentUser: User | null;
    onUpdateItemStatus: (reportId: string, itemId: string, stationId: string, status: 'pending' | 'preparing' | 'ready') => void;
    onCloseOrder: (reportId: string) => void;
    onLogout: () => void;
}

const KitchenScreen: React.FC<KitchenScreenProps> = ({
    reports,
    settings,
    currentUser,
    onUpdateItemStatus,
    onCloseOrder,
    onLogout
}) => {
    const today = new Date().toISOString().split('T')[0];
    const [now, setNow] = useState(new Date());
    const [pinnedOrders, setPinnedOrders] = useState<string[]>([]);

    // Actualizar el tiempo cada minuto
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Obtener la estación del cocinero actual (o 'all' si es admin)
    const userStation = currentUser?.role === 'cocinero'
        ? currentUser.kitchenStation
        : 'all';

    // Filtrar items por estación y lógica de entrega
    const getItemsForStation = (order: SaleRecord) => {
        return order.order.filter((item: any) => {
            // Si el item ya fue entregado por el mesero (isServed), desaparece de cocina
            if (item.isServed) return false;

            // Filtro por estación
            if (userStation === 'all' || !userStation) return true;
            const itemStations = item.kitchenStations || ['general'];
            return itemStations.includes(userStation);
        });
    };

    // Filtrar pedidos de hoy que no han sido cerrados o anulados
    const activeOrders = useMemo(() => {
        const active = reports.filter(r =>
            r.date === today &&
            r.notes !== 'ANULADO' &&
            !r.closed
        );

        // Filtrar solo los que tienen items para esta estación
        return active.filter(order => getItemsForStation(order).length > 0);
    }, [reports, today, userStation]);



    // Calcular tiempo transcurrido
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
        if (!createdAt) return 'bg-gray-200 text-gray-600';
        const start = new Date(createdAt);
        const diff = Math.floor((now.getTime() - start.getTime()) / 60000);

        if (diff > 30) return 'bg-red-500 text-white animate-pulse';
        if (diff > 15) return 'bg-amber-500 text-white';
        if (diff > 5) return 'bg-blue-500 text-white';
        return 'bg-green-500 text-white';
    };

    // Obtener estado actual del item
    const getItemStatus = (item: any, stationId: string) => {
        return item.kitchenStatus?.[stationId] || 'pending';
    };

    const togglePin = (orderId: string) => {
        setPinnedOrders(prev =>
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    // Obtener nombre de la estación actual
    const stationName = settings.kitchenStations?.find(s => s.id === userStation)?.name || 'Cocina General';

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
            {/* Header */}
            <header className="bg-gray-800 p-4 flex justify-between items-center shrink-0 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight">{stationName}</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{currentUser?.name} • {today}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-3xl font-black tabular-nums">{activeOrders.length}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Comandas</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {activeOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className="text-xl font-black uppercase">Sin Comandas</p>
                        <p className="text-sm text-gray-600">Esperando pedidos...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activeOrders.map(order => {
                            // Renderizamos TODOS los items para dar contexto, pero aplicamos lógica de visualización
                            return (
                                <div
                                    key={order.id}
                                    className={`rounded-2xl overflow-hidden border flex flex-col transition-all duration-300 ${pinnedOrders.includes(order.id)
                                        ? 'bg-gray-800 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-[1.02]'
                                        : 'bg-gray-800 border-gray-700'
                                        }`}
                                >
                                    {/* Header de la comanda */}
                                    <div className="bg-gray-700 p-3 flex justify-between items-center relative">
                                        <div className="flex-1">
                                            <h3 className="font-black text-lg uppercase truncate">
                                                {order.customerName || `Mesa ${order.tableNumber}`}
                                            </h3>
                                            <p className="text-[10px] text-gray-400 font-bold">
                                                {order.time} • Mesero: {order.waiter}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${getTimeColorClass(order.createdAt)}`}>
                                                {getElapsedTime(order.createdAt) || order.time}
                                            </div>
                                            <button
                                                onClick={() => togglePin(order.id)}
                                                className={`p-1.5 rounded-lg transition-colors ${pinnedOrders.includes(order.id)
                                                    ? 'bg-red-500 text-white animate-pulse'
                                                    : 'bg-gray-600 text-gray-400 hover:text-white'
                                                    }`}
                                                title="Fijar comanda"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-45" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2 1 1 0 011 1h12a1 1 0 011-1 2 2 0 00-2-2V7a5 5 0 00-5-5z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Franjas de Alerta de Pedido (Resumen) */}
                                    <div className="flex flex-col w-full">
                                        {(() => {
                                            const myItems = order.order.filter((item: any) => {
                                                const itemStations = item.kitchenStations || ['general'];
                                                return userStation === 'all' || itemStations.includes(userStation);
                                            });
                                            const hasReady = myItems.some((i: any) => getItemStatus(i, userStation === 'all' ? 'general' : userStation) === 'ready');
                                            const hasPreparing = myItems.some((i: any) => getItemStatus(i, userStation === 'all' ? 'general' : userStation) === 'preparing');

                                            return (
                                                <>
                                                    {hasReady && <div className="h-1.5 w-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] z-10"></div>}
                                                    {hasPreparing && <div className="h-1.5 w-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)] z-10"></div>}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Items de la comanda */}
                                    <div className="flex-1 p-3 space-y-2">
                                        {order.order.map((item: any, idx: number) => {
                                            const itemStations = item.kitchenStations || ['general'];
                                            const isMyStation = userStation === 'all' || itemStations.includes(userStation);

                                            // Si es mío y ya está servido (entregado), SE BORRA (no se renderiza)
                                            if (isMyStation && item.isServed) return null;

                                            const stationId = userStation === 'all' ? 'general' : userStation;

                                            // Lógica de estado
                                            const myStatus = isMyStation ? getItemStatus(item, stationId) : 'pending';
                                            const ready = myStatus === 'ready';
                                            const preparing = myStatus === 'preparing';

                                            const otherStationsReady = !isMyStation && Object.values(item.kitchenStatus || {}).some(s => s === 'ready');

                                            const served = item.isServed;

                                            // Estilos para items propios vs contexto (ajenos)
                                            let containerClass = 'bg-gray-700 border border-gray-600';
                                            let textClass = 'text-white';

                                            if (isMyStation) {
                                                if (ready) {
                                                    containerClass = 'bg-green-500/10 border-t border-l border-r border-green-500/50 border-b-4 border-b-green-500';
                                                    textClass = 'text-green-400';
                                                } else if (preparing) {
                                                    containerClass = 'bg-amber-500/10 border-t border-l border-r border-amber-500/50 border-b-4 border-b-amber-500';
                                                    textClass = 'text-amber-400';
                                                }
                                            } else {
                                                containerClass = 'bg-black/40 border border-gray-700/50 opacity-60';
                                                textClass = served ? 'text-gray-500 line-through' : (otherStationsReady ? 'text-green-700' : 'text-gray-500');
                                            }

                                            return (
                                                <div
                                                    key={item.id || idx}
                                                    className={`p-3 rounded-xl flex justify-between items-center transition-all ${containerClass}`}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-2xl font-black ${textClass}`}>
                                                                {item.quantity}x
                                                            </span>
                                                            <div className="flex flex-col">
                                                                <span className={`font-bold text-lg ${textClass} leading-none`}>
                                                                    {item.name}
                                                                </span>
                                                                {!isMyStation && (
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">
                                                                        {served ? 'ENTREGADO' : (otherStationsReady ? 'LISTO (OTRA ESTACIÓN)' : 'EN PREPARACIÓN (OTRA ESTACIÓN)')}
                                                                    </span>
                                                                )}
                                                                {isMyStation && preparing && (
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 mt-1 animate-pulse">
                                                                        🔥 PREPARANDO...
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Modificadores */}
                                                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                                            <div className={`mt-2 space-y-1 pl-8 ${!isMyStation ? 'opacity-50' : ''}`}>
                                                                {(() => {
                                                                    const groups: Record<string, string[]> = {};
                                                                    item.selectedModifiers.forEach((m: any) => {
                                                                        const title = m.groupTitle || 'Extra';
                                                                        if (!groups[title]) groups[title] = [];
                                                                        groups[title].push(m.option?.name || m.name);
                                                                    });
                                                                    return Object.entries(groups).map(([groupTitle, options]) => (
                                                                        <div key={groupTitle} className="mb-1">
                                                                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded mr-2 ${groupTitle.includes('IZQUIERDA') ? 'bg-blue-500 text-white' :
                                                                                groupTitle.includes('DERECHA') ? 'bg-amber-500 text-white' :
                                                                                    'bg-gray-600 text-gray-300'
                                                                                }`}>
                                                                                {groupTitle}
                                                                            </span>
                                                                            <span className={`text-xs font-bold ${isMyStation ? 'text-gray-200' : 'text-gray-600'}`}>{options.join(', ')}</span>
                                                                        </div>
                                                                    ));
                                                                })()}
                                                            </div>
                                                        )}
                                                        {/* Notas */}
                                                        {item.notes && (
                                                            <p className={`text-xs font-bold mt-1 pl-8 ${isMyStation ? 'text-amber-400' : 'text-gray-600'}`}>
                                                                📝 {item.notes}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Botón de Acción (Solo para mis items) */}
                                                    {isMyStation && (
                                                        <button
                                                            onClick={() => {
                                                                const nextStatus = myStatus === 'pending' ? 'preparing' : 'ready';
                                                                onUpdateItemStatus(order.id, item.id, stationId, nextStatus);
                                                            }}
                                                            disabled={ready}
                                                            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all shrink-0 ml-2 ${ready
                                                                ? 'bg-green-500 text-white cursor-default'
                                                                : preparing
                                                                    ? 'bg-amber-500 text-white hover:bg-green-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                                                    : 'bg-gray-600 hover:bg-amber-500 active:scale-95 text-white'
                                                                }`}
                                                        >
                                                            {ready ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : preparing ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer con info */}
            <footer className="bg-gray-800 p-3 border-t border-gray-700 flex justify-between items-center text-xs text-gray-400 shrink-0">
                <span>🍳 Sistema de Cocina (KDS)</span>
                <span className="tabular-nums">{now.toLocaleTimeString()}</span>
            </footer>
        </div>
    );
};

export default KitchenScreen;
