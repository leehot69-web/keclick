import { useEffect } from 'react';
import { supabase } from '../utils/supabase';
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
    // 1. Carga inicial (Solo si hay un storeId activo)
    useEffect(() => {
        if (!currentStoreId) return;

        const fetchData = async () => {
            // Cargar Ventas de la tienda actual
            const { data: salesData } = await supabase
                .from('sales')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('created_at', { ascending: false });

            if (salesData) {
                setReports(salesData.map(s => ({
                    ...s,
                    storeId: s.store_id,
                    order: s.order_data,
                    auditNotes: s.audit_notes
                })));
            }

            // Cargar Cierres de la tienda actual
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

            // Cargar Configuración (settings) de la tienda actual
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
        };

        fetchData();
    }, [currentStoreId]);

    // 2. Suscripción Realtime (Solo para la tienda activa)
    useEffect(() => {
        if (!currentStoreId) return;

        const channel = supabase
            .channel(`store-${currentStoreId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'sales',
                filter: `store_id=eq.${currentStoreId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newSale = payload.new as any;
                    setReports(prev => [
                        {
                            ...newSale,
                            storeId: newSale.store_id,
                            order: newSale.order_data,
                            auditNotes: newSale.audit_notes
                        },
                        ...prev
                    ]);
                } else if (payload.eventType === 'UPDATE') {
                    const updatedSale = payload.new as any;
                    setReports(prev => prev.map(r => r.id === updatedSale.id ? {
                        ...updatedSale,
                        storeId: updatedSale.store_id,
                        order: updatedSale.order_data,
                        auditNotes: updatedSale.audit_notes
                    } : r));
                } else if (payload.eventType === 'DELETE') {
                    setReports(prev => prev.filter(r => r.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStoreId, setReports]);

    // 3. Funciones de Sincronización
    const syncSale = async (sale: SaleRecord) => {
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
    };

    const syncSettings = async (newSettings: AppSettings) => {
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
    };

    const syncClosure = async (closure: DayClosure) => {
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
    };

    return { syncSale, syncSettings, syncClosure };
};
