
import React, { useMemo, useState, useEffect } from 'react';
import { SaleRecord, AppSettings, User, CartItem } from '../types';

interface KitchenScreenProps {
    reports: SaleRecord[];
    settings: AppSettings;
    currentUser: User | null;
    onUpdateItemStatus: (reportId: string, itemId: string, stationId: string, status: 'pending' | 'preparing' | 'ready') => void;
    onCloseOrder: (reportId: string) => void;
    onLogout: () => void;
    onManualSync?: () => void;
    syncStatus?: 'connecting' | 'online' | 'offline' | 'polling';
    lastSyncTime?: Date;
}

const KitchenScreen: React.FC<KitchenScreenProps> = ({
    reports,
    settings,
    currentUser,
    onUpdateItemStatus,
    onCloseOrder,
    onLogout,
    onManualSync,
    syncStatus = 'online',
    lastSyncTime
}) => {
    const today = new Date().toISOString().split('T')[0];
    const [now, setNow] = useState(new Date());
    const [pinnedOrders, setPinnedOrders] = useState<string[]>([]);
    const [isWakeLockActive, setIsWakeLockActive] = useState(false);

    // Activar Wake Lock (Pantalla y Audio Fantasma para móviles)
    const enableWakeLock = async () => {
        try {
            // 1. Screen Wake Lock API
            if ('wakeLock' in navigator) {
                // @ts-ignore
                const wakeLock = await navigator.wakeLock.request('screen');
                console.log('💡 Wake Lock activo');
            }

            // 2. Audio Fantasma (Loop silencioso para mantener CPU despierta en móviles)
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 0.0001; // Casi silencio
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();

            setIsWakeLockActive(true);
            alert('📱 MODO "SIEMPRE ENCENDIDO" ACTIVADO\n\nEl dispositivo no se dormirá y sincronizará en tiempo real.\n(Puede consumir más batería)');
        } catch (err) {
            console.error('Error activating wake lock:', err);
            alert('No se pudo activar el modo "Siempre Encendido". Revisa los permisos.');
        }
    };

    // Actualizar el tiempo cada 10 segundos (más responsivo)
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    // Escuchar latido del iframe KeepAlive
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'heartbeat') {
                console.log('💓 Heartbeat recibido - Refrescando...');
                if (onManualSync) onManualSync();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onManualSync]);

    // Estado para mostrar animación cuando llegan nuevos pedidos
    const [lastOrderCount, setLastOrderCount] = useState(0);
    const [showNewOrderPulse, setShowNewOrderPulse] = useState(false);

    // Obtener la estación del cocinero actual (o 'all' si es admin)
    const userStation = currentUser?.role === 'cocinero'
        ? currentUser.kitchenStation
        : 'all';

    const getItemsForStation = (order: SaleRecord) => {
        return order.order.filter((item: any) => {
            if (item.isServed) return false;
            if (userStation === 'all' || !userStation) return true;
            const itemStations = (item.kitchenStations && item.kitchenStations.length > 0) ? item.kitchenStations : ['general'];
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

    const getItemStatus = (item: any, stationId: string) => {
        return item.kitchenStatus?.[stationId] || 'pending';
    };

    const togglePin = (orderId: string) => {
        setPinnedOrders(prev =>
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    const stationName = settings.kitchenStations?.find(s => s.id === userStation)?.name || 'Cocina General';

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden font-sans">
            <header className="bg-gray-800 p-4 flex justify-between items-center shrink-0 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight">{stationName}</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{currentUser?.name} • ID:{settings.storeId?.slice(-4)} • R:{reports.length} • {lastSyncTime ? lastSyncTime.toLocaleTimeString() : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Indicador de Sync */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase ${syncStatus === 'online' ? 'bg-green-500/20 text-green-400' : syncStatus === 'polling' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-green-400 animate-pulse' : syncStatus === 'polling' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`}></div>
                        {syncStatus === 'online' ? 'VIVO' : syncStatus === 'polling' ? 'AUTO' : 'OFF'}
                    </div>

                    {/* Botón Wake Lock */}
                    <button
                        onClick={enableWakeLock}
                        className={`p-3 rounded-xl transition-colors ${isWakeLockActive ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        title={isWakeLockActive ? "Modo Siempre Encendido ACTIVO" : "Activar Modo Siempre Encendido"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </button>

                    {onManualSync && (
                        <button onClick={onManualSync} className="p-3 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors" title="Sincronizar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}
                    <div className="text-right">
                        <p className={`text-3xl font-black tabular-nums ${showNewOrderPulse ? 'text-green-400 animate-bounce' : ''}`}>{activeOrders.length}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Comandas</p>
                    </div>
                    <button onClick={onLogout} className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {activeOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <p className="text-xl font-black uppercase text-gray-700">Sin Comandas</p>
                        <p className="text-sm text-gray-600 font-medium">Esperando nuevos pedidos...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                        {activeOrders.map(order => (
                            <div key={order.id} className={`rounded-3xl overflow-hidden border flex flex-col transition-all duration-300 ${pinnedOrders.includes(order.id) ? 'bg-gray-800 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] scale-[1.02] z-10' : 'bg-gray-800 border-gray-700/50'}`}>
                                <div className="bg-gray-700/50 p-4 border-b border-gray-700 flex justify-between items-center relative">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-lg uppercase truncate leading-none mb-1">{order.customerName || `Mesa ${order.tableNumber}`}</h3>
                                            {order.notes !== 'PENDIENTE' && (
                                                <span className="px-1.5 py-0.5 bg-green-500 text-[8px] font-black rounded text-white uppercase animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                                                    PAGADO
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{order.time} • {order.waiter}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter ${getTimeColorClass(order.createdAt)}`}>
                                            {getElapsedTime(order.createdAt) || order.time}
                                        </div>
                                        <button onClick={() => togglePin(order.id)} className={`p-2 rounded-xl transition-all active:scale-90 ${pinnedOrders.includes(order.id) ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-400 hover:text-white'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-45" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2 1 1 0 011 1h12a1 1 0 011-1 2 2 0 00-2-2V7a5 5 0 00-5-5z" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col w-full">
                                    {(() => {
                                        const myItems = order.order.filter((item: any) => {
                                            const itemStations = (item.kitchenStations && item.kitchenStations.length > 0) ? item.kitchenStations : ['general'];
                                            return userStation === 'all' || itemStations.includes(userStation);
                                        });
                                        const getStatusForDisplay = (item: any) => {
                                            const stations = (item.kitchenStations && item.kitchenStations.length > 0) ? item.kitchenStations : ['general'];
                                            const targetStation = userStation === 'all' ? stations[0] : userStation;
                                            return getItemStatus(item, targetStation);
                                        };
                                        const hasReady = myItems.some((i: any) => getStatusForDisplay(i) === 'ready');
                                        const hasPreparing = myItems.some((i: any) => getStatusForDisplay(i) === 'preparing');
                                        return (
                                            <>
                                                {hasReady && <div className="h-1.5 w-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>}
                                                {hasPreparing && <div className="h-1.5 w-full bg-amber-500 animate-pulse"></div>}
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="p-3 space-y-2 flex-1">
                                    {order.order.map((item: any, idx: number) => {
                                        const itemStations = (item.kitchenStations && item.kitchenStations.length > 0) ? item.kitchenStations : ['general'];
                                        const isMyStation = userStation === 'all' || itemStations.includes(userStation);
                                        if (isMyStation && item.isServed) return null;
                                        const activeStationId = userStation === 'all' ? itemStations[0] : userStation;
                                        const myStatus = isMyStation ? getItemStatus(item, activeStationId) : 'pending';
                                        const ready = myStatus === 'ready';
                                        const preparing = myStatus === 'preparing';
                                        const otherStationsReady = !isMyStation && Object.values(item.kitchenStatus || {}).some(s => s === 'ready');

                                        let containerClass = 'bg-gray-700/30 border border-gray-700/50';
                                        let textClass = 'text-gray-300';

                                        if (isMyStation) {
                                            if (ready) { containerClass = 'bg-green-500/10 border-green-500/50 border-b-4 border-b-green-500'; textClass = 'text-green-400'; }
                                            else if (preparing) { containerClass = 'bg-amber-500/10 border-amber-500/50 border-b-4 border-b-amber-500'; textClass = 'text-amber-400'; }
                                            else { textClass = 'text-white'; }
                                        } else {
                                            containerClass = 'bg-black/20 border-dashed opacity-40';
                                            textClass = item.isServed ? 'text-gray-600 line-through' : (otherStationsReady ? 'text-green-800' : 'text-gray-600');
                                        }

                                        return (
                                            <div key={item.id || idx} className={`p-3 rounded-2xl flex justify-between items-center transition-all ${containerClass}`}>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex items-start gap-2">
                                                        <span className={`text-2xl font-black italic leading-none ${textClass}`}>{item.quantity}x</span>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={`font-black text-sm uppercase tracking-tight leading-none truncate ${textClass}`}>{item.name}</span>
                                                            {!isMyStation && (
                                                                <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 mt-1">
                                                                    {item.isServed ? 'ENTREGADO ✓' : (otherStationsReady ? 'LISTO (OTRA SECCIÓN)' : 'EN PREPARACIÓN...')}
                                                                </span>
                                                            )}
                                                            {userStation === 'all' && (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {itemStations.map(sId => (
                                                                        <span key={sId} className="px-1.5 py-0.5 bg-gray-900/50 text-[6px] font-black rounded uppercase text-gray-500">{settings.kitchenStations?.find(s => s.id === sId)?.name || 'General'}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {isMyStation && preparing && <span className="text-[8px] font-black uppercase text-amber-500 mt-1 animate-pulse">🔥 EN FUEGO...</span>}
                                                        </div>
                                                    </div>

                                                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                                        <div className={`mt-2 space-y-0.5 ml-8 ${!isMyStation ? 'opacity-30 grayscale' : ''}`}>
                                                            {(() => {
                                                                const groups: Record<string, string[]> = {};
                                                                item.selectedModifiers.forEach((m: any) => {
                                                                    const title = m.groupTitle || 'Extra';
                                                                    if (!groups[title]) groups[title] = [];
                                                                    groups[title].push(m.option?.name || m.name);
                                                                });
                                                                return Object.entries(groups).map(([groupTitle, options]) => (
                                                                    <div key={groupTitle} className="flex items-center gap-1.5">
                                                                        <span className="text-[7px] font-black uppercase text-gray-500 bg-black/20 px-1 rounded">{groupTitle}</span>
                                                                        <span className={`text-[10px] font-bold truncate ${isMyStation ? 'text-gray-400' : 'text-gray-600'}`}>{options.join(', ')}</span>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    )}
                                                    {item.notes && <p className={`text-[10px] font-bold mt-1.5 ml-8 ${isMyStation ? 'text-amber-500/80' : 'text-gray-700'} italic truncate`}>📝 {item.notes}</p>}
                                                </div>

                                                {isMyStation && (
                                                    <button
                                                        onClick={() => {
                                                            const nextStatus = myStatus === 'pending' ? 'preparing' : 'ready';
                                                            onUpdateItemStatus(order.id, item.id, activeStationId, nextStatus);
                                                        }}
                                                        disabled={ready}
                                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-gray-700 shadow-lg ${ready ? 'bg-green-500 text-white cursor-default' : preparing ? 'bg-amber-500 text-white scale-110 shadow-amber-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-600 active:scale-90'}`}
                                                    >
                                                        {ready ? <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : preparing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => onCloseOrder(order.id)}
                                    className="m-3 p-4 bg-gray-900 hover:bg-black text-gray-400 hover:text-white border border-gray-700 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Cerrar Comanda
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <footer className="bg-gray-800 p-3 border-t border-gray-700 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-500 shrink-0">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Sistema de Cocina Keclick KDS v2.0</span>
                <span className="tabular-nums opacity-50">{now.toLocaleTimeString()}</span>
            </footer>
            {/* Hack: Iframe Invisible para mantener la conexión viva */}
            {isWakeLockActive && (
                <iframe
                    src="/keepalive.html"
                    title="keepalive"
                    style={{ width: 1, height: 1, border: 'none', position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
            )}
        </div >
    );
};

export default KitchenScreen;
