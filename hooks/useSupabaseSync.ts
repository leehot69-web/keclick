import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AppSettings, SaleRecord, DayClosure, StoreProfile } from '../types';

export const useSupabaseSync = (
    settings: AppSettings,
    setSettings: (s: AppSettings | ((prev: AppSettings) => AppSettings)) => void,
    reports: SaleRecord[],
    setReports: (r: SaleRecord[] | ((prev: SaleRecord[]) => SaleRecord[])) => void,
    dayClosures: DayClosure[],
    setDayClosures: (d: DayClosure[] | ((prev: DayClosure[]) => DayClosure[])) => void,
    menu: any[],
    modifierGroups: any[],
    currentStoreId: string | null
) => {
    const [syncStatus, setSyncStatus] = useState<'connecting' | 'online' | 'offline' | 'polling'>('connecting');
    const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
    // SOLUCIÓN REACTIVIDAD: Contador que fuerza re-render cuando llegan datos
    const [forceRenderCount, setForceRenderCount] = useState(0);

    // --- LÓGICA DE SUPERVIVENCIA PWA (KEEP-ALIVE & WAKE LOCK) ---
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const activateWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
            try {
                const wakeLock = await navigator.wakeLock.request('screen');
                wakeLockRef.current = wakeLock;
                console.log('🛡️ Wake Lock ACTIVADO: Pantalla no se apagará.');
                wakeLock.addEventListener('release', () => {
                    console.log('🛡️ Wake Lock liberado.');
                });
            } catch (err: any) {
                console.warn(`⚠️ No se pudo activar Wake Lock: ${err.message}`);
            }
        }
    }, []);

    // Re-activar Wake Lock y refrescar datos si la pestaña vuelve a ser visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('👀 App visible (Focus Sync): Refrescando datos NOW...');
                fetchData(); // Refresco inmediato (Focus Sync)
                activateWakeLock(); // Re-asegurar pantalla encendida
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        activateWakeLock(); // Intentar activar al inicio

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) wakeLockRef.current.release();
        };
    }, [activateWakeLock]); // Dependencia circular mínima, fetchData se define después, usaremos referencia

    // Polling Agresivo "Heartbeat" (Cada 2s)
    // Mantiene la conexión caliente y sirve de respaldo si el WebSocket muere.
    useEffect(() => {
        if (!currentStoreId) return;

        console.log('💓 Iniciando Heartbeat (Polling agresivo 2s)...');
        const intervalId = setInterval(() => {
            // Un fetch ligero para mantener el estado sincronizado
            fetchData();
        }, 2000);

        return () => clearInterval(intervalId);
    }, [currentStoreId]); // fetchData se añadirá a dependencias implícitamente al mover esto abajo o usar ref
    const lastFetchRef = useRef<number>(Date.now());
    // Referencia al estado de sync para que el Worker pueda leerlo
    const syncStatusRef = useRef<string>('connecting');

    // Función para forzar re-render de la UI
    const forceUIUpdate = () => {
        setForceRenderCount(prev => prev + 1);
        setLastSyncTime(new Date());
        console.log('🔄 Forzando actualización de UI...');
    };
    const mapSaleFromSupabase = (s: any): SaleRecord => ({
        ...s,
        id: s.id,
        storeId: s.store_id,
        date: s.date,
        time: s.time,
        customerName: s.customer_name,
        tableNumber: s.table_number,
        waiter: s.waiter,
        total: s.total,
        order: s.order_data,
        notes: s.notes,
        orderCode: s.order_code,
        closed: s.closed,
        type: s.type,
        auditNotes: s.audit_notes,
        createdAt: s.created_at
    });

    const fetchData = useCallback(async () => {
        if (!currentStoreId) return;
        lastFetchRef.current = Date.now();
        console.log('🔄 [SYNC] Recargando datos desde Supabase...');

        try {
            // Ventas
            const { data: salesData, error: salesError } = await supabase
                .from('sales')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('created_at', { ascending: false })
                .limit(60);

            if (salesError) throw salesError;

            if (salesData) {
                setReports(prev => {
                    const pendingMap = new Map(prev.filter(p => p._pendingSync).map(p => [p.id, p]));
                    const remoteMapped = salesData.map(mapSaleFromSupabase);
                    const merged = remoteMapped.map(r => pendingMap.get(r.id) || r);
                    const remoteIds = new Set(remoteMapped.map(r => r.id));
                    const newLocals = prev.filter(p => p._pendingSync && !remoteIds.has(p.id));
                    const finalReports = [...newLocals, ...merged];

                    const currentDataStr = JSON.stringify(prev);
                    const newDataStr = JSON.stringify(finalReports);

                    if (currentDataStr !== newDataStr) {
                        console.log('✨ [SYNC] Datos de ventas actualizados.');
                        forceUIUpdate();
                        return finalReports;
                    }
                    return prev;
                });
            }

            // Cierres
            const { data: closuresData } = await supabase
                .from('day_closures')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('closed_at', { ascending: false });

            if (closuresData) {
                setDayClosures(closuresData.map(c => ({
                    ...c,
                    storeId: c.store_id,
                    reportIds: c.report_ids
                })));
            }

            // Settings
            const { data: settingsData } = await supabase
                .from('settings')
                .select('*')
                .eq('store_id', currentStoreId)
                .single();

            if (settingsData) {
                setSettings({
                    ...settingsData,
                    storeId: settingsData.store_id,
                    kitchenStations: settingsData.kitchen_stations,
                    users: settingsData.users
                });
            }
            setSyncStatus(prev => prev === 'offline' ? 'polling' : prev);
        } catch (err) {
            console.error("❌ [SYNC] Error en fetchData:", err);
            setSyncStatus('offline');
        }
    }, [currentStoreId, setReports, setDayClosures, setSettings]);

    // Refs para evitar que los useEffect se reinicien si las funciones cambian
    const fetchDataRef = useRef(fetchData);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

    // 1. Carga inicial
    useEffect(() => {
        if (currentStoreId) fetchData();
    }, [currentStoreId]);

    // 2. Suscripción Realtime + Polling Fallback
    useEffect(() => {
        if (!currentStoreId) return;

        // MEJORA 2: WakeLock Automático (Global)
        // Mantiene el dispositivo despierto mientras la app está activa
        if ('wakeLock' in navigator) {
            try {
                navigator.wakeLock.request('screen');
                console.log('💡 WakeLock Global solicitado');
            } catch (err) {
                console.warn('WakeLock no disponible:', err);
            }
        }

        let channel: RealtimeChannel | null = null;
        let pollingInterval: any;



        const subscribe = () => {
            if (channel) supabase.removeChannel(channel);

            // SOLUCIÓN: UUID único por dispositivo para evitar conflictos de sesión
            // Cada dispositivo tiene su propio canal, todos reciben los mismos eventos
            let deviceId = localStorage.getItem('keclick_device_uuid');
            if (!deviceId) {
                deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                localStorage.setItem('keclick_device_uuid', deviceId);
            }

            console.log('🔌 Conectando dispositivo:', deviceId);

            // Canal único por dispositivo - evita que Supabase confunda conexiones
            channel = supabase
                .channel(`realtime_${deviceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'sales'
                }, async (payload) => {
                    // Filtrar client-side por store_id
                    const payloadData = payload.new as any || payload.old as any;
                    if (payloadData?.store_id !== currentStoreId) return;

                    setSyncStatus('online');
                    lastFetchRef.current = Date.now();

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const isComplete = payloadData && payloadData.order_data;

                        let fullSale: SaleRecord;

                        if (isComplete) {
                            fullSale = mapSaleFromSupabase(payloadData);
                        } else {
                            const { data, error } = await supabase
                                .from('sales')
                                .select('*')
                                .eq('id', payloadData.id)
                                .single();

                            if (error || !data) return;
                            fullSale = mapSaleFromSupabase(data);
                        }

                        setReports(prev => {
                            if (payload.eventType === 'INSERT') {
                                if (prev.some(r => r.id === fullSale.id)) return prev;
                                console.log('✅ Nuevo pedido recibido:', fullSale.id);
                                return [fullSale, ...prev];
                            } else {
                                // ACTUALIZACIÓN: Verificamos si tenemos cambios locales pendientes
                                const existing = prev.find(r => r.id === fullSale.id);
                                if (existing?._pendingSync) {
                                    console.log('�️ Ignorando update remoto (tenemos cambios locales pendientes):', fullSale.id);
                                    return prev;
                                }
                                console.log('📝 Pedido actualizado:', fullSale.id);
                                return prev.map(r => r.id === fullSale.id ? fullSale : r);
                            }
                        });
                        // SOLUCIÓN REACTIVIDAD: Forzar actualización de UI después de cada cambio
                        forceUIUpdate();
                    } else if (payload.eventType === 'DELETE') {
                        setReports(prev => prev.filter(r => r.id !== payloadData.id));
                        forceUIUpdate();
                    }
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'day_closures'
                }, (payload) => {
                    const payloadData = payload.new as any;
                    if (payloadData?.store_id !== currentStoreId) return;

                    setSyncStatus('online');
                    lastFetchRef.current = Date.now();
                    if (payload.eventType === 'INSERT') {
                        const newClosure = payload.new as DayClosure;
                        const mappedClosure: DayClosure = {
                            ...newClosure,
                            storeId: (newClosure as any).store_id,
                            reportIds: (newClosure as any).report_ids
                        };
                        setDayClosures(prev => {
                            if (prev.some(c => c.id === mappedClosure.id)) return prev;
                            return [mappedClosure, ...prev];
                        });
                        forceUIUpdate();
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        setSyncStatus('online');
                        console.log('✅ Realtime Activo:', currentStoreId);
                    }
                    if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                        setSyncStatus('polling');
                        console.warn('⚠️ Conexión Realtime caída. Activando polling de respaldo.');
                    }
                });
        };

        subscribe();

        // ============================================================
        // MEJORA 1 + 3: POLLING INTELIGENTE (Solo cuando Realtime falla)
        // ============================================================
        // El Worker es el ÚNICO mecanismo de polling (eliminamos setInterval duplicado)
        // Solo hace fetch cuando syncStatus NO es 'online'
        let worker: Worker | null = null;
        let isWorkerActive = false;

        const startWorkerPolling = () => {
            if (isWorkerActive || worker) return;

            try {
                worker = new Worker('/pollingWorker.js');
                let tickCount = 0;

                worker.onmessage = (e) => {
                    if (e.data === 'tick') {
                        tickCount++;
                        const isOnline = syncStatusRef.current === 'online';

                        // LÓGICA DE PULSO INTELIGENTE:
                        // Si está Offline/Polling: Cada 3 segundos (tickCount % 1)
                        // Si está Online: Cada 21 segundos (tickCount % 7) como backup
                        const shouldFetch = !isOnline || (tickCount % 7 === 0);

                        if (shouldFetch) {
                            if (!isOnline) {
                                console.log('⚡ Worker Polling agresivo (Realtime caído)...');
                            } else {
                                console.log('�️ Worker Safety Pulse (Backup remoto)...');
                            }
                            fetchData();
                        }
                    }
                };
                // Tick del worker cada 3 segundos
                worker.postMessage({ action: 'start', interval: 3000 });
                isWorkerActive = true;
                console.log('🔧 Worker de respaldo inteligente iniciado');
            } catch (e) {
                console.warn('Web Worker no soportado', e);
            }
        };

        startWorkerPolling();

        // ============================================================
        // RECONEXIÓN SILENCIOSA DEL WEBSOCKET (Cada 30s si está en 'polling')
        // ============================================================
        const reconnectInterval = setInterval(() => {
            if (syncStatusRef.current === 'polling' || syncStatusRef.current === 'offline') {
                console.log('♻️ Intentando reconectar Realtime...');
                if (channel) {
                    supabase.removeChannel(channel);
                }
                subscribe();
            }
        }, 30000); // Cada 30 segundos, no cada 9

        // Evento para cuando el usuario vuelve a la app
        const handleAutoRefresh = () => {
            console.log('📱 [SYNC] Wake/Focus detectado...');
            if (Date.now() - lastFetchRef.current > 3000) {
                fetchDataRef.current();
            }
            if (syncStatusRef.current !== 'online') {
                subscribe();
            }
        };

        window.addEventListener('focus', handleAutoRefresh);
        window.addEventListener('online', handleAutoRefresh);

        const visibilityHandler = () => {
            if (document.visibilityState === 'visible') {
                handleAutoRefresh();
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);

        return () => {
            if (worker) {
                worker.postMessage({ action: 'stop' });
                worker.terminate();
            }
            clearInterval(reconnectInterval);
            window.removeEventListener('focus', handleAutoRefresh);
            window.removeEventListener('online', handleAutoRefresh);
            document.removeEventListener('visibilitychange', visibilityHandler);
            if (channel) supabase.removeChannel(channel);
        };
    }, [currentStoreId, setReports, setDayClosures]); // Removido fetchData para evitar reinicios constantes

    // Efecto para mantener sincronizada la referencia del syncStatus
    // CRÍTICO: El Worker lee syncStatusRef.current para saber si debe hacer polling
    useEffect(() => {
        syncStatusRef.current = syncStatus;
        console.log('📊 Estado de sync actualizado:', syncStatus);
    }, [syncStatus]);

    // 3. Funciones de Sincronización (Memorizadas para estabilidad)
    const syncSale = useCallback(async (sale: SaleRecord) => {
        if (!currentStoreId) return;
        const { error } = await supabase.from('sales').upsert({
            id: sale.id,
            store_id: currentStoreId,
            date: sale.date,
            time: sale.time,
            customer_name: sale.customerName,
            table_number: sale.tableNumber,
            waiter: sale.waiter,
            total: sale.total,
            order_data: sale.order,
            notes: sale.notes,
            order_code: sale.orderCode,
            closed: sale.closed,
            type: sale.type,
            audit_notes: sale.auditNotes
        });
        if (error) console.error('Error syncing sale:', error);
    }, [currentStoreId]);

    const safeSyncSale = useCallback(async (sale: SaleRecord): Promise<{ success: boolean, errorType?: 'offline' | 'conflict' | 'error', remoteData?: SaleRecord }> => {
        if (!currentStoreId) return { success: false, errorType: 'error' };

        // DETECCIÓN OFFLINE: Si no hay red, asumimos éxito local (se guardará en localStorage)
        // pero avisamos que no se subió a la nube.
        if (!navigator.onLine) {
            console.warn('⚠️ Sin conexión. Guardando solo localmente.');
            return { success: false, errorType: 'offline' };
        }

        try {
            const { data: remoteData, error: fetchError } = await supabase
                .from('sales')
                .select('*')
                .eq('id', sale.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                // Si falla el fetch por algo que no es "no encontrado", asumimos error de red o servidor
                return { success: false, errorType: 'error' };
            }

            if (remoteData) {
                const remoteMapped = mapSaleFromSupabase(remoteData);
                // CONFLICTO REAL: Si en la nube ya está cerrada y aquí no, o si está anulada
                if (remoteMapped.closed && !sale.closed) return { success: false, errorType: 'conflict', remoteData: remoteMapped };
                if (remoteMapped.notes === 'ANULADO') return { success: false, errorType: 'conflict', remoteData: remoteMapped };

                // Si la versión remota es MÁS RECIENTE que la nuestra (por updated_at o similar), también es conflicto
                // Pero aquí asumimos que nuestra edición es la "verdad" si no está cerrada/anulada.
            }

            // Intentar subir
            const { error: upsertError } = await supabase.from('sales').upsert({
                id: sale.id,
                store_id: currentStoreId,
                date: sale.date,
                time: sale.time,
                customer_name: sale.customerName,
                table_number: sale.tableNumber,
                waiter: sale.waiter,
                total: sale.total,
                order_data: sale.order,
                notes: sale.notes,
                order_code: sale.orderCode,
                closed: sale.closed,
                type: sale.type,
                audit_notes: sale.auditNotes
                // updated_at removido para evitar error si no existe la columna
            });

            if (upsertError) {
                console.error('Error syncing sale:', upsertError);
                return { success: false, errorType: 'error' };
            }

            return { success: true };
        } catch (err) {
            console.error('Error en safeSyncSale:', err);
            return { success: false, errorType: 'error' };
        }
    }, [currentStoreId]);

    const syncSettings = useCallback(async (newSettings: AppSettings) => {
        if (!currentStoreId) return;
        const { error } = await supabase.from('settings').upsert({
            store_id: currentStoreId,
            business_name: newSettings.businessName,
            business_logo: newSettings.businessLogo,
            total_tables: newSettings.totalTables,
            printer_paper_width: newSettings.printerPaperWidth,
            exchange_rate_bcv: newSettings.exchangeRateBCV,
            exchange_rate_parallel: newSettings.exchangeRateParallel,
            active_exchange_rate: newSettings.activeExchangeRate,
            target_number: newSettings.targetNumber,
            is_whatsapp_enabled: newSettings.isWhatsAppEnabled,
            waiters_can_charge: newSettings.waitersCanCharge,
            kitchen_stations: newSettings.kitchenStations,
            users: newSettings.users,
            updated_at: new Date().toISOString()
        });
        if (error) console.error('Error syncing settings:', error);
    }, [currentStoreId]);

    const syncClosure = useCallback(async (closure: DayClosure) => {
        if (!currentStoreId) return;
        const { error } = await supabase.from('day_closures').insert({
            id: closure.id,
            store_id: currentStoreId,
            date: closure.date,
            closed_at: closure.closedAt,
            closed_by: closure.closedBy,
            is_admin_closure: closure.isAdminClosure,
            total_paid: closure.totalPaid,
            total_pending: closure.totalPending,
            total_voided: closure.totalVoided,
            sales_count: closure.salesCount,
            report_ids: closure.reportIds
        });
        if (error) console.error('Error syncing closure:', error);
    }, [currentStoreId]);

    // 4. Cola de Reintentos (Offline Sync Queue)
    useEffect(() => {
        // Ejecutar cada vez que syncStatus pase a online O haya un cambio en reports
        if (syncStatus !== 'online') return;

        const processQueue = async () => {
            const pendingSales = reports.filter(r => r._pendingSync);
            if (pendingSales.length === 0) return;

            console.log(`🔄 [SYNC] Procesando cola offline (${pendingSales.length} items)...`);

            for (const r of pendingSales) {
                const result = await safeSyncSale(r);
                if (result.success) {
                    setReports(prev => prev.map(curr => curr.id === r.id ? { ...curr, _pendingSync: undefined } : curr));
                } else if (result.errorType === 'conflict') {
                    setReports(prev => prev.map(curr => curr.id === r.id ? { ...curr, _pendingSync: undefined } : curr));
                    fetchDataRef.current();
                }
            }
        };

        // Delay pequeño para evitar colisiones al reconectar
        const timer = setTimeout(processQueue, 1500);
        return () => clearTimeout(timer);
    }, [syncStatus, reports.length]); // Solo re-ejecutar si cambia el status o la CANTIDAD de reports (nuevo offline)

    // Memorizar el objeto de retorno para estabilidad de los consumidores
    return useMemo(() => ({
        syncSale,
        safeSyncSale,
        syncSettings,
        syncClosure,
        refreshData: fetchData,
        syncStatus,
        lastSyncTime,
        forceRenderCount
    }), [syncSale, safeSyncSale, syncSettings, syncClosure, fetchData, syncStatus, lastSyncTime, forceRenderCount]);
};
