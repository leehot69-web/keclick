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
    modifierGroups: any[]
) => {
    // 1. Carga inicial
    useEffect(() => {
        const fetchData = async () => {
            // Cargar Ventas
            const { data: salesData } = await supabase
                .from('sales')
                .select('*')
                .order('created_at', { ascending: false });

            if (salesData) {
                setReports(salesData.map(s => ({
                    ...s,
                    order: s.order_data,
                    auditNotes: s.audit_notes
                })));
            }

            // Cargar Cierres
            const { data: closuresData } = await supabase
                .from('day_closures')
                .select('*')
                .order('closed_at', { ascending: false });

            if (closuresData) {
                setDayClosures(closuresData.map(c => ({
                    ...c,
                    reportIds: c.report_ids
                })));
            }

            // Cargar Configuración (settings)
            const { data: settingsData } = await supabase
                .from('settings')
                .select('*')
                .eq('id', 'current_settings')
                .single();

            if (settingsData) {
                setSettings({
                    ...settingsData,
                    kitchenStations: settingsData.kitchen_stations,
                    users: settingsData.users
                });
            }
        };

        fetchData();
    }, []);

    // 2. Suscripción Realtime para Ventas (Crucial para KitchenScreen)
    useEffect(() => {
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newSale = payload.new as any;
                    setReports(prev => [
                        {
                            ...newSale,
                            order: newSale.order_data,
                            auditNotes: newSale.audit_notes
                        },
                        ...prev
                    ]);
                } else if (payload.eventType === 'UPDATE') {
                    const updatedSale = payload.new as any;
                    setReports(prev => prev.map(r => r.id === updatedSale.id ? {
                        ...updatedSale,
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
    }, [setReports]);

    // 3. Funciones de Sincronización (para ser llamadas desde App.tsx)
    const syncSale = async (sale: SaleRecord) => {
        const { error } = await supabase.from('sales').upsert({
            id: sale.id,
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
        const { error } = await supabase.from('settings').upsert({
            id: 'current_settings',
            store_id: newSettings.storeId,
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
        const { error } = await supabase.from('day_closures').insert({
            id: closure.id,
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
