import React, { useState, useEffect, useCallback } from 'react';
import { View, MenuItem, StoreProfile, CartItem, CustomerDetails, SelectedModifier, MenuCategory, ModifierGroup, AppSettings, SaleRecord, ThemeName, PizzaConfiguration, PizzaIngredient, PizzaSize, User, DayClosure, UserRole, ExpenseRecord, CashInjectionRecord } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { KECLICK_MENU_DATA, KECLICK_MODIFIERS, PIZZA_BASE_PRICES, PIZZA_INGREDIENTS } from './constants';
import MenuScreen from './components/MenuScreen';
import CartScreen from './components/CartScreen';
import CheckoutScreen from './components/CheckoutScreen';
import ProductModifierModal from './components/ProductModifierModal';
import SplashScreen from './components/SplashScreen';
import SettingsScreen from './components/SettingsScreen';
import ReportsScreen from './components/ReportsScreen';
import InstallPromptModal from './components/InstallPromptModal';
import './print.css';
import { generateTestPrintCommands, generateReceiptCommands } from './utils/escpos';
import SalesHistoryModal from './components/SalesHistoryModal';
import ConfirmOrderModal from './components/ConfirmOrderModal';
import SuccessScreen from './components/SuccessScreen';
import AdminAuthModal from './components/AdminAuthModal';
import PizzaBuilderModal from './components/PizzaBuilderModal';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import KitchenScreen from './components/KitchenScreen';
import RegistrationScreen from './components/RegistrationScreen';
import MasterApp from './components/MasterApp';
import FloorPlanScreen from './components/FloorPlanScreen';
import { supabase } from './utils/supabase';
import { useSessionStorage } from './hooks/useSessionStorage';

