import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AppSettings, SaleRecord, DayClosure, StoreProfile, MenuCategory, ModifierGroup, PizzaIngredient, ExpenseRecord, CashInjectionRecord } from '../types';
import { KECLICK_MENU_DATA, KECLICK_MODIFIERS, CLEAN_MENU_TEMPLATE } from '../constants';

export const useSupabaseSync = (
    settings: AppSettings,
    setSettings: (s: AppSettings | ((prev: AppSettings) => AppSettings)) => void,
    reports: SaleRecord[],
    setReports: (r: SaleRecord[] | ((prev: SaleRecord[]) => SaleRecord[])) => void,
    dayClosures: DayClosure[],
    setDayClosures: (d: DayClosure[] | ((prev: DayClosure[]) => DayClosure[])) => void,
    menu: any[],
    setMenu: (m: any[] | ((prev: any[]) => any[])) => void,
    modifierGroups: any[],
    setModifierGroups: (m: any[] | ((prev: any[]) => any[])) => void,
    pizzaIngredients: PizzaIngredient[],
    setPizzaIngredients: (p: PizzaIngredient[] | ((prev: PizzaIngredient[]) => PizzaIngredient[])) => void,
    pizzaBasePrices: Record<string, number>,
    setPizzaBasePrices: (p: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void,
    expenses: ExpenseRecord[],
    setExpenses: (e: ExpenseRecord[] | ((prev: ExpenseRecord[]) => ExpenseRecord[])) => void,
    injections: CashInjectionRecord[],
    setInjections: (i: CashInjectionRecord[] | ((prev: CashInjectionRecord[]) => CashInjectionRecord[])) => void,
    currentStoreId: string | null
) => {
    const [syncStatus, setSyncStatus] = useState<'connecting' | 'online' | 'offline' | 'polling'>('connecting');
    const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
    const [forceRenderCount, setForceRenderCount] = useState(0);

    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const lastFetchRef = useRef<number>(Date.now());
    const syncStatusRef = useRef<string>('connecting');

    // Función para forzar re-render de la UI
    const forceUIUpdate = useCallback(() => {
        setForceRenderCount(prev => prev + 1);
        setLastSyncTime(new Date());
    }, []);

    const mapSaleFromSupabase = useCallback((s: any): SaleRecord => ({
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
    }), []);

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
                // ESTRATEGIA DE SINCRONIZACIÓN ESTRICTA:
                // Si la base de datos dice que hay X registros, el cliente debe mostrar X registros.
                // Eliminamos la lógica de fusión compleja que mantenía registros "fantasmas" locales.
                const sales = salesData as any[];
                const mappedSales = sales.map(mapSaleFromSupabase);

                setReports(prev => {
                    // Mantenemos SOLO los que tienen _pendingSync (cambios locales no subidos)
                    // que NO estén ya en la respuesta del servidor (para evitar duplicados)
                    const pendingLocals = prev.filter(p => p._pendingSync && !mappedSales.find(r => r.id === p.id));

                    const newReports = [...pendingLocals, ...mappedSales];

                    // Si la longitud cambió drásticamente (ej: borrado masivo), forzar actualización
                    if (prev.length > 0 && newReports.length === 0) {
                        console.log('🧹 [SYNC] Base de datos vacía detectada. Limpiando local.');
                        return [];
                    }

                    const currentDataStr = JSON.stringify(prev);
                    const newDataStr = JSON.stringify(newReports);

                    if (currentDataStr !== newDataStr) {
                        console.log('✨ [SYNC] Datos de ventas sincronizados (Sobreescritura Autoritativa).');
                        forceUIUpdate();
                        return newReports;
                    }
                    return prev;
                });
            } else {
                // Si salesData es null o vacío y no hubo error, asumimos que no hay ventas
                setReports([]);
            }

            // Cierres
            const { data: closuresData } = await supabase
                .from('day_closures')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('closed_at', { ascending: false });

            if (closuresData) {
                // Sincronización Estricta para Cierres
                const mappedClosures = closuresData.map(c => ({
                    id: c.id,
                    storeId: c.store_id,
                    date: c.date,
                    closedAt: c.closed_at,
                    closedBy: c.closed_by,
                    isAdminClosure: c.is_admin_closure,
                    totalPaid: c.total_paid,
                    totalPending: c.total_pending,
                    totalVoided: c.total_voided,
                    salesCount: c.sales_count,
                    reportIds: c.report_ids,
                    reconciliation: c.reconciliation_data
                }));

                setDayClosures(prev => {
                    const current = JSON.stringify(prev);
                    const next = JSON.stringify(mappedClosures);
                    if (current !== next) {
                        console.log('✨ [SYNC] Cierres sincronizados (Sobreescritura).');
                        return mappedClosures;
                    }
                    return prev;
                });
            } else {
                setDayClosures([]);
            }

            // Gastos
            const { data: expensesData } = await supabase
                .from('expenses')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('date', { ascending: false })
                .limit(100);

            if (expensesData) {
                const mappedExpenses = expensesData.map(e => ({ ...e, storeId: e.store_id }));
                setExpenses(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(mappedExpenses)) return mappedExpenses;
                    return prev;
                });
            } else {
                setExpenses([]);
            }

            // Inyecciones
            const { data: injectionsData } = await supabase
                .from('cash_injections')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('date', { ascending: false })
                .limit(100);

            if (injectionsData) {
                const mappedInjections = injectionsData.map(i => ({ ...i, storeId: i.store_id }));
                setInjections(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(mappedInjections)) return mappedInjections;
                    return prev;
                });
            } else {
                setInjections([]);
            }

            // 3. Settings (RESTAURADO)
            const { data: settingsData } = await supabase
                .from('settings')
                .select('*')
                .eq('store_id', currentStoreId)
                .single();

            if (settingsData) {
                const updatedStatus = {
                    ...settingsData,
                    storeId: settingsData.store_id,
                    kitchenStations: settingsData.kitchen_stations,
                    users: settingsData.users,
                    menuSource: settingsData.menu_source || 'demo'
                };

                setSettings(prev => {
                    const current = JSON.stringify(prev);
                    const next = JSON.stringify({ ...prev, ...updatedStatus });
                    if (current !== next) return { ...prev, ...updatedStatus };
                    return prev;
                });

                // Sincronizar Configuración de Pizza
                if (settingsData.pizza_ingredients) {
                    const newIngs = settingsData.pizza_ingredients;
                    if (JSON.stringify(pizzaIngredients) !== JSON.stringify(newIngs)) {
                        console.log('🍕 [SYNC] Ingredientes de pizza actualizados.');
                        setPizzaIngredients(newIngs);
                    }
                }
                if (settingsData.pizza_base_prices) {
                    const newPrices = settingsData.pizza_base_prices;
                    if (JSON.stringify(pizzaBasePrices) !== JSON.stringify(newPrices)) {
                        console.log('🍕 [SYNC] Precios base de pizza actualizados.');
                        setPizzaBasePrices(newPrices);
                    }
                }

                // Si está en MODO DEMO, forzar el menú de las constantes
                if (updatedStatus.menuSource === 'demo') {
                    if (JSON.stringify(menu) !== JSON.stringify(KECLICK_MENU_DATA)) {
                        console.log('🛰️ [SYNC] Modo DEMO activo: Aplicando Menú Estándar.');
                        setMenu(KECLICK_MENU_DATA);
                    }
                    if (JSON.stringify(modifierGroups) !== JSON.stringify(KECLICK_MODIFIERS)) {
                        setModifierGroups(KECLICK_MODIFIERS);
                    }
                    // Saltar el resto del fetch de menú
                    setSyncStatus(prev => prev === 'offline' ? 'polling' : prev);
                    return;
                }
            }

            // 4. Menu & Modifiers (NUEVAS TABLAS - SOLO SI NO ES DEMO)
            const { data: remoteCategories } = await supabase
                .from('menu_categories')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('order_index', { ascending: true });

            const { data: remoteItems } = await supabase
                .from('menu_items')
                .select('*')
                .eq('store_id', currentStoreId);

            const { data: remoteModifiers } = await supabase
                .from('modifier_groups')
                .select('*')
                .eq('store_id', currentStoreId);

            // Sincronizar Modificadores
            if (remoteModifiers && remoteModifiers.length > 0) {
                const mappedModifiers = remoteModifiers.map(m => ({
                    title: m.title,
                    selectionType: m.selection_type,
                    minSelection: m.min_selection,
                    maxSelection: m.max_selection,
                    options: m.options,
                    freeSelectionCount: m.free_selection_count,
                    extraPrice: m.extra_price
                }));
                const currentModStr = JSON.stringify(modifierGroups);
                const newModStr = JSON.stringify(mappedModifiers);
                if (currentModStr !== newModStr) {
                    console.log('✨ [SYNC] Grupos de modificadores actualizados.');
                    setModifierGroups(mappedModifiers);
                }
            }

            // Sincronizar Menú (Reconstruir estructura de categorías)
            let finishedMenu = [];
            if (remoteCategories && remoteCategories.length > 0 && remoteItems) {
                finishedMenu = remoteCategories.map(cat => {
                    const catItems = remoteItems
                        .filter(item => item.category_id === cat.id)
                        .map(item => ({
                            name: item.name,
                            price: parseFloat(item.price),
                            available: item.available,
                            description: item.description,
                            image: item.image,
                            isPizza: item.is_pizza,
                            isSpecialPizza: item.is_special_pizza,
                            defaultIngredients: item.default_ingredients,
                            isCombo: item.is_combo,
                            comboIncludes: item.combo_includes,
                            kitchenStations: item.kitchen_stations,
                            modifierGroupTitles: item.modifier_group_titles
                        }));
                    return {
                        title: cat.title,
                        items: catItems
                    };
                });
            } else {
                // Si es real pero está vacío, usamos el template limpio
                finishedMenu = CLEAN_MENU_TEMPLATE;
            }

            const currentMenuStr = JSON.stringify(menu);
            const newMenuStr = JSON.stringify(finishedMenu);
            if (currentMenuStr !== newMenuStr) {
                console.log('✨ [SYNC] Menú dinámico actualizado.');
                setMenu(finishedMenu);
            }

            setSyncStatus(prev => prev === 'offline' ? 'polling' : prev);
        } catch (err) {
            console.error("❌ [SYNC] Error en fetchData:", err);
            setSyncStatus('offline');
        }
    }, [currentStoreId, setReports, setDayClosures, setSettings, setMenu, setModifierGroups, menu, modifierGroups, mapSaleFromSupabase, forceUIUpdate]);

    const fetchDataRef = useRef(fetchData);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

    // Wake Lock Logic
    const activateWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
            try {
                const wakeLock = await navigator.wakeLock.request('screen');
                wakeLockRef.current = wakeLock;
                console.log('🛡️ Wake Lock ACTIVADO');
            } catch (err: any) {
                console.warn(`⚠️ Wake Lock Error: ${err.message}`);
            }
        }
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('👀 App visible (Focus Sync)');
                fetchDataRef.current();
                activateWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        activateWakeLock();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) wakeLockRef.current.release();
        };
    }, [activateWakeLock]);

    // Heartbeat Polling
    useEffect(() => {
        if (!currentStoreId) return;

        const intervalId = setInterval(() => {
            const timeSinceLastData = Date.now() - lastFetchRef.current;
            const isOnline = syncStatusRef.current === 'online';

            // Si no estamos 'online', pulsamos cada 2.5s
            // Si estamos 'online', pulsamos cada 20s como medida de seguridad
            const shouldPulse = !isOnline || timeSinceLastData > 20000;

            if (shouldPulse) {
                fetchDataRef.current();
            }
        }, 2500);

        return () => clearInterval(intervalId);
    }, [currentStoreId]);

    // Carga inicial
    useEffect(() => {
        if (currentStoreId) fetchData();
    }, [currentStoreId, fetchData]);

    // Realtime Subscriptions
    useEffect(() => {
        if (!currentStoreId) return;

        let channel: any = null;
        let deviceId = localStorage.getItem('keclick_device_uuid') || ('dev_' + Math.random().toString(36).substr(2, 9));
        localStorage.setItem('keclick_device_uuid', deviceId);

        const subscribe = () => {
            if (channel) supabase.removeChannel(channel);

            channel = supabase
                .channel(`realtime_${currentStoreId}_${deviceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'sales',
                    filter: `store_id=eq.${currentStoreId}`
                }, async (payload) => {
                    setSyncStatus('online');
                    lastFetchRef.current = Date.now();
                    const payloadData = payload.new as any || payload.old as any;

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        console.log('⚡ [REALTIME] Cambio detectado:', payload.eventType);
                        let fullSale: SaleRecord;

                        // Si el payload ya trae los datos, los usamos directo.
                        if (payloadData && payloadData.order_data) {
                            fullSale = mapSaleFromSupabase(payloadData);
                        } else {
                            // Si faltan datos, intentamos leer, pero con protección anti-crash.
                            try {
                                console.log('⚡ [REALTIME] Fetching details for ID:', payloadData.id);
                                const { data, error } = await supabase.from('sales').select('*').eq('id', payloadData.id).single();

                                if (error) {
                                    console.warn('⚠️ [REALTIME] No se pudo leer el detalle de la venta (Error 406 prevenido):', error);
                                    return; // Abortamos suavemente sin romper la app
                                }

                                if (!data) return;
                                fullSale = mapSaleFromSupabase(data);
                            } catch (err) {
                                console.error('❌ [REALTIME] Error fatal intentando leer detalles:', err);
                                return;
                            }
                        }

                        setReports(prev => {
                            if (payload.eventType === 'INSERT') {
                                if (prev.some(r => r.id === fullSale.id)) return prev;
                                return [fullSale, ...prev];
                            } else {
                                const existing = prev.find(r => r.id === fullSale.id);
                                if (existing?._pendingSync) return prev;
                                return prev.map(r => r.id === fullSale.id ? fullSale : r);
                            }
                        });
                        forceUIUpdate();
                    } else if (payload.eventType === 'DELETE') {
                        setReports(prev => prev.filter(r => r.id !== payloadData.id));
                        forceUIUpdate();
                    }
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'expenses',
                    filter: `store_id=eq.${currentStoreId}`
                }, (payload) => {
                    setSyncStatus('online');
                    if (payload.eventType === 'INSERT') {
                        const payloadData = payload.new as any;
                        setExpenses(prev => {
                            if (prev.some(e => e.id === payloadData.id)) return prev;
                            return [{ ...payloadData, storeId: payloadData.store_id }, ...prev];
                        });
                        forceUIUpdate();
                    }
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'cash_injections',
                    filter: `store_id=eq.${currentStoreId}`
                }, (payload) => {
                    setSyncStatus('online');
                    if (payload.eventType === 'INSERT') {
                        const payloadData = payload.new as any;
                        setInjections(prev => {
                            if (prev.some(i => i.id === payloadData.id)) return prev;
                            return [{ ...payloadData, storeId: payloadData.store_id }, ...prev];
                        });
                        forceUIUpdate();
                    }
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'day_closures',
                    filter: `store_id=eq.${currentStoreId}`
                }, (payload) => {
                    setSyncStatus('online');
                    lastFetchRef.current = Date.now();
                    if (payload.eventType === 'INSERT') {
                        const newClosure = payload.new as any;
                        const mappedClosure: DayClosure = {
                            id: newClosure.id,
                            storeId: newClosure.store_id,
                            date: newClosure.date,
                            closedAt: newClosure.closed_at,
                            closedBy: newClosure.closed_by,
                            isAdminClosure: newClosure.is_admin_closure,
                            totalPaid: newClosure.total_paid,
                            totalPending: newClosure.total_pending,
                            totalVoided: newClosure.total_voided,
                            salesCount: newClosure.sales_count,
                            reportIds: newClosure.report_ids,
                            reconciliation: newClosure.reconciliation_data
                        };
                        setDayClosures(prev => {
                            if (prev.some(c => c.id === mappedClosure.id)) return prev;
                            return [mappedClosure, ...prev];
                        });
                        forceUIUpdate();
                    }
                })
                // NUEVO: Listeners para Menú y Configuración
                .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `store_id=eq.${currentStoreId}` }, () => {
                    console.log('🍔 [REALTIME] Menú actualizado. Recargando...');
                    fetchDataRef.current();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categories', filter: `store_id=eq.${currentStoreId}` }, () => {
                    console.log('📂 [REALTIME] Categorías actualizadas. Recargando...');
                    fetchDataRef.current();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'modifier_groups', filter: `store_id=eq.${currentStoreId}` }, () => {
                    console.log('✨ [REALTIME] Grupos de Modificadores cambiados. Recargando...');
                    fetchDataRef.current();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `store_id=eq.${currentStoreId}` }, () => {
                    console.log('⚙️ [REALTIME] Configuración cambiada. Recargando...');
                    fetchDataRef.current();
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') setSyncStatus('online');
                    if (status === 'CHANNEL_ERROR' || status === 'CLOSED') setSyncStatus('polling');
                });
        };

        subscribe();

        const reconnectInterval = setInterval(() => {
            if (syncStatusRef.current !== 'online') subscribe();
        }, 15000);

        return () => {
            clearInterval(reconnectInterval);
            if (channel) supabase.removeChannel(channel);
        };
    }, [currentStoreId, mapSaleFromSupabase, setReports, setDayClosures, setExpenses, setInjections, forceUIUpdate]);

    useEffect(() => {
        syncStatusRef.current = syncStatus;
    }, [syncStatus]);

    // Internal sync implementations
    const syncSale = useCallback(async (sale: SaleRecord) => {
        if (!currentStoreId) return;
        await supabase.from('sales').upsert({
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
    }, [currentStoreId]);

    const safeSyncSale = useCallback(async (sale: SaleRecord): Promise<{ success: boolean, errorType?: 'offline' | 'conflict' | 'error', remoteData?: SaleRecord }> => {
        if (!currentStoreId) return { success: false, errorType: 'error' };

        if (!navigator.onLine) return { success: false, errorType: 'offline' };

        try {
            // MODIFICACIÓN DE EMERGENCIA: Saltamos la lectura previa para evitar el Error 406.
            // Vamos directo a guardar (Upsert).
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
            });

            if (upsertError) {
                console.error("Error al guardar venta:", upsertError);
                return { success: false, errorType: 'error' };
            }

            return { success: true };
        } catch (err) {
            console.error("Excepción en safeSyncSale:", err);
            return { success: false, errorType: 'error' };
        }
    }, [currentStoreId]);

    const syncSettings = useCallback(async (newSettings: AppSettings) => {
        if (!currentStoreId) return;
        await supabase.from('settings').upsert({
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
    }, [currentStoreId]);

    const syncClosure = useCallback(async (closure: DayClosure) => {
        if (!currentStoreId) return;
        await supabase.from('day_closures').insert({
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
            report_ids: closure.reportIds,
            reconciliation_data: closure.reconciliation
        });
    }, [currentStoreId]);

    const syncExpense = useCallback(async (expense: ExpenseRecord) => {
        if (!currentStoreId) return;
        await supabase.from('expenses').upsert({
            id: expense.id,
            store_id: currentStoreId,
            amount: expense.amount,
            description: expense.description,
            category: expense.category,
            date: expense.date,
            time: expense.time,
            user: expense.user
        });
    }, [currentStoreId]);

    const syncInjection = useCallback(async (injection: CashInjectionRecord) => {
        if (!currentStoreId) return;
        await supabase.from('cash_injections').upsert({
            id: injection.id,
            store_id: currentStoreId,
            amount: injection.amount,
            description: injection.description,
            date: injection.date,
            time: injection.time,
            user: injection.user
        });
    }, [currentStoreId]);

    const syncMenu = useCallback(async (categories: MenuCategory[], modifiers: ModifierGroup[]) => {
        if (!currentStoreId) return { success: false, error: 'No store selected' };

        try {
            console.log('📤 [SYNC] Sincronizando menú completo con la nube...');

            // 1. Limpiar datos viejos de esta tienda para evitar duplicados/huérfanos
            // (En un sistema real usaríamos upsert con IDs reales, pero para el menú dinámico v1
            // el wipe & push es más fiable para mantener la estructura limpia)
            await supabase.from('modifier_groups').delete().eq('store_id', currentStoreId);
            await supabase.from('menu_items').delete().eq('store_id', currentStoreId);
            await supabase.from('menu_categories').delete().eq('store_id', currentStoreId);

            // 2. Insertar Modificadores
            if (modifiers.length > 0) {
                const modsToInsert = modifiers.map(m => ({
                    store_id: currentStoreId,
                    title: m.title,
                    selection_type: m.selectionType,
                    min_selection: m.minSelection,
                    max_selection: m.maxSelection,
                    options: m.options,
                    free_selection_count: m.freeSelectionCount,
                    extra_price: m.extraPrice
                }));
                await supabase.from('modifier_groups').insert(modsToInsert);
            }

            // 3. Insertar Categorias e Items
            for (let i = 0; i < categories.length; i++) {
                const cat = categories[i];
                const { data: catData, error: catErr } = await supabase
                    .from('menu_categories')
                    .insert({
                        store_id: currentStoreId,
                        title: cat.title,
                        order_index: i
                    })
                    .select()
                    .single();

                if (catErr) throw catErr;

                if (cat.items.length > 0) {
                    const itemsToInsert = cat.items.map(item => ({
                        store_id: currentStoreId,
                        category_id: catData.id,
                        name: item.name,
                        price: item.price,
                        available: item.available,
                        description: item.description,
                        image: item.image,
                        is_pizza: item.isPizza,
                        is_special_pizza: item.isSpecialPizza,
                        default_ingredients: item.defaultIngredients,
                        is_combo: item.isCombo,
                        combo_includes: item.comboIncludes,
                        kitchen_stations: item.kitchenStations,
                        modifier_group_titles: item.modifierGroupTitles
                    }));
                    await supabase.from('menu_items').insert(itemsToInsert);
                }
            }

            console.log('✅ [SYNC] Menú sincronizado exitosamente.');
            return { success: true };
        } catch (err) {
            console.error('❌ [SYNC] Error sincronizando menú:', err);
            return { success: false, error: err };
        }
    }, [currentStoreId]);

    // Offline queue processing
    useEffect(() => {
        if (syncStatus !== 'online') return;

        const processQueue = async () => {
            const pendingSales = reports.filter(r => r._pendingSync);
            if (pendingSales.length === 0) return;

            console.log(`🔄 [SYNC] Procesando cola offline (${pendingSales.length})...`);

            for (const r of pendingSales) {
                const result = await safeSyncSale(r);
                if (result.success || result.errorType === 'conflict') {
                    setReports(prev => prev.map(curr => curr.id === r.id ? { ...curr, _pendingSync: undefined } : curr));
                    if (result.errorType === 'conflict') fetchDataRef.current();
                }
            }
        };

        const timer = setTimeout(processQueue, 3000);
        return () => clearTimeout(timer);
    }, [syncStatus, reports.length, safeSyncSale, setReports]);

    return useMemo(() => ({
        syncSale,
        safeSyncSale,
        syncSettings,
        syncClosure,
        syncExpense,
        syncInjection,
        syncMenu,
        refreshData: fetchData,
        syncStatus,
        lastSyncTime,
        forceRenderCount
    }), [syncSale, safeSyncSale, syncSettings, syncClosure, syncExpense, syncInjection, syncMenu, fetchData, syncStatus, lastSyncTime, forceRenderCount]);
};