function App() {
  // --- ESTADO PERSISTENTE ---
  const [menu, setMenu] = useLocalStorage<MenuCategory[]>('app_menu_v1', KECLICK_MENU_DATA);

  const [modifierGroups, setModifierGroups] = useLocalStorage<ModifierGroup[]>('app_modifiers_v1', KECLICK_MODIFIERS);
  const [theme, setTheme] = useLocalStorage<ThemeName>('app_theme_v1', 'red');
  const [businessName, setBusinessName] = useLocalStorage<string>('app_business_name_v1', 'Keclick');
  const [pizzaIngredients, setPizzaIngredients] = useLocalStorage<PizzaIngredient[]>('app_pizza_ingredients_v1', PIZZA_INGREDIENTS);
  const [pizzaBasePrices, setPizzaBasePrices] = useLocalStorage<Record<string, number>>('app_pizza_base_prices_v1', PIZZA_BASE_PRICES);
  const businessLogo = "https://i.imgur.com/8bfbsEL.png";

  // CAMBIO CRÍTICO: Usar SessionStorage para permitir múltiples sesiones en diferentes pestañas
  const [currentUser, setCurrentUser] = useSessionStorage<User | null>('app_current_user_v1', null);
  // Ref para trackear inicio de sesión y evitar logout por cierres previos
  const loginTimestampRef = React.useRef<number>(Date.now());
  const [removalReasons, setRemovalReasons] = useState<Record<string, string>>({});

  const [settings, setSettings] = useLocalStorage<AppSettings>('app_settings_v3', {
    storeId: 'NEW_STORE',
    businessName: 'Keclick',
    businessLogo: 'https://i.imgur.com/8bfbsEL.png',
    totalTables: 20,
    printerPaperWidth: '58mm',
    exchangeRateBCV: 36.5,
    exchangeRateParallel: 40,
    activeExchangeRate: 'parallel',
    isTrialActive: false,
    isLicenseActive: false,
    trialStartDate: undefined,
    operationCount: 0,
    lifetimeRevenueUSD: 0,
    targetNumber: '',
    isWhatsAppEnabled: true,
    waitersCanCharge: true,
    kitchenStations: [
      { id: 'general', name: 'Cocina General', color: '#FF0000' }
    ],
    users: [
      { id: '1', name: 'Admin', pin: '0000', role: 'admin' },
      { id: 'cook-default', name: 'Cocina', pin: '9999', role: 'cocinero', kitchenStation: 'general' }
    ]
  });

  // --- LÓGICA DE LICENCIA Y SUSCRIPCIÓN ---
  const isSubscriptionInactive = React.useMemo(() => {
    const now = new Date();
    if (settings.isLicenseActive) {
      if (!settings.licenseExpiryDate) return false;
      const expiry = new Date(settings.licenseExpiryDate);
      return now > expiry;
    }
    if (settings.trialStartDate) {
      const start = new Date(settings.trialStartDate);
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 5;
    }
    return false;
  }, [settings.trialStartDate, settings.isLicenseActive, settings.licenseExpiryDate]);

  const KeclickLogo = ({ size = "text-3xl" }: { size?: string }) => (
    <div className={`font-black ${size} uppercase tracking-tighter flex items-center`}>
      <span className="text-[#FF0000]">Ke</span>
      <span className="text-[#FFD700]">click</span>
    </div>
  );

  useEffect(() => {
    let updated = false;
    let newSettings = { ...settings };
    const hasAlejandro = settings.users.some(u => u.name.toLowerCase() === 'alejandro');
    if (!hasAlejandro) {
      const newAlejandro = { id: Math.random().toString(36).substr(2, 9), name: 'Alejandro', pin: '1111', role: 'mesero' as UserRole };
      newSettings.users = [...newSettings.users, newAlejandro];
      updated = true;
    }
    const hasCook = settings.users.some(u => u.role === 'cocinero' || u.pin === '9999');
    if (!hasCook) {
      const newCook = { id: 'cook-default', name: 'Cocina', pin: '9999', role: 'cocinero' as UserRole, kitchenStation: 'general' };
      newSettings.users = [...newSettings.users, newCook];
      updated = true;
    }
    if (!settings.kitchenStations || settings.kitchenStations.length === 0) {
      newSettings.kitchenStations = [{ id: 'general', name: 'Cocina General', color: '#10B981' }];
      updated = true;
    }
    if (settings.waitersCanCharge === undefined) {
      newSettings.waitersCanCharge = true;
      updated = true;
    }
    if (updated) setSettings(newSettings);
  }, [settings, setSettings]);

  const [reports, setReports] = useLocalStorage<SaleRecord[]>('app_sales_reports', []);
  const [dayClosures, setDayClosures] = useLocalStorage<DayClosure[]>('app_day_closures', []);
  const [cart, setCart] = useLocalStorage<CartItem[]>('active_cart_data', []);
  const [editingReportId, setEditingReportId] = useLocalStorage<string | null>('active_editing_report_id', null);
  const [currentView, setCurrentView] = useState<View>('menu');
  const [isAppReady, setIsAppReady] = useState(false);
  const [triggerCartShake, setTriggerCartShake] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [modifierModalItem, setModifierModalItem] = useState<MenuItem | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [isSalesHistoryModalOpen, setIsSalesHistoryModalOpen] = useState(false);
  const [isConfirmOrderModalOpen, setConfirmOrderModalOpen] = useState(false);
  const [pendingReopenOrderId, setPendingReopenOrderId] = useState<string | null>(null);
  const [pendingVoidReportId, setPendingVoidReportId] = useState<string | null>(null);
  const [viewOnlyReport, setViewOnlyReport] = useState<SaleRecord | null>(null);
  const [expenses, setExpenses] = useLocalStorage<ExpenseRecord[]>('app_expenses', []);
  const [injections, setInjections] = useLocalStorage<CashInjectionRecord[]>('app_injections', []);

  const executeReopenOrder = async () => {
    const target = reports.find(r => r.id === pendingReopenOrderId);
    if (!target) return;
    const updated = { ...target, notes: 'PENDIENTE', total: target.total };
    setReports(reports.map(r => r.id === pendingReopenOrderId ? updated : r));
    setPendingReopenOrderId(null);
    await safeSyncSale(updated);
  };
  const [showMasterDashboard, setShowMasterDashboard] = useState(false);

  useEffect(() => {
    // @ts-ignore
    window.onShowMaster = () => setShowMasterDashboard(true);
    // @ts-ignore
    return () => { window.onShowMaster = undefined; };
  }, []);

  const handleJoin = async (storeId: string) => {
    const { data: storeData, error: storeError } = await supabase.from('stores').select('*').eq('id', storeId).single();
    if (storeError || !storeData) return false;
    const { data: settingsData, error: settingsError } = await supabase.from('settings').select('*').eq('store_id', storeId).single();
    if (settingsError || !settingsData) return false;
    const updatedSettings: AppSettings = {
      ...settings,
      storeId: storeData.id,
      businessName: storeData.name,
      targetNumber: settingsData.target_number,
      isTrialActive: settingsData.is_trial_active,
      trialStartDate: settingsData.trial_start_date,
      isLicenseActive: settingsData.is_license_active,
      licenseExpiryDate: settingsData.license_expiry_date,
      kitchenStations: settingsData.kitchen_stations || settings.kitchenStations,
      users: settingsData.users || settings.users
    };
    setSettings(updatedSettings);
    setBusinessName(storeData.name);
    setCurrentView('menu');
    return true;
  };

  const handleRegister = async (businessNameInput: string, phone: string) => {
    const newStoreId = `KC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const now = new Date();
    const newSettings: AppSettings = {
      ...settings,
      storeId: newStoreId,
      businessName: businessNameInput,
      targetNumber: phone,
      isTrialActive: true,
      trialStartDate: now.toISOString(),
      isLicenseActive: false,
      operationCount: 0,
      lifetimeRevenueUSD: 0
    };
    setSettings(newSettings);
    setBusinessName(businessNameInput);
    await supabase.from('stores').insert({
      id: newStoreId,
      name: businessNameInput,
      owner_phone: phone,
      status: 'trial',
      trial_ends_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
    });
    await supabase.from('settings').insert({
      store_id: newStoreId,
      business_name: businessNameInput,
      target_number: phone,
      is_whatsapp_enabled: true,
      kitchen_stations: settings.kitchenStations,
      users: settings.users
    });
    setCurrentView('menu');
  };

  const handleRecoverId = async (phone: string) => {
    const { data, error } = await supabase.from('stores').select('id, name').eq('owner_phone', phone).maybeSingle();
    if (error || !data) return null;
    return { id: data.id, name: data.name };
  };

  const {
    syncSale, safeSyncSale, syncSettings, syncClosure, syncExpense, syncInjection, syncMenu,
    refreshData, syncStatus, lastSyncTime, forceRenderCount
  } = useSupabaseSync(
    settings, setSettings, reports, setReports, dayClosures, setDayClosures,
    menu, setMenu, modifierGroups, setModifierGroups, pizzaIngredients, setPizzaIngredients,
    pizzaBasePrices, setPizzaBasePrices, expenses, setExpenses, injections, setInjections,
    settings.storeId === 'NEW_STORE' ? null : settings.storeId
  );

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await refreshData();
    setTimeout(() => setIsSyncing(false), 500);
  };

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') handleManualSync(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshData]);

  const [isAdminAuthForClearCart, setIsAdminAuthForClearCart] = useState(false);
  const [pendingRemoveItemId, setPendingRemoveItemId] = useState<string | null>(null);
  const [pizzaBuilderItem, setPizzaBuilderItem] = useState<MenuItem | null>(null);
  const [lastSoldRecord, setLastSoldRecord] = useState<{ cart: CartItem[], details: CustomerDetails } | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<{ cart: CartItem[], customer: CustomerDetails, waiter: string, title: string } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const latestClosure = dayClosures[0];
    if (latestClosure && latestClosure.date === today) {
      // SOLO cerrar sesión si el cierre ocurrió DESPUÉS de que el usuario inició sesión
      // Esto permite "reabrir" operaciones o iniciar un nuevo turno tras un cierre
      const closureTime = new Date(latestClosure.closedAt).getTime();
      const loginTime = loginTimestampRef.current;

      if (closureTime > loginTime) {
        if (latestClosure.isAdminClosure || latestClosure.closedBy === currentUser.name) {
          handleLogout();
          alert("La jornada ha sido cerrada por administración o desde otro dispositivo. Sesión finalizada.");
        }
      }
    }
  }, [dayClosures, currentUser]);

  const readyPlatesDetails = React.useMemo(() => {
    if (!currentUser) return [];
    const today = new Date().toISOString().split('T')[0];
    const readyItems: { reportId: string, itemName: string, table: string }[] = [];
    reports.forEach(r => {
      const isTargetUser = currentUser.role === 'admin' || r.waiter.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
      if ((r.date || '').split('T')[0] === today && r.notes !== 'ANULADO' && !r.closed && isTargetUser) {
        r.order.forEach((item: any) => {
          if (Object.values(item.kitchenStatus || {}).includes('ready') && !item.isServed) {
            readyItems.push({ reportId: r.id, itemName: item.name, table: r.customerName || (r.tableNumber > 0 ? `Mesa ${r.tableNumber}` : 'Pedido') });
          }
        });
      }
    });
    return readyItems;
  }, [reports, currentUser, forceRenderCount]);

  const hasReadyPlates = readyPlatesDetails.length > 0;
  const lastReadyCount = React.useRef(0);

  useEffect(() => {
    if (readyPlatesDetails.length > lastReadyCount.current) {
      if (currentUser && currentUser.role !== 'cocinero' && currentView !== 'kitchen') {
        try {
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc.start(); osc.stop(audioCtx.currentTime + 0.2);
        } catch (e) { console.log('Audio blocked'); }
      }
    }
    lastReadyCount.current = readyPlatesDetails.length;
  }, [readyPlatesDetails.length, currentView, currentUser]);

  const lastActiveOrdersCount = React.useRef(0);
  const activeOrdersCount = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return reports.filter(r => r.date === today && r.notes !== 'ANULADO' && !r.closed).length;
  }, [reports, forceRenderCount]);

  useEffect(() => {
    if (activeOrdersCount > lastActiveOrdersCount.current && currentView === 'kitchen') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'square'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) { console.log('Kitchen sound blocked'); }
    }
    lastActiveOrdersCount.current = activeOrdersCount;
  }, [activeOrdersCount, currentView]);

  const preparingPlatesDetails = React.useMemo(() => {
    if (!currentUser) return [];
    const today = new Date().toISOString().split('T')[0];
    const preparingItems: { itemName: string, table: string }[] = [];
    reports.forEach(r => {
      if (r.date === today && r.notes !== 'ANULADO' && !r.closed && (currentUser.role === 'admin' || r.waiter === currentUser.name)) {
        r.order.forEach((item: any) => {
          const statuses = Object.values(item.kitchenStatus || {});
          if (statuses.includes('preparing') && !statuses.includes('ready') && !item.isServed) {
            preparingItems.push({ itemName: item.name, table: r.customerName || (r.tableNumber > 0 ? `Mesa ${r.tableNumber}` : 'Pedido') });
          }
        });
      }
    });
    return preparingItems;
  }, [reports, currentUser, forceRenderCount]);

  const hasPreparingPlates = preparingPlatesDetails.length > 0;

  const handleMarkAllServed = () => {
    const reportIdsToUpdate = [...new Set(readyPlatesDetails.map(d => d.reportId))];
    const updatedReports: SaleRecord[] = [];
    setReports(prev => prev.map(r => {
      if (!reportIdsToUpdate.includes(r.id)) return r;
      const updated = { ...r, _pendingSync: true, order: r.order.map((item: any) => Object.values(item.kitchenStatus || {}).includes('ready') ? { ...item, isServed: true } : item) };
      updatedReports.push(updated);
      return updated;
    }));
    setTimeout(async () => {
      for (const r of updatedReports) {
        const result = await safeSyncSale(r);
        if (result.success || result.errorType === 'conflict') {
          setReports(prev => prev.map(pr => pr.id === r.id ? { ...pr, _pendingSync: undefined } : pr));
          if (result.errorType === 'conflict') refreshData();
        }
      }
    }, 100);
  };

  const memoizedProfiles = React.useMemo(() => [{
    id: 'main', name: businessName, logo: businessLogo, menu: menu, whatsappNumber: settings.targetNumber, modifierGroups: modifierGroups, theme: theme, paymentMethods: []
  }], [businessName, businessLogo, menu, settings.targetNumber, modifierGroups, theme]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [printerDevice, setPrinterDevice] = useState<any | null>(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState<any | null>(null);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const textEncoder = new TextEncoder();

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) { setPlatform('ios'); setShowInstallBtn(true); }
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallBtn(true); setPlatform('android'); });
  }, []);

  const handleInstallClick = () => setShowInstallModal(true);

  const triggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    try { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') setShowInstallBtn(false); setShowInstallModal(false); } catch (err) { setShowInstallModal(false); }
  };

  const [customerDetails, setCustomerDetails] = useLocalStorage<CustomerDetails>('current_order_details', { name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' });
  const activeRate = settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel;

  useEffect(() => { document.body.className = `theme-${theme}`; }, [theme]);

  const sendDataToPrinter = async (ch: any, data: Uint8Array) => {
    const CHUNK = 64; for (let i = 0; i < data.length; i += CHUNK) { await ch.writeValue(data.slice(i, i + CHUNK)); await new Promise(r => setTimeout(r, 80)); }
  };

  const handleConnectPrinter = async () => {
    try {
      const dev = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }] });
      const server = await dev.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      setPrinterDevice(dev); setPrinterCharacteristic(char); setIsPrinterConnected(true);
      dev.addEventListener('gattserverdisconnected', () => setIsPrinterConnected(false));
    } catch (e) { console.error("Printer connection failed"); }
  };

  const handleDisconnectPrinter = () => { if (printerDevice?.gatt) printerDevice.gatt.disconnect(); };
  const handlePrintTest = async () => { if (printerCharacteristic) await sendDataToPrinter(printerCharacteristic, textEncoder.encode(generateTestPrintCommands({ ...settings, businessName }))); };

  const handlePrintOrder = async (overrideStatus?: string, isReprint: boolean = false) => {
    if (!printerCharacteristic) return;
    const isEdit = !!editingReportId;
    const newItems = cart.filter(i => !i.isOriginal);
    const shouldPartial = isEdit && overrideStatus === 'POR COBRAR' && newItems.length > 0;
    const items = shouldPartial ? newItems : cart;
    const cust = overrideStatus ? { ...customerDetails, paymentMethod: overrideStatus } : customerDetails;
    const title = shouldPartial ? "ADICIONAL - POR PAGAR" : (isReprint ? "RECIBO (COPIA)" : "RECIBO");
    const prevTotal = shouldPartial ? cart.reduce((acc, i) => i.isOriginal ? acc + ((i.price + i.selectedModifiers.reduce((s, m) => s + m.option.price, 0)) * i.quantity) : acc, 0) : 0;
    const cmds = generateReceiptCommands(items, cust, { ...settings, businessName }, currentUser?.name || 'Sistema', title, prevTotal);
    await sendDataToPrinter(printerCharacteristic, textEncoder.encode(cmds));
  };

  const handleReprintSaleRecord = async (sale: SaleRecord) => {
    const cust: CustomerDetails = { name: sale.customerName || `Ref: ${sale.tableNumber}`, paymentMethod: sale.notes || 'No especificado', phone: '', instructions: '' };
    if (printerCharacteristic) {
      await sendDataToPrinter(printerCharacteristic, textEncoder.encode(generateReceiptCommands(sale.order as CartItem[], cust, { ...settings, businessName }, sale.waiter, "RECIBO (COPIA)")));
    } else {
      setReceiptToPrint({ cart: sale.order as CartItem[], customer: cust, waiter: sale.waiter, title: "COPIA DE RECIBO" });
      setTimeout(() => { window.print(); setReceiptToPrint(null); }, 500);
    }
  };

  const handleEditPendingReport = (report: SaleRecord, target: View = 'cart') => {
    // SEGURIDAD QUIRÚRGICA: Impedir entrada a edición si ya está pagado
    if (report.notes !== 'PENDIENTE') {
      alert("TRANSACCIÓN BLOQUEADA: Este pedido ya ha sido procesado como PAGADO. No se permiten ediciones para evitar errores de cobro duplicado.");
      return;
    }

    setCart((report.order as CartItem[]).map(i => ({ ...i, isOriginal: true, notes: 'original' })));
    setCustomerDetails({
      name: report.customerName || '',
      tableNumber: report.tableNumber,
      phone: report.customerPhone || '',
      paymentMethod: 'Efectivo',
      instructions: report.instructions || ''
    });
    setEditingReportId(report.id);
    setCurrentView(target);
  };

  const handleVoidReport = (id: string) => setPendingVoidReportId(id);
  const executeVoidReport = async (reason: string = 'ANULACION MANUAL') => {
    const target = reports.find(r => r.id === pendingVoidReportId);
    if (!target) return;
    const updated: SaleRecord = {
      ...target,
      notes: 'ANULADO',
      total: 0,
      type: 'refund' as const,
      _pendingSync: true,
      instructions: `ANULADO POR ${currentUser?.name || 'ADMIN'}: ${reason}`
    };
    setReports(prev => prev.map(r => r.id === pendingVoidReportId ? updated : r));
    setPendingVoidReportId(null);
    const res = await safeSyncSale(updated);
    if (res.success || res.errorType === 'conflict') {
      setReports(prev => prev.map(r => r.id === target.id ? { ...r, _pendingSync: undefined } : r));
      if (res.errorType === 'conflict') refreshData();
    }
  };

  const handleAddExpense = (amount: number, description: string, category: string) => {
    const newExpense: ExpenseRecord = {
      id: Math.random().toString(36).substr(2, 9),
      storeId: settings.storeId,
      amount,
      description,
      category,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: currentUser?.name || 'Admin'
    };
    setExpenses(prev => [newExpense, ...prev]);
    syncExpense(newExpense);
  };

  const handleAddInjection = (amount: number, description: string) => {
    const newInjection: CashInjectionRecord = {
      id: Math.random().toString(36).substr(2, 9),
      storeId: settings.storeId,
      amount,
      description,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: currentUser?.name || 'Admin'
    };
    setInjections(prev => [newInjection, ...prev]);
    syncInjection(newInjection);
  };

  const handleLogout = () => { setCurrentUser(null); setCart([]); setCurrentView('menu'); };

  const handleStartNewDay = () => {
    if (!window.confirm("¿Finalizar jornada? Mesas abiertas permanecerán.")) return;
    const today = new Date().toISOString().split('T')[0];
    const isAdmin = currentUser?.role === 'admin';
    const name = currentUser?.name || 'Sistema';
    const toClose = reports.filter(r => (isAdmin || r.waiter === name) && r.date === today && !r.closed && r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO');
    if (!toClose.length) { alert('No hay ventas por cerrar.'); return; }
    const closure: DayClosure = {
      id: Math.random().toString(36).substr(2, 9), storeId: settings.storeId, date: today, closedAt: new Date().toISOString(), closedBy: name, isAdminClosure: isAdmin,
      totalPaid: toClose.reduce((a, r) => r.type === 'refund' ? a - r.total : a + r.total, 0),
      totalPending: reports.filter(r => (isAdmin || r.waiter === name) && r.date === today && r.notes === 'PENDIENTE').reduce((a, r) => a + r.total, 0),
      totalVoided: reports.filter(r => (isAdmin || r.waiter === name) && r.date === today && r.notes === 'ANULADO').reduce((a, r) => a + r.total, 0),
      salesCount: toClose.length, reportIds: toClose.map(r => r.id)
    };
    setDayClosures(prev => [closure, ...prev]); syncClosure(closure);
    setReports(reports.map(r => { if (toClose.find(rc => rc.id === r.id)) { const up = { ...r, closed: true, closureId: closure.id }; syncSale(up); return up; } return r; }));
    setCurrentUser(null); setCurrentView('menu');
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    const it = cart.find(i => i.id === id);
    if (it?.notes === 'original' || it?.isOriginal) { alert("No puedes modificar productos que ya están en proceso. Para pedir más, agrégalos como productos nuevos."); return; }
    if (it?.isServed && currentUser?.role !== 'admin') { alert("Este producto ya fue servido y no puede modificarse."); return; }
    if (qty <= 0) { handleRemoveItem(id); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    setTriggerCartShake(true); setTimeout(() => setTriggerCartShake(false), 500);
  };

  const handleRemoveItem = (id: string) => {
    const it = cart.find(i => i.id === id);
    if (it?.notes === 'original' || it?.isOriginal) { alert("No puedes eliminar productos que ya están en proceso."); return; }
    if (it?.isServed && currentUser?.role !== 'admin') setPendingRemoveItemId(id);
    else setCart(prev => prev.filter(i => i.id !== id));
  };

  const executeRemoveItem = (reason?: string) => {
    if (pendingRemoveItemId) { if (reason) setRemovalReasons(p => ({ ...p, [pendingRemoveItemId]: reason })); setCart(p => p.filter(i => i.id !== pendingRemoveItemId)); setPendingRemoveItemId(null); }
  };

  const handleAddItem = (item: MenuItem, mods: SelectedModifier[], qty: number, notes?: string) => {
    if (!(item.modifierGroupTitles?.length)) {
      const ex = cart.find(c => c.name === item.name && !c.selectedModifiers.length && !c.isServed && c.notes !== 'original' && !c.isOriginal);
      if (ex) { handleUpdateQuantity(ex.id, ex.quantity + qty); return; }
    }
    setCart(p => [...p, { id: Math.random().toString(36).substr(2, 9), name: item.name, price: item.price, quantity: qty, selectedModifiers: mods, kitchenStations: item.kitchenStations, notes }]);
    setTriggerCartShake(true); setTimeout(() => setTriggerCartShake(false), 500);
  };

  const handleAddPizzaToCart = (item: MenuItem, config: PizzaConfiguration, qty: number, extra: SelectedModifier[] = []) => {
    let price = config.basePrice;
    config.ingredients.forEach(s => { if (!config.isSpecialPizza || !item.defaultIngredients?.includes(s.ingredient.name)) price += s.ingredient.prices[config.size as PizzaSize] / (s.half === 'full' ? 1 : 2); });
    price += extra.reduce((a, m) => a + m.option.price, 0);
    const mods: SelectedModifier[] = [{ groupTitle: 'Tamaño', option: { name: config.size, price: 0 } }];
    ['full', 'left', 'right'].forEach(h => {
      const ings = config.ingredients.filter(i => i.half === h).map(i => i.ingredient.name);
      if (ings.length) mods.push({ groupTitle: h === 'full' ? 'TODA' : (h === 'left' ? 'IZQ' : 'DER'), option: { name: ings.join(', '), price: 0 } });
    });
    if (config.isSpecialPizza && item.defaultIngredients?.length) mods.push({ groupTitle: 'BASE', option: { name: item.defaultIngredients.join(', '), price: 0 } });
    mods.push(...extra);
    setCart(p => [...p, { id: Math.random().toString(36).substr(2, 9), name: config.isSpecialPizza ? `${config.specialPizzaName} (${config.size})` : `Pizza ${config.size}`, price, quantity: qty, selectedModifiers: mods, pizzaConfig: config, kitchenStations: item.kitchenStations }]);
    setPizzaBuilderItem(null); setTriggerCartShake(true); setTimeout(() => setTriggerCartShake(false), 500);
  };

  const handleClearCart = useCallback(() => setIsAdminAuthForClearCart(true), []);
  const executeClearCart = () => { setCart([]); setEditingReportId(null); setCustomerDetails({ name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' }); setCurrentView('menu'); setIsAdminAuthForClearCart(false); };

  const finalizeOrder = (isPaid: boolean = true) => {
    // RE-VALIDACIÓN INTEGRAL (Precios, Disponibilidad y Modificadores)
    const productMaster = new Map<string, any>();
    menu.forEach(cat => {
      cat.items.forEach((item: any) => {
        productMaster.set(item.name, item);
      });
    });

    const modifierMaster = new Map<string, any>();
    modifierGroups.forEach(group => {
      modifierMaster.set(group.title, group);
    });

    let hasUnavailableItems = false;
    const validatedCart = cart.map(item => {
      // Intento de búsqueda inteligente para Pizzas
      let masterItem = productMaster.get(item.name);

      if (!masterItem && item.pizzaConfig) {
        // Si no lo encuentra por nombre compuesto, buscamos por el nombre base de la pizza
        const baseName = item.pizzaConfig.isSpecialPizza ? item.pizzaConfig.specialPizzaName : "Pizza";
        masterItem = productMaster.get(baseName || "");

        // Si aún así no lo encuentra (ej: el usuario llamó al item "Pizzas" en lugar de "Pizza")
        // podemos intentar buscar por cualquier item que tenga isPizza: true
        if (!masterItem) {
          masterItem = Array.from(productMaster.values()).find(m => m.isPizza && !m.isSpecialPizza);
        }
      }

      // 1. Validar Existencia y Disponibilidad
      if (!masterItem || !masterItem.available) {
        hasUnavailableItems = true;
        console.error(`❌ El producto ${item.name} ya no está disponible.`);
        return item;
      }

      // 2. Validar Precios de Modificadores
      const validatedModifiers = item.selectedModifiers.map(mod => {
        const masterGroup = modifierMaster.get(mod.groupTitle);
        if (masterGroup) {
          const masterOption = masterGroup.options.find((o: any) => o.name === mod.option.name);
          if (masterOption && masterOption.price !== mod.option.price) {
            console.log(`⚠️ Precio de extra ${mod.option.name} actualizado: $${mod.option.price} -> $${masterOption.price}`);
            return { ...mod, option: { ...mod.option, price: masterOption.price } };
          }
        }
        return mod;
      });

      // 3. Validar Precio del Item Principal y Estación
      // Para pizzas especiales el precio base es el del master, para personalizadas se mantiene el calculado
      const finalPrice = item.pizzaConfig && !item.pizzaConfig.isSpecialPizza ? item.price : masterItem.price;

      return {
        ...item,
        price: finalPrice,
        selectedModifiers: validatedModifiers,
        kitchenStations: masterItem.kitchenStations
      };
    });

    if (hasUnavailableItems) {
      alert("⚠️ Algunos productos en el carrito ya no están disponibles en el menú. Por favor, elimínalos para continuar.");
      return;
    }

    const tot = validatedCart.reduce((acc, item) => {
      const itemBasePrice = item.price;
      let mPrice = 0;
      item.selectedModifiers.forEach(m => { mPrice += m.option.price; });
      return acc + ((itemBasePrice + mPrice) * item.quantity);
    }, 0);
    if (isPaid) setSettings(p => ({ ...p, lifetimeRevenueUSD: (p.lifetimeRevenueUSD || 0) + tot }));

    const ex = editingReportId ? reports.find(r => r.id === editingReportId) : null;
    const rep: SaleRecord = {
      id: ex?.id || Math.random().toString(36).substr(2, 9),
      storeId: settings.storeId,
      date: new Date().toLocaleDateString('en-CA'),
      time: new Date().toLocaleTimeString(),
      tableNumber: customerDetails.tableNumber || parseInt(customerDetails.name) || 0,
      waiter: ex ? ex.waiter : (currentUser?.name || 'Sistema'),
      total: tot,
      order: validatedCart,
      type: 'sale',
      customerName: customerDetails.name,
      customerPhone: customerDetails.phone,
      instructions: customerDetails.instructions,
      createdAt: ex?.createdAt || new Date().toISOString(),
      notes: isPaid ? customerDetails.paymentMethod : 'PENDIENTE',
      auditNotes: ex?.auditNotes || []
    };

    if (ex) {
      const rem = ex.order.filter(o => !validatedCart.some(c => c.id === o.id));
      if (rem.length) rep.auditNotes = [...rep.auditNotes || [], ...rem.map(i => ({ timestamp: new Date().toISOString(), user: currentUser?.name || 'Admin', action: `Eliminó: ${i.quantity}x ${i.name}${removalReasons[i.id] ? ` (${removalReasons[i.id]})` : ''}` }))];
    }

    setReports(p => [rep, ...(editingReportId ? p.filter(r => r.id !== editingReportId) : p)]);
    safeSyncSale(rep).then(res => {
      if (!res.success && res.errorType === 'conflict') { alert("Conflicto de sincronización."); refreshData(); return; }
      setLastSoldRecord({ cart: [...validatedCart], details: { ...customerDetails } });
      setCart([]);
      setEditingReportId(null);
      setCustomerDetails({ name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' });
      setCurrentView('success');
    });
  };

  const handleStartNewOrder = () => { setCart([]); setEditingReportId(null); setCustomerDetails({ name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' }); setCurrentView('menu'); };
  const executeSendToWhatsapp = (unpaid: boolean = false) => {
    const isEdit = !!editingReportId;
    const newItems = cart.filter(i => !i.isOriginal);

    // Si es edición y no está pagado (actualización), enviamos solo lo nuevo para no confundir a cocina
    const shouldSendPartial = isEdit && unpaid && newItems.length > 0;
    const itemsToSend = shouldSendPartial ? newItems : cart;

    const tot = cart.reduce((a, i) => a + ((i.price + i.selectedModifiers.reduce((s, m) => s + m.option.price, 0)) * i.quantity), 0);
    const partialTotal = itemsToSend.reduce((a, i) => a + ((i.price + i.selectedModifiers.reduce((s, m) => s + m.option.price, 0)) * i.quantity), 0);

    let msg = shouldSendPartial ? `*📝 ADICIONAL / EXTRA*\n\n` : (unpaid ? `*⚠️ PENDIENTE*\n\n` : `*✅ COBRADO*\n\n`);
    msg += `*🤵 Mesero:* ${currentUser?.name}\n*📍 Ref:* ${customerDetails.name}\n\n*🛒 DETALLE:*\n`;

    itemsToSend.forEach(i => {
      msg += `▪️ *${i.quantity}x ${i.name}*${!shouldSendPartial && i.isOriginal ? ' _(Previo)_' : ''}\n`;
      i.selectedModifiers.forEach(m => msg += `  _${m.groupTitle}: ${m.option.name}_\n`);
    });

    if (shouldSendPartial) {
      const prevDebt = tot - partialTotal;
      if (prevDebt > 0) msg += `\n*💰 DEUDA PREVIA: $${prevDebt.toFixed(2)}*`;
      msg += `\n*➕ ADICIONAL: $${partialTotal.toFixed(2)}*`;
      msg += `\n*💲 TOTAL FINAL: $${tot.toFixed(2)}*`;
    } else {
      msg += `\n*💰 TOTAL: $${tot.toFixed(2)}*`;
    }

    msg += `\n*💳 Estado:* ${unpaid ? 'PENDIENTE' : customerDetails.paymentMethod}`;
    if (settings.isWhatsAppEnabled) window.open(`https://wa.me/${settings.targetNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isAppReady) return <SplashScreen onEnter={() => setIsAppReady(true)} />;

  return (
    <>
      {(() => {
        if (isSubscriptionInactive) return (
          <div
            onContextMenu={(e) => { e.preventDefault(); setShowMasterDashboard(true); }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-8 text-center"
          >
            <h2 className="text-3xl font-black text-white mb-4">VENCIDO</h2>
            <button
              onClick={() => {
                // Forzamos limpieza de caché local para obligar a re-validar con Supabase
                localStorage.removeItem('app_settings_v3');
                window.location.reload();
              }}
              className="px-8 py-4 bg-red-600 text-white rounded-xl active:scale-95 transition-all shadow-lg font-black uppercase tracking-widest"
            >
              REFRESCAR
            </button>
            <button
              onClick={() => {
                if (window.confirm("¿Deseas desvincular esta terminal para ingresar un nuevo código?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="mt-20 text-[8px] font-black text-gray-800 uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-opacity"
            >
              Desvincular Terminal
            </button>
          </div>
        );

        const handleDeleteAllData = async () => {
          if (!settings.storeId) return;
          if (!window.confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsta acción eliminará PERMANENTEMENTE todo el historial de ventas, cierres, gastos e ingresos de la nube.\n\nNO SE PUEDE DESHACER.")) return;

          // Doble confirmación
          const confirmText = prompt("Para confirmar, escribe BORRAR TODO en mayúsculas:");
          if (confirmText !== "BORRAR TODO") {
            alert("Operación cancelada. El texto no coincide.");
            return;
          }

          try {
            // 1. Borrar Ventas
            const { error: errSales } = await supabase.from('sales').delete().eq('store_id', settings.storeId);
            if (errSales) throw new Error('Error borrando ventas: ' + errSales.message);

            // 2. Borrar Cierres
            const { error: errClosures } = await supabase.from('day_closures').delete().eq('store_id', settings.storeId);
            if (errClosures) throw new Error('Error borrando cierres: ' + errClosures.message);

            // 3. Borrar Gastos
            const { error: errExpenses } = await supabase.from('expenses').delete().eq('store_id', settings.storeId);
            if (errExpenses) throw new Error('Error borrando gastos: ' + errExpenses.message);

            // 4. Borrar Inyecciones
            const { error: errInjections } = await supabase.from('cash_injections').delete().eq('store_id', settings.storeId);
            if (errInjections) throw new Error('Error borrando inyecciones: ' + errInjections.message);

            // 5. Limpiar estado local
            setReports([]);
            setDayClosures([]);
            setExpenses([]);
            setInjections([]);
            handleClearCart();

            alert("✅ Base de datos reseteada correctamente.");

            // Forzar recarga para asegurar sincronización limpia
            window.location.reload();

          } catch (err: any) {
            console.error("❌ Error al borrar datos:", err);
            alert(`Error al borrar datos: ${err.message}`);
          }
        };

        if (settings.storeId === 'NEW_STORE') return (
          <div
            onContextMenu={(e) => { e.preventDefault(); setShowMasterDashboard(true); }}
            className="h-full bg-black p-2"
          >
            <div className="h-full w-full bg-white rounded-[38px] overflow-hidden">
              <RegistrationScreen
                onRegister={handleRegister}
                onJoin={handleJoin}
                onRecover={handleRecoverId}
                // @ts-ignore
                onShowMaster={() => setShowMasterDashboard(true)}
              />
            </div>
          </div>
        );

        if (!currentUser) return (
          <div
            className="h-full bg-black p-2"
          >
            <div className="h-full w-full bg-white rounded-[38px] overflow-hidden">
              <LoginScreen
                users={settings.users}
                businessName={businessName}
                businessLogo={businessLogo}
                onLogin={(u) => {
                  setCurrentUser(u);
                  loginTimestampRef.current = Date.now(); // Resetear timestamp al hacer login explícito
                  if (u.role === 'cocinero') setCurrentView('kitchen');
                }}
              />
            </div>
          </div>
        );

        return (
          <div className="h-full w-full bg-black p-2 flex flex-col overflow-hidden">
            <div className="flex-1 bg-white rounded-[38px] flex flex-col relative overflow-hidden">
              <main className="flex-1 overflow-hidden relative flex flex-col">
                <div className="flex-1 overflow-hidden relative">
                  {(() => {
                    switch (currentView) {
                      case 'menu': return <MenuScreen
                        menu={menu}
                        cart={cart}
                        onAddItem={handleAddItem}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                        onClearCart={handleClearCart}
                        cartItemCount={cart.reduce((a, i) => a + i.quantity, 0)}
                        onOpenModifierModal={setModifierModalItem}
                        onOpenPizzaBuilder={setPizzaBuilderItem}
                        onGoToCart={() => setCurrentView('cart')}
                        businessName={businessName}
                        businessLogo={businessLogo}
                        triggerShake={triggerCartShake}
                        showInstallButton={showInstallBtn}
                        onInstallApp={handleInstallClick}
                        activeRate={activeRate}
                        isEditing={!!editingReportId}
                        theme={theme}
                        readyPlatesDetails={readyPlatesDetails}
                        preparingPlatesDetails={preparingPlatesDetails}
                        onMarkAllServed={handleMarkAllServed}
                      />;
                      case 'cart': return <CartScreen cart={cart} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} onClearCart={handleClearCart} onBackToMenu={() => setCurrentView('menu')} onGoToCheckout={() => setCurrentView('checkout')} onEditItem={(id) => { const item = cart.find(i => i.id === id); if (item) { setEditingCartItemId(id); for (const cat of menu) { const orig = cat.items.find(i => i.name === item.name); if (orig) { setModifierModalItem(orig); break; } } } }} activeRate={activeRate} isEditing={!!editingReportId} isAdmin={currentUser?.role === 'admin'} theme={theme} />;
                      case 'checkout': return <CheckoutScreen cart={cart} customerDetails={customerDetails} paymentMethods={['Efectivo', 'Pago Móvil', 'Zelle', 'Divisas']} onUpdateDetails={setCustomerDetails} onBack={() => setCurrentView('cart')} onSubmitOrder={() => setConfirmOrderModalOpen(true)} onEditUserDetails={handleLogout} onClearCart={handleClearCart} activeRate={activeRate} isEditing={!!editingReportId} theme={theme} settings={settings} />;
                      case 'reports': return <ReportsScreen
                        reports={reports}
                        dayClosures={dayClosures}
                        onGoToTables={() => setCurrentView('menu')}
                        onDeleteReports={(ids) => { setReports(p => p.filter(r => !ids.includes(r.id))); return true; }}
                        settings={settings}
                        onStartNewDay={handleStartNewDay}
                        currentWaiter={currentUser?.name || ''}
                        onOpenSalesHistory={() => setIsSalesHistoryModalOpen(true)}
                        onReprintSaleRecord={handleReprintSaleRecord}
                        isPrinterConnected={isPrinterConnected}
                        onEditPendingReport={handleEditPendingReport}
                        onVoidReport={(id, reason) => {
                          setPendingVoidReportId(id);
                          executeVoidReport(reason);
                        }}
                        onShowFloorPlan={() => setCurrentView('floorplan')}
                        isAdmin={currentUser?.role === 'admin'}
                        forceRenderCount={forceRenderCount}
                        theme={theme}
                        expenses={expenses}
                        injections={injections}
                        onAddExpense={handleAddExpense}
                        onAddInjection={handleAddInjection}
                      />;
                      case 'dashboard': return <AdminDashboard
                        reports={reports}
                        settings={settings}
                        onGoToView={(v) => setCurrentView(v)}
                        onEditOrder={handleEditPendingReport}
                        onVoidOrder={handleVoidReport}
                        onReprintOrder={handlePrintOrder}
                        isPrinterConnected={isPrinterConnected}
                        forceRenderCount={forceRenderCount}
                        theme={theme}
                        expenses={expenses}
                        injections={injections}
                        onAddExpense={handleAddExpense}
                        onAddInjection={handleAddInjection}
                        dayClosures={dayClosures}
                        onStartNewDay={handleStartNewDay}
                      />;
                      case 'settings': return <SettingsScreen
                        settings={settings}
                        onSaveSettings={(s) => { setSettings(s); syncSettings(s as AppSettings); }}
                        onGoToTables={() => setCurrentView('menu')}
                        waiter={currentUser?.name}
                        onLogout={handleLogout}
                        waiterAssignments={{}}
                        onSaveAssignments={() => { }}
                        storeProfiles={memoizedProfiles}
                        onUpdateStoreProfiles={p => {
                          const first = Array.isArray(p) ? p[0] : (typeof p === 'function' ? p([])[0] : null);
                          if (first) {
                            setBusinessName(first.name);
                            setMenu(first.menu);
                            setModifierGroups(first.modifierGroups);
                            setTheme(first.theme);
                          }
                        }}
                        activeTableNumbers={[]}
                        onBackupAllSalesData={() => { }}
                        onClearAllSalesData={handleDeleteAllData}
                        syncMenu={syncMenu}
                        isPrinterConnected={isPrinterConnected}
                        onConnectPrinter={handleConnectPrinter}
                        onDisconnectPrinter={handleDisconnectPrinter}
                        onPrintTest={handlePrintTest}
                        printerName={printerDevice?.name}
                        pizzaIngredients={pizzaIngredients}
                        pizzaBasePrices={pizzaBasePrices}
                        onUpdatePizzaConfig={(i, b) => { setPizzaIngredients(i); setPizzaBasePrices(b); }}
                        onResetApp={() => { if (window.confirm("¿Cerrar negocio?")) { setSettings(p => ({ ...p, storeId: 'NEW_STORE' })); handleLogout(); } }}
                      />;
                      case 'floorplan': return <FloorPlanScreen
                        reports={reports}
                        settings={settings}
                        forceRenderCount={forceRenderCount}
                        onGoBack={() => setCurrentView('reports')}
                        onEditOrder={(order) => handleEditPendingReport(order, 'menu')}
                        onViewOrder={(order) => setViewOnlyReport(order)}
                        onSelectTable={(num) => {
                          setCustomerDetails({ ...customerDetails, name: num.toString(), tableNumber: num });
                          handleClearCart();
                          setCurrentView('menu');
                        }}
                        onReopenOrder={(rid) => {
                          const target = reports.find(r => r.id === rid);
                          if (!target) return;

                          // Si es admin, puede reabrir directo (opcional, o pedir PIN siempre por seguridad)
                          if (currentUser?.role === 'admin') {
                            if (window.confirm("¿Reabrir este pedido como administrador?")) {
                              setPendingReopenOrderId(rid);
                              executeReopenOrder();
                            }
                          } else {
                            // Si es mesero/cajero, requiere PIN de admin
                            setPendingReopenOrderId(rid);
                          }
                        }}
                        onCloseOrder={async (rid) => {
                          const target = reports.find(r => r.id === rid);
                          if (target) {
                            const updated = { ...target, closed: true };
                            setReports(reports.map(r => r.id === rid ? updated : r));
                            await safeSyncSale(updated);
                          }
                        }}
                      />;
                      case 'kitchen': return <KitchenScreen reports={reports} settings={settings} currentUser={currentUser} onUpdateItemStatus={async (rid, iid, sid, status) => { const updated = reports.map(r => r.id === rid ? { ...r, order: r.order.map((i: any) => i.id === iid ? { ...i, kitchenStatus: { ...(i.kitchenStatus || {}), [sid]: status } } : i) } : r); setReports(updated); const rep = updated.find(r => r.id === rid); if (rep) await safeSyncSale(rep); }} onCloseOrder={async (rid) => { if (window.confirm("¿Cerrar comanda?")) { const target = reports.find(r => r.id === rid); if (target) { const up = { ...target, closed: true }; setReports(reports.map(r => r.id === rid ? up : r)); await safeSyncSale(up); } } }} onLogout={handleLogout} onManualSync={handleManualSync} syncStatus={syncStatus} lastSyncTime={lastSyncTime} forceRenderCount={forceRenderCount} />;
                      case 'success': return <SuccessScreen cart={lastSoldRecord?.cart || []} customerDetails={lastSoldRecord?.details || customerDetails} onStartNewOrder={handleStartNewOrder} onReprint={() => handlePrintOrder(undefined, true)} isPrinterConnected={isPrinterConnected} activeRate={activeRate} theme={theme} settings={settings} />;
                      default: return null;
                    }
                  })()}
                </div>

                {currentUser.role !== 'cocinero' && (
                  <>
                    {hasPreparingPlates && currentView !== 'kitchen' && currentView !== 'menu' && (
                      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full shadow-lg font-black text-[10px] uppercase tracking-widest z-50 flex items-center gap-2 animate-pulse border-2 border-yellow-500 overflow-hidden max-w-[80vw]">
                        <span className="w-2 h-2 bg-yellow-600 rounded-full animate-ping shrink-0"></span>
                        <div className="animate-marquee whitespace-nowrap">
                          {preparingPlatesDetails.map((item, idx) => (<span key={idx} className="mr-6">🔥 {item.itemName} ({item.table})</span>))}
                        </div>
                      </div>
                    )}
                    {hasReadyPlates && currentView !== 'kitchen' && currentView !== 'menu' && (
                      <div className="absolute top-4 left-4 right-4 bg-green-600 text-white py-2 px-4 shadow-xl rounded-2xl z-[110] border border-green-500 flex items-center justify-between gap-3 box-border">
                        <div className="flex-1 overflow-hidden flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center bg-white text-green-600 rounded-full shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                          <div className="animate-marquee whitespace-nowrap text-[10px] font-black uppercase tracking-tight">
                            {readyPlatesDetails.map((item, idx) => (<span key={idx} className="mr-8">🍴 {item.itemName} ({item.table})</span>))}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleMarkAllServed(); }} className="bg-white text-green-700 px-3 py-1 rounded-xl text-[9px] font-black uppercase">VISTO ✓</button>
                      </div>
                    )}
                  </>
                )}
              </main>

              <nav className="bg-white border-t px-2 py-3 flex justify-around items-center shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50">
                {currentView === 'kitchen' ? (
                  <>
                    <div className="flex flex-col items-center gap-1 text-green-600 opacity-50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                      <span className="text-[8px] font-black uppercase">Cocina</span>
                    </div>
                    <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      <span className="text-[8px] font-black uppercase">Salir</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setCurrentView('menu')} className={`flex flex-col items-center gap-1 ${currentView === 'menu' ? 'text-[#f2a60d]' : 'text-gray-400'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      <span className="text-[8px] font-black uppercase">Vender</span>
                    </button>
                    <button onClick={() => setCurrentView('reports')} className={`flex flex-col items-center gap-1 relative ${currentView === 'reports' ? 'text-[#a855f7]' : 'text-gray-400'}`}>
                      {hasReadyPlates && <span className="absolute -top-1 right-0 w-2 h-2 bg-green-500 rounded-full border border-white animate-bounce"></span>}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      <span className="text-[8px] font-black uppercase">Reportes</span>
                    </button>
                    {currentUser.role === 'admin' && (
                      <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-[#f2a60d]' : 'text-gray-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                        <span className="text-[8px] font-black uppercase">Dash</span>
                      </button>
                    )}
                    {currentUser.role === 'admin' && (
                      <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-[#f2a60d]' : 'text-gray-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-[8px] font-black uppercase">Tools</span>
                      </button>
                    )}
                    {(settings.storeId === 'KEMASTER' || settings.storeId === 'KM-6969') && currentUser.role === 'admin' && (
                      <button onClick={() => setShowMasterDashboard(true)} className="flex flex-col items-center gap-1 text-red-600 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        <span className="text-[8px] font-black uppercase">Master</span>
                      </button>
                    )}
                    <button onClick={handleManualSync} className={`flex flex-col items-center gap-1 relative ${isSyncing ? 'text-[#f2a60d]' : 'text-gray-400'}`}>
                      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${syncStatus === 'online' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span className="text-[8px] font-black uppercase">Sync</span>
                    </button>
                    <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      <span className="text-[8px] font-black uppercase">Salir</span>
                    </button>
                  </>
                )}
              </nav>
            </div>
          </div>
        );
      })()}

      {showMasterDashboard && (
        <div className="fixed inset-0 z-[1000]">
          <MasterApp
            onClose={() => setShowMasterDashboard(false)}
            onSelectStore={(id) => { handleJoin(id); setShowMasterDashboard(false); }}
          />
        </div>
      )}
      {modifierModalItem && <ProductModifierModal item={modifierModalItem} initialCartItem={editingCartItemId ? cart.find(i => i.id === editingCartItemId) : null} allModifierGroups={modifierGroups} onClose={() => { setModifierModalItem(null); setEditingCartItemId(null); }} onSubmit={(itemWithNotes, mods, qty) => { if (editingCartItemId) { setCart(prev => prev.map(i => i.id === editingCartItemId ? { ...i, selectedModifiers: mods, quantity: qty, notes: (itemWithNotes as any).notes } : i)); setEditingCartItemId(null); } else { handleAddItem(itemWithNotes, mods, qty, (itemWithNotes as any).notes); } setModifierModalItem(null); }} activeRate={activeRate} />}
      {pizzaBuilderItem && <PizzaBuilderModal item={pizzaBuilderItem} onClose={() => setPizzaBuilderItem(null)} onSubmit={handleAddPizzaToCart} activeRate={activeRate} isSpecialPizza={pizzaBuilderItem.isSpecialPizza} defaultIngredients={pizzaBuilderItem.defaultIngredients} pizzaIngredients={pizzaIngredients} pizzaBasePrices={pizzaBasePrices} allModifierGroups={modifierGroups} />}
      {isConfirmOrderModalOpen && <ConfirmOrderModal isOpen={isConfirmOrderModalOpen} onClose={() => setConfirmOrderModalOpen(false)} isPrinterConnected={isPrinterConnected} isEdit={!!editingReportId} onConfirmPrintAndSend={async () => { if (isPrinterConnected) await handlePrintOrder(); executeSendToWhatsapp(); finalizeOrder(true); setConfirmOrderModalOpen(false); }} onConfirmPrintOnly={async () => { if (isPrinterConnected) await handlePrintOrder(); finalizeOrder(true); setConfirmOrderModalOpen(false); }} onConfirmSendOnly={() => { executeSendToWhatsapp(); finalizeOrder(true); setConfirmOrderModalOpen(false); }} onConfirmSendUnpaid={async () => { if (isPrinterConnected) await handlePrintOrder("POR COBRAR"); executeSendToWhatsapp(true); finalizeOrder(false); setConfirmOrderModalOpen(false); }} userRole={currentUser?.role} waitersCanCharge={settings.waitersCanCharge} />}
      {isSalesHistoryModalOpen && <SalesHistoryModal reports={reports} onClose={() => setIsSalesHistoryModalOpen(false)} />}
      {pendingVoidReportId && <AdminAuthModal validPins={settings.users.filter(u => u.role === 'admin').map(u => u.pin)} onClose={() => setPendingVoidReportId(null)} onSuccess={executeVoidReport} title="Anular Ticket" />}
      {pendingReopenOrderId && <AdminAuthModal validPins={settings.users.filter(u => u.role === 'admin').map(u => u.pin)} onClose={() => setPendingReopenOrderId(null)} onSuccess={executeReopenOrder} title="Reabrir Pedido" />}
      {isAdminAuthForClearCart && <AdminAuthModal validPins={settings.users.filter(u => u.role === 'admin').map(u => u.pin)} onClose={() => setIsAdminAuthForClearCart(false)} onSuccess={executeClearCart} title="Limpiar Pedido" />}
      {pendingRemoveItemId && <AdminAuthModal validPins={settings.users.filter(u => u.role === 'admin').map(u => u.pin)} onClose={() => setPendingRemoveItemId(null)} onSuccess={executeRemoveItem} title="Eliminar Producto" requireReason={!!cart.find(i => i.id === pendingRemoveItemId)?.isServed} />}
      {showInstallModal && <InstallPromptModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} onInstall={triggerNativeInstall} platform={platform} />}

      {/* Visualización de Pedido Pagado (Solo Lectura) */}
      {viewOnlyReport && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[9999] p-4" onClick={() => setViewOnlyReport(null)}>
          <div className="bg-[#111] border border-white/10 rounded-[40px] p-8 w-full max-w-sm shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 p-6">
              <button onClick={() => setViewOnlyReport(null)} className="text-white/20 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-8 italic flex items-center gap-3">
              <span className="w-2 h-8 bg-[#0bda19] rounded-full"></span>
              Resumen de Mesa
            </h3>

            <div className="space-y-5 mb-8 max-h-[45vh] overflow-y-auto pr-2 scrollbar-hide">
              <div className="flex items-center gap-4 mb-6 p-5 bg-[#0bda19]/5 rounded-[2rem] border border-[#0bda19]/20">
                <div className="w-12 h-12 bg-[#0bda19]/20 rounded-2xl flex items-center justify-center text-[#0bda19] shadow-[0_0_20px_rgba(11,218,25,0.2)]">
                  <span className="material-symbols-outlined text-2xl font-bold">verified</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-1.5">Estado Final</p>
                  <p className="text-sm font-black text-[#0bda19] uppercase tracking-tighter">PAGADO COMPLETAMENTE</p>
                </div>
              </div>

              {(viewOnlyReport.order || []).map((item: any, idx) => (
                <div key={idx} className="pb-4 border-b border-white/5 last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-black text-white/90 leading-tight pr-4">{item.quantity}x {item.name}</span>
                    <span className="text-base font-black text-white font-mono shrink-0">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                  </div>
                  {item.selectedModifiers?.map((m: any, mi: number) => (
                    <p key={mi} className="text-[10px] text-white/30 italic ml-4 font-bold flex items-center gap-1">
                      <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                      {m.groupTitle}: {m.option.name}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/10 flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Total Transacción</p>
                <p className="text-3xl font-black text-[#0bda19] font-mono tracking-tighter shadow-sm">${(viewOnlyReport.total || 0).toFixed(2)}</p>
              </div>
              <p className="text-[10px] font-black text-white/10 uppercase mb-1">USD</p>
            </div>

            <button
              onClick={() => { handleReprintSaleRecord(viewOnlyReport); setViewOnlyReport(null); }}
              className="w-full py-5 bg-white text-black font-black rounded-3xl shadow-2xl shadow-white/5 uppercase tracking-[0.2em] active:scale-95 transition-all text-xs flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined text-xl">print</span>
              Re-imprimir Ticket
            </button>
          </div>
        </div>
      )}
      {receiptToPrint && (
        <div id="printable-area" className="hidden print:block p-8 bg-white text-black font-mono">
          <div className="text-center text-xl font-bold mb-4 uppercase border-b-2 border-black pb-2">{businessName}</div>
          <div className="text-center font-bold mb-6 italic underline">{receiptToPrint.title}</div>
          <div className="flex justify-between text-xs mb-1"><span>FECHA: {new Date().toLocaleDateString()}</span><span>HORA: {new Date().toLocaleTimeString()}</span></div>
          <div className="flex justify-between text-xs mb-4"><span>MESERO: {receiptToPrint.waiter}</span><span>REF: {receiptToPrint.customer.name}</span></div>
          <div className="border-t border-black pt-4 space-y-2">
            {receiptToPrint.cart.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between font-bold"><span>{item.quantity}x {item.name}</span><span>${((item.price + item.selectedModifiers.reduce((acc, m) => acc + m.option.price, 0)) * item.quantity).toFixed(2)}</span></div>
                {item.selectedModifiers.map((m, mi) => <div key={mi} className="text-[10px] italic ml-4">- {m.groupTitle}: {m.option.name}</div>)}
              </div>
            ))}
          </div>
          <div className="border-t-2 border-black mt-6 pt-4 flex justify-between text-lg font-black uppercase"><span>Total:</span><span>${receiptToPrint.cart.reduce((acc, i) => acc + ((i.price + i.selectedModifiers.reduce((s, m) => s + m.option.price, 0)) * i.quantity), 0).toFixed(2)}</span></div>
          <div className="text-center mt-8 text-sm font-bold uppercase tracking-widest border-t border-black pt-4">*** GRACIAS ***</div>
        </div>
      )}
    </>
  );
}

export default App;
