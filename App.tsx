import React, { useState, useEffect, useCallback } from 'react';
import { View, MenuItem, StoreProfile, CartItem, CustomerDetails, SelectedModifier, MenuCategory, ModifierGroup, AppSettings, SaleRecord, ThemeName, PizzaConfiguration, PizzaIngredient, PizzaSize, User, DayClosure, UserRole } from './types';
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
import { supabase } from './utils/supabase';

function App() {
  // --- ESTADO PERSISTENTE ---
  const [menu, setMenu] = useLocalStorage<MenuCategory[]>('app_menu_v1', KECLICK_MENU_DATA);
  const [modifierGroups, setModifierGroups] = useLocalStorage<ModifierGroup[]>('app_modifiers_v1', KECLICK_MODIFIERS);
  const [theme, setTheme] = useLocalStorage<ThemeName>('app_theme_v1', 'red');
  const [businessName, setBusinessName] = useLocalStorage<string>('app_business_name_v1', 'Keclick');
  const [pizzaIngredients, setPizzaIngredients] = useLocalStorage<PizzaIngredient[]>('app_pizza_ingredients_v1', PIZZA_INGREDIENTS);
  const [pizzaBasePrices, setPizzaBasePrices] = useLocalStorage<Record<string, number>>('app_pizza_base_prices_v1', PIZZA_BASE_PRICES);
  const businessLogo = "https://i.ibb.co/9HxvMhx/keclick-logo.png"; // Placeholder image but we'll use CSS mostly

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [removalReasons, setRemovalReasons] = useState<Record<string, string>>({});

  const [settings, setSettings] = useLocalStorage<AppSettings>('app_settings_v3', {
    storeId: 'NEW_STORE',
    businessName: 'Keclick',
    businessLogo: 'https://i.ibb.co/9HxvMhx/keclick-logo.png',
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

    // 1. Si ya tiene licencia activa (pago realizado)
    if (settings.isLicenseActive) {
      if (!settings.licenseExpiryDate) return false; // Licencia vitalicia si no hay fecha
      const expiry = new Date(settings.licenseExpiryDate);
      return now > expiry; // Bloquear si la fecha actual pasó el vencimiento
    }

    // 2. Si no tiene licencia, chequear el periodo de prueba (Trial)
    if (settings.trialStartDate) {
      const start = new Date(settings.trialStartDate);
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 5; // Bloqueo al 5to día de prueba
    }

    return false;
  }, [settings.trialStartDate, settings.isLicenseActive, settings.licenseExpiryDate]);

  // Logo Vectorial Keclick
  const KeclickLogo = ({ size = "text-3xl" }: { size?: string }) => (
    <div className={`font-black ${size} uppercase tracking-tighter flex items-center`}>
      <span className="text-[#FF0000]">Ke</span>
      <span className="text-[#FFD700]">click</span>
    </div>
  );

  // Asegurar que usuarios esenciales existan y configuraciones locales estén al día
  useEffect(() => {
    let updated = false;
    let newSettings = { ...settings };

    // 1. Asegurar que Alejandro exista
    const hasAlejandro = settings.users.some(u => u.name.toLowerCase() === 'alejandro');
    if (!hasAlejandro) {
      const newAlejandro = { id: Math.random().toString(36).substr(2, 9), name: 'Alejandro', pin: '1111', role: 'mesero' as UserRole };
      newSettings.users = [...newSettings.users, newAlejandro];
      updated = true;
    }

    // 2. Asegurar que el usuario de Cocina (9999) exista si no hay ninguno
    const hasCook = settings.users.some(u => u.role === 'cocinero' || u.pin === '9999');
    if (!hasCook) {
      const newCook = { id: 'cook-default', name: 'Cocina', pin: '9999', role: 'cocinero' as UserRole, kitchenStation: 'general' };
      newSettings.users = [...newSettings.users, newCook];
      updated = true;
    }

    // 3. Asegurar que existan estaciones básicas
    if (!settings.kitchenStations || settings.kitchenStations.length === 0) {
      newSettings.kitchenStations = [{ id: 'general', name: 'Cocina General', color: '#10B981' }];
      updated = true;
    }

    // 4. Forzar permiso de cobro si no está definido
    if (settings.waitersCanCharge === undefined) {
      newSettings.waitersCanCharge = true;
      updated = true;
    }

    if (updated) {
      setSettings(newSettings);
    }
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
  const [pendingVoidReportId, setPendingVoidReportId] = useState<string | null>(null);

  const handleJoin = async (storeId: string) => {
    // Verificar si la tienda existe en Supabase
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !storeData) {
      return false;
    }

    // Cargar también sus settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (settingsError || !settingsData) {
      return false;
    }

    // Si existe, actualizar settings locales con los datos de la nube
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

    // Notificar a Supabase la creación de la tienda
    await supabase.from('stores').insert({
      id: newStoreId,
      name: businessNameInput,
      owner_phone: phone,
      status: 'trial',
      trial_ends_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Guardar settings iniciales
    const { error } = await supabase.from('settings').insert({
      store_id: newStoreId,
      business_name: businessNameInput,
      target_number: phone,
      is_whatsapp_enabled: true,
      kitchen_stations: settings.kitchenStations,
      users: settings.users
    });

    if (error) console.error("Error al registrar tienda:", error);

    setCurrentView('menu');
  };

  // --- ESCUCHA DE SUPABASE ---
  const { syncSale, syncSettings, syncClosure, refreshData, syncStatus } = useSupabaseSync(
    settings,
    setSettings,
    reports,
    setReports,
    dayClosures,
    setDayClosures,
    menu,
    modifierGroups,
    settings.storeId === 'NEW_STORE' ? null : settings.storeId
  );

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await refreshData();
    // Simulate a bit of delay for visual feedback if it was too fast
    setTimeout(() => setIsSyncing(false), 500);
  };

  // --- RECARGA AUTOMÁTICA AL VOLVER A LA APP ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleManualSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshData]);
  const [isAdminAuthForClearCart, setIsAdminAuthForClearCart] = useState(false);
  const [pendingRemoveItemId, setPendingRemoveItemId] = useState<string | null>(null);
  const [pizzaBuilderItem, setPizzaBuilderItem] = useState<MenuItem | null>(null);
  const [lastSoldRecord, setLastSoldRecord] = useState<{ cart: CartItem[], details: CustomerDetails } | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<{ cart: CartItem[], customer: CustomerDetails, waiter: string, title: string } | null>(null);

  // --- EFECTO: CIERRE GLOBAL ---
  // Si alguien cierra caja desde otro equipo (Admin o el propio usuario), sacamos la sesión
  useEffect(() => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];

    // Buscar si hay un cierre reciente de hoy que deba afectarme
    const latestClosure = dayClosures[0];
    if (latestClosure && latestClosure.date === today) {
      const isMyClosure = latestClosure.closedBy === currentUser.name;
      const isAdminClosure = latestClosure.isAdminClosure;

      if (isAdminClosure || isMyClosure) {
        // Solo sacamos si el cierre ocurrió DESPUES de que nosotros entramos
        // Pero como no tenemos "login time" exacto persistente, asumimos que si es nuevo y de hoy, 
        // probablemente debamos cerrar sesión para evitar ventas huérfanas
        handleLogout();
        alert("La jornada ha sido cerrada por administración o desde otro dispositivo. Sesión finalizada.");
      }
    }
  }, [dayClosures]);

  // Detalles de platos listos para este mesero O ADMIN (EXCLUYENDO los ya entregados/servidos)
  const readyPlatesDetails = React.useMemo(() => {
    if (!currentUser) return [];
    const today = new Date().toISOString().split('T')[0];

    const readyItems: { reportId: string, itemName: string, table: string }[] = [];

    reports.forEach(r => {
      const isTargetUser = currentUser.role === 'admin' || r.waiter === currentUser.name;
      if (r.date === today && r.notes !== 'ANULADO' && !r.closed && isTargetUser) {
        r.order.forEach((item: any) => {
          if (Object.values(item.kitchenStatus || {}).includes('ready') && !item.isServed) {
            readyItems.push({
              reportId: r.id,
              itemName: item.name,
              table: r.customerName || (r.tableNumber > 0 ? `Mesa ${r.tableNumber}` : 'Pedido')
            });
          }
        });
      }
    });

    return readyItems;
  }, [reports, currentUser]);

  const hasReadyPlates = readyPlatesDetails.length > 0;

  // Detalles de platos en PREPARACIÓN para este mesero O ADMIN
  const preparingPlatesDetails = React.useMemo(() => {
    if (!currentUser) return [];
    const today = new Date().toISOString().split('T')[0];
    const preparingItems: { itemName: string, table: string }[] = [];

    reports.forEach(r => {
      const isTargetUser = currentUser.role === 'admin' || r.waiter === currentUser.name;
      if (r.date === today && r.notes !== 'ANULADO' && !r.closed && isTargetUser) {
        r.order.forEach((item: any) => {
          const statuses = Object.values(item.kitchenStatus || {});
          if (statuses.includes('preparing') && !statuses.includes('ready') && !item.isServed) {
            preparingItems.push({
              itemName: item.name,
              table: r.customerName || (r.tableNumber > 0 ? `Mesa ${r.tableNumber}` : 'Pedido')
            });
          }
        });
      }
    });
    return preparingItems;
  }, [reports, currentUser]);

  const hasPreparingPlates = preparingPlatesDetails.length > 0;

  // Función para que el mesero marque que ya recogió/entregó los platos listos
  const handleMarkAllServed = () => {
    const reportIdsToUpdate = [...new Set(readyPlatesDetails.map(d => d.reportId))];
    const updatedReports: SaleRecord[] = [];

    setReports(prev => {
      const newReports = prev.map(r => {
        if (!reportIdsToUpdate.includes(r.id)) return r;

        const updated = {
          ...r,
          order: r.order.map((item: any) => {
            if (Object.values(item.kitchenStatus || {}).includes('ready')) {
              return { ...item, isServed: true };
            }
            return item;
          })
        };
        updatedReports.push(updated);
        return updated;
      });
      return newReports;
    });

    // Enviar los cambios a Supabase para que persistan y se sincronicen en otros equipos
    setTimeout(() => {
      updatedReports.forEach(r => syncSale(r));
    }, 100);
  };



  const memoizedProfiles = React.useMemo(() => [{
    id: 'main',
    name: businessName,
    logo: businessLogo,
    menu: menu,
    whatsappNumber: settings.targetNumber,
    modifierGroups: modifierGroups,
    theme: theme,
    paymentMethods: []
  }], [businessName, businessLogo, menu, settings.targetNumber, modifierGroups, theme]);

  // --- Lógica PWA ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  // --- Estado de la Impresora ---
  const [printerDevice, setPrinterDevice] = useState<any | null>(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState<any | null>(null);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const textEncoder = new TextEncoder();

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowInstallBtn(true);
      }
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
      setPlatform('android');
    });
  }, []);

  const handleInstallClick = () => {
    setShowInstallModal(true);
  };

  const triggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      setShowInstallModal(false);
    }
  };

  const [customerDetails, setCustomerDetails] = useLocalStorage<CustomerDetails>('current_order_details', {
    name: '',
    phone: '',
    paymentMethod: 'Efectivo',
    instructions: ''
  });

  const activeRate = settings.activeExchangeRate === 'bcv' ? settings.exchangeRateBCV : settings.exchangeRateParallel;

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const sendDataToPrinter = async (characteristic: any, data: Uint8Array) => {
    const CHUNK_SIZE = 64;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await characteristic.writeValue(chunk);
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  };

  const handleConnectPrinter = async () => {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      });
      if (!device.gatt) return;
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      setPrinterDevice(device);
      setPrinterCharacteristic(characteristic);
      setIsPrinterConnected(true);
      device.addEventListener('gattserverdisconnected', () => {
        setIsPrinterConnected(false);
        setPrinterDevice(null);
        setPrinterCharacteristic(null);
      });
    } catch (error) {
      console.error("Error conectando a la impresora:", error);
    }
  };

  const handleDisconnectPrinter = () => {
    if (printerDevice && printerDevice.gatt) {
      printerDevice.gatt.disconnect();
    }
  };

  const handlePrintTest = async () => {
    if (!printerCharacteristic) return;
    try {
      const commands = generateTestPrintCommands({ ...settings, businessName: businessName });
      const data = textEncoder.encode(commands);
      await sendDataToPrinter(printerCharacteristic, data);
    } catch (error) {
      console.error("Error al imprimir:", error);
    }
  };

  const handlePrintOrder = async (overrideStatus?: string, isReprint: boolean = false) => {
    if (!printerCharacteristic) {
      console.warn("Impresora no conectada. No se pudo imprimir.");
      return;
    }
    try {
      const isEdit = !!editingReportId;
      const newItems = cart.filter(i => !i.isServed);
      // Si es una edición y estamos enviando "POR COBRAR" (actualización), imprimimos solo lo nuevo.
      const shouldPrintPartial = isEdit && overrideStatus === 'POR COBRAR' && newItems.length > 0;

      const finalItemsToPrint = shouldPrintPartial ? newItems : cart;
      const customDetails = overrideStatus ? { ...customerDetails, paymentMethod: overrideStatus } : customerDetails;

      const receiptTitle = shouldPrintPartial
        ? "ADICIONAL - POR PAGAR"
        : (isReprint ? "RECIBO DE PEDIDO (COPIA)" : "RECIBO DE PEDIDO");

      let previousTotal = 0;
      if (shouldPrintPartial) {
        previousTotal = cart.reduce((acc, item) => {
          if (item.isServed) {
            const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
            return acc + ((item.price + modTotal) * item.quantity);
          }
          return acc;
        }, 0);
      }

      const commands = generateReceiptCommands(
        finalItemsToPrint,
        customDetails,
        { ...settings, businessName: businessName },
        currentUser?.name || 'Sistema',
        receiptTitle,
        previousTotal
      );
      const data = textEncoder.encode(commands);
      await sendDataToPrinter(printerCharacteristic, data);
    } catch (error) {
      console.error("Error al imprimir recibo:", error);
    }
  };

  const handleReprintSaleRecord = async (sale: SaleRecord) => {
    const customerDetailsForReprint: CustomerDetails = {
      name: sale.customerName || (sale.tableNumber > 0 ? `Ref: ${sale.tableNumber}` : 'Pedido Directo'),
      paymentMethod: sale.notes || 'No especificado',
      phone: '',
      instructions: '',
    };

    if (printerCharacteristic) {
      try {
        const commands = generateReceiptCommands(
          sale.order as CartItem[],
          customerDetailsForReprint,
          { ...settings, businessName: businessName },
          sale.waiter,
          "RECIBO DE PEDIDO (COPIA)"
        );
        const data = textEncoder.encode(commands);
        await sendDataToPrinter(printerCharacteristic, data);
      } catch (error) {
        console.error("Error al re-imprimir recibo:", error);
      }
    } else {
      // Fallback a impresión por navegador (para PCs con cable)
      setReceiptToPrint({
        cart: sale.order as CartItem[],
        customer: customerDetailsForReprint,
        waiter: sale.waiter,
        title: "COPIA DE RECIBO"
      });
      setTimeout(() => {
        window.print();
        setReceiptToPrint(null);
      }, 500);
    }
  };

  const handleEditPendingReport = (report: SaleRecord, targetView: View = 'cart') => {
    const mappedOrder = (report.order as CartItem[]).map(item => ({
      ...item,
      // Al cargar un pendiente para editar, los items existentes se consideran "Previos" (servidos)
      isServed: true
    }));
    setCart(mappedOrder);
    setCustomerDetails({
      name: report.customerName || '',
      phone: '',
      paymentMethod: 'Efectivo',
      instructions: ''
    });
    setEditingReportId(report.id);
    setCurrentView(targetView);
  };

  const handleVoidReport = (reportId: string) => {
    setPendingVoidReportId(reportId);
  };

  const executeVoidReport = () => {
    if (!pendingVoidReportId) return;
    const updatedReports = reports.map(r => r.id === pendingVoidReportId ? { ...r, notes: 'ANULADO', total: 0, type: 'refund' as const } : r);
    setReports(updatedReports);
    const voidedReport = updatedReports.find(r => r.id === pendingVoidReportId);
    if (voidedReport) syncSale(voidedReport);
    setPendingVoidReportId(null);
  };


  const handleLogout = () => {
    setCurrentUser(null);
    setCart([]); // Limpia el carrito al cerrar sesión
    setCurrentView('menu');
  };

  const handleStartNewDay = () => {
    if (window.confirm("¿Estás seguro de finalizar tu jornada actual? Las mesas abiertas se mantendrán en el sistema.")) {
      const today = new Date().toISOString().split('T')[0];
      const isAdminClosure = currentUser?.role === 'admin';
      const closerName = currentUser?.name || 'Sistema';

      // Filtrar los reportes que serán cerrados
      const reportsToClose = reports.filter(r => {
        const isTargetWaiter = isAdminClosure ? true : r.waiter === closerName;
        return r.date === today && isTargetWaiter && !r.closed && r.notes !== 'PENDIENTE' && r.notes !== 'ANULADO';
      });

      if (reportsToClose.length === 0) {
        alert('No hay ventas por cerrar en este momento.');
        return;
      }

      // Calcular totales del cierre
      const totalPaid = reportsToClose.reduce((acc, r) => r.type === 'refund' ? acc - r.total : acc + r.total, 0);
      const totalPending = reports.filter(r => {
        const isTargetWaiter = isAdminClosure ? true : r.waiter === closerName;
        return r.date === today && isTargetWaiter && r.notes === 'PENDIENTE';
      }).reduce((acc, r) => acc + r.total, 0);
      const totalVoided = reports.filter(r => {
        const isTargetWaiter = isAdminClosure ? true : r.waiter === closerName;
        return r.date === today && isTargetWaiter && r.notes === 'ANULADO';
      }).reduce((acc, r) => acc + r.total, 0);

      // Crear el registro de cierre
      const newClosure: DayClosure = {
        id: Math.random().toString(36).substr(2, 9),
        storeId: settings.storeId,
        date: today,
        closedAt: new Date().toISOString(),
        closedBy: closerName,
        isAdminClosure,
        totalPaid,
        totalPending,
        totalVoided,
        salesCount: reportsToClose.length,
        reportIds: reportsToClose.map(r => r.id)
      };

      // Guardar el cierre
      setDayClosures(prev => [newClosure, ...prev]);
      syncClosure(newClosure);

      // Marcar los reportes como cerrados
      const updatedReports = reports.map(r => {
        if (reportsToClose.find(rc => rc.id === r.id)) {
          const updated = { ...r, closed: true, closureId: newClosure.id };
          syncSale(updated);
          return updated;
        }
        return r;
      });
      setReports(updatedReports);

      alert(`Cierre registrado exitosamente.\nTotal: $${totalPaid.toFixed(2)}\nVentas cerradas: ${reportsToClose.length}`);
      setCurrentUser(null);
      setCurrentView('menu');
    }
  };

  const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
    const item = cart.find(i => i.id === cartItemId);
    const isAdmin = currentUser?.role === 'admin';
    if (item?.isServed && !isAdmin) {
      alert("No puedes modificar un producto ya servido. Para pedir una unidad adicional, agrégala como un nuevo producto desde el menú.");
      return;
    }
    if (newQuantity <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCart(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity: newQuantity } : i));
    setTriggerCartShake(true);
    setTimeout(() => setTriggerCartShake(false), 500);
  };

  const handleRemoveItem = (id: string) => {
    const item = cart.find(i => i.id === id);
    const isEditing = !!editingReportId;

    const isAdmin = currentUser?.role === 'admin';

    if ((item?.isServed && !isAdmin) || isEditing) {
      setPendingRemoveItemId(id);
    } else {
      setCart(prev => prev.filter(i => i.id !== id));
    }
  };

  const executeRemoveItem = (reason?: string) => {
    if (pendingRemoveItemId) {
      if (reason) {
        setRemovalReasons(prev => ({ ...prev, [pendingRemoveItemId]: reason }));
      }
      setCart(prev => prev.filter(i => i.id !== pendingRemoveItemId));
      setPendingRemoveItemId(null);
    }
  };

  const handleAddItem = (item: MenuItem, selectedModifiers: SelectedModifier[], quantity: number) => {
    const hasModifiers = item.modifierGroupTitles && item.modifierGroupTitles.length > 0;
    if (!hasModifiers) {
      const existingItem = cart.find(cartItem => cartItem.name === item.name && cartItem.selectedModifiers.length === 0 && !cartItem.isServed);
      if (existingItem) {
        handleUpdateQuantity(existingItem.id, existingItem.quantity + quantity);
        return;
      }
    }
    setCart(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: item.name,
      price: item.price,
      quantity: quantity,
      selectedModifiers: selectedModifiers,
      kitchenStations: item.kitchenStations
    }]);
    setTriggerCartShake(true);
    setTimeout(() => setTriggerCartShake(false), 500);
  };

  const handleAddPizzaToCart = (item: MenuItem, pizzaConfig: PizzaConfiguration, quantity: number, extraModifiers: SelectedModifier[] = []) => {
    let totalPrice = pizzaConfig.basePrice;
    pizzaConfig.ingredients.forEach(sel => {
      if (pizzaConfig.isSpecialPizza && item.defaultIngredients?.includes(sel.ingredient.name)) {
        return;
      }
      const ingPrice = sel.ingredient.prices[pizzaConfig.size as PizzaSize];
      if (sel.half === 'left' || sel.half === 'right') {
        totalPrice += ingPrice / 2;
      } else {
        totalPrice += ingPrice;
      }
    });

    const extraPrice = extraModifiers.reduce((acc, mod) => acc + mod.option.price, 0);
    totalPrice += extraPrice;

    const leftIngs = pizzaConfig.ingredients.filter(i => i.half === 'left').map(i => i.ingredient.name);
    const rightIngs = pizzaConfig.ingredients.filter(i => i.half === 'right').map(i => i.ingredient.name);
    const fullIngs = pizzaConfig.ingredients.filter(i => i.half === 'full').map(i => i.ingredient.name);

    let pizzaName = pizzaConfig.isSpecialPizza && pizzaConfig.specialPizzaName
      ? `${pizzaConfig.specialPizzaName} (${pizzaConfig.size})`
      : `Pizza ${pizzaConfig.size}`;

    const modifiers: SelectedModifier[] = [];

    modifiers.push({
      groupTitle: 'Tamaño',
      option: { name: pizzaConfig.size, price: 0 }
    });

    if (fullIngs.length > 0) {
      modifiers.push({
        groupTitle: '🍕 TODA LA PIZZA',
        option: { name: fullIngs.join(', '), price: 0 }
      });
    }

    if (leftIngs.length > 0) {
      modifiers.push({
        groupTitle: '◐ MITAD IZQUIERDA',
        option: { name: leftIngs.join(', '), price: 0 }
      });
    }

    if (rightIngs.length > 0) {
      modifiers.push({
        groupTitle: '◑ MITAD DERECHA',
        option: { name: rightIngs.join(', '), price: 0 }
      });
    }

    if (pizzaConfig.isSpecialPizza && item.defaultIngredients && item.defaultIngredients.length > 0) {
      modifiers.push({
        groupTitle: '✓ INGREDIENTES BASE',
        option: { name: item.defaultIngredients.join(', '), price: 0 }
      });
    }

    modifiers.push(...extraModifiers);

    const newCartItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: pizzaName,
      price: totalPrice,
      quantity: quantity,
      selectedModifiers: modifiers,
      pizzaConfig: pizzaConfig,
      notes: pizzaConfig.isSpecialPizza ? item.description : undefined,
      kitchenStations: item.kitchenStations
    };

    setCart(prev => [...prev, newCartItem]);
    setTriggerCartShake(true);
    setTimeout(() => setTriggerCartShake(false), 500);
    setPizzaBuilderItem(null);
  };

  const handleClearCart = useCallback(() => {
    setIsAdminAuthForClearCart(true);
  }, []);

  const executeClearCart = () => {
    setCart([]);
    setEditingReportId(null);
    setCustomerDetails({ name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' });
    setCurrentView('menu');
    setIsAdminAuthForClearCart(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finalizeOrder = (isPaid: boolean = true) => {
    const cartTotal = cart.reduce((acc, item) => {
      const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
      return acc + ((item.price + modTotal) * item.quantity);
    }, 0);

    // ACTUALIZAR ACUMULADO PARA COMISIONES
    if (isPaid) {
      setSettings(prev => ({
        ...prev,
        lifetimeRevenueUSD: (prev.lifetimeRevenueUSD || 0) + cartTotal
      }));
    }

    const existingReport = editingReportId ? reports.find(r => r.id === editingReportId) : null;

    const newReport: SaleRecord = {
      id: Math.random().toString(36).substr(2, 9),
      storeId: settings.storeId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      tableNumber: parseInt(customerDetails.name) || 0,
      waiter: existingReport ? existingReport.waiter : (currentUser?.name || 'Sistema'),
      total: cartTotal,
      order: cart.map(i => ({ ...i, isServed: i.isServed || false })),
      type: 'sale',
      customerName: customerDetails.name,
      createdAt: new Date().toISOString(),
      notes: isPaid ? customerDetails.paymentMethod : 'PENDIENTE',
      auditNotes: []
    };

    if (existingReport) {
      newReport.id = existingReport.id;
      newReport.createdAt = existingReport.createdAt || newReport.createdAt;
      newReport.auditNotes = existingReport.auditNotes || [];

      // Auditoría: si se eliminaron productos
      const removedItems = existingReport.order.filter(old => !cart.some(curr => curr.id === old.id));
      if (removedItems.length > 0) {
        newReport.auditNotes = [
          ...newReport.auditNotes,
          ...removedItems.map(item => ({
            timestamp: new Date().toISOString(),
            user: currentUser?.name || 'Admin',
            action: `Eliminó: ${item.quantity}x ${item.name}${removalReasons[item.id] ? ` (Motivo: ${removalReasons[item.id]})` : ''}`
          }))
        ];
      }
    }

    setReports(prev => {
      const filtered = editingReportId ? prev.filter(r => r.id !== editingReportId) : prev;
      return [newReport, ...filtered];
    });
    syncSale(newReport);

    // Guardar para la pantalla de éxito antes de limpiar
    setLastSoldRecord({ cart: [...cart], details: { ...customerDetails } });

    setCart([]);
    setEditingReportId(null);
    setCustomerDetails({ name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' });
    setCustomerDetails({ name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' });
    setRemovalReasons({});
    setCurrentView('success');
  };

  const handleStartNewOrder = () => {
    setCart([]);
    setEditingReportId(null);
    setCustomerDetails({ name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' });
    setCurrentView('menu');
  };

  const executeSendToWhatsapp = (isUnpaid: boolean = false) => {
    const cartTotal = cart.reduce((acc, item) => {
      const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
      return acc + ((item.price + modTotal) * item.quantity);
    }, 0);

    const isEdit = !!editingReportId;
    const newItems = cart.filter(i => !i.isServed);

    // Si es una EDICIÓN y NO ESTÁ PAGADO (actualización), enviamos SOLO LO NUEVO
    const shouldSendPartial = isEdit && isUnpaid && newItems.length > 0;
    const itemsToSend = shouldSendPartial ? newItems : cart;
    const displayTotal = shouldSendPartial ? newItems.reduce((acc, item) => acc + ((item.price + item.selectedModifiers.reduce((s, m) => s + m.option.price, 0)) * item.quantity), 0) : cartTotal;

    let message = "";

    if (shouldSendPartial) {
      message = `*📝 PEDIDO ADICIONAL / EXTRA*\n\n`;
    } else if (isEdit) {
      message = isUnpaid ? `*♻️ ACTUALIZACIÓN DE PENDIENTE*\n\n` : `*✅ CUENTA COBRADA / CERRADA*\n\n`;
    } else {
      message = isUnpaid ? `*⚠️ NUEVO PEDIDO (POR COBRAR)*\n\n` : `*🔔 NUEVO PEDIDO*\n\n`;
    }

    message += `*🤵 Mesero:* ${currentUser?.name || 'Sistema'}\n`;
    message += `*📍 Referencia:* ${customerDetails.name}\n`;
    if (customerDetails.instructions) message += `*📝 Nota:* ${customerDetails.instructions}\n`;
    message += `\n*🛒 DETALLE:* \n`;

    itemsToSend.forEach(item => {
      message += `▪️ *${item.quantity}x ${item.name}* ${!shouldSendPartial && item.isServed ? '_(Previo)_' : ''}\n`;

      if (item.selectedModifiers.length > 0) {
        const groups: Record<string, string[]> = {};
        item.selectedModifiers.forEach(m => {
          if (!groups[m.groupTitle]) groups[m.groupTitle] = [];
          groups[m.groupTitle].push(m.option.name);
        });

        Object.entries(groups).forEach(([groupTitle, options]) => {
          message += `   _${groupTitle}:_ ${options.join(', ')}\n`;
        });
      }
      if (item.pizzaConfig?.isSpecialPizza && item.notes) {
        message += `   _Base:_ ${item.notes}\n`;
      }
    });

    if (shouldSendPartial) {
      const previousDebt = cartTotal - displayTotal;
      message += `\n*💰 DEUDA PREVIA: $${previousDebt.toFixed(2)}*\n`;
      message += `*➕ ADICIONAL: $${displayTotal.toFixed(2)}*\n`;
      message += `*💲 TOTAL FINAL: $${cartTotal.toFixed(2)}*\n`;
    } else {
      message += `\n*💰 TOTAL: $${cartTotal.toFixed(2)}*\n`;
    }

    message += `*💳 Estado:* ${isUnpaid ? 'PENDIENTE' : customerDetails.paymentMethod}\n`;

    if (settings.isWhatsAppEnabled) {
      window.open(`https://wa.me/${settings.targetNumber}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      console.log("WhatsApp desactivado por configuración. Pedido:", message);
      alert("✅ Pedido registrado exitosamente (Envío a Cocina por WhatsApp desactivado)");
    }
  };

  if (isSubscriptionInactive) {
    const isActuallyExpired = settings.isLicenseActive && settings.licenseExpiryDate && new Date() > new Date(settings.licenseExpiryDate);

    return (
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-8 text-center bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.95), rgba(0,0,0,0.98)), url(https://images.unsplash.com/photo-1543353071-087092ec393a?q=80&w=2070&auto=format&fit=crop)' }}>
        <div className="w-24 h-24 bg-[#111] rounded-3xl p-3 mx-auto mb-6 shadow-2xl border border-[#FF0000]/30 flex flex-col items-center justify-center">
          <KeclickLogo size="text-2xl" />
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
          {isActuallyExpired ? 'Suscripción Agotada' : 'Periodo de Prueba Vencido'}
        </h2>
        <p className="text-gray-400 text-sm mb-10 max-w-[280px]">
          {isActuallyExpired
            ? `Tu plan profesional ha finalizado. Renueva para seguir facturando.`
            : 'Tu periodo de cortesía de 5 días ha finalizado. Activa tu licencia para continuar con la gestión de tu negocio.'
          }
        </p>

        <div className="space-y-4 w-full max-w-xs">
          <button
            onClick={() => window.open(`https://wa.me/584120000000?text=${encodeURIComponent(`Hola, mi sistema Keclick (${settings.businessName}) ha vencido. Deseo activar mi plan.`)}`, '_blank')}
            className="w-full py-5 bg-[#FF0000] text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all"
          >
            Solicitar Activación
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-white/10 text-white font-bold rounded-2xl uppercase text-[10px] tracking-widest border border-white/5"
          >
            Refrescar Estado
          </button>
        </div>
        <p className="mt-12 text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none">
          {settings.businessName} • ID: {settings.storeId}
        </p>
      </div>
    );
  }

  if (!isAppReady) return <SplashScreen onEnter={() => setIsAppReady(true)} />;

  if (settings.storeId === 'NEW_STORE') {
    return <RegistrationScreen onRegister={handleRegister} onJoin={handleJoin} />;
  }

  if (!currentUser) {
    return (
      <LoginScreen
        users={settings.users}
        onLogin={(user) => {
          setCurrentUser(user);
          if (user.role === 'cocinero') {
            setCurrentView('kitchen');
          }
        }}
        businessName={businessName}
        businessLogo={businessLogo}
      />
    );
  }


  return (
    <>
      <div className="h-full w-full bg-black p-2 box-border">
        <div className="h-full w-full bg-white rounded-[38px] flex flex-col relative overflow-hidden" style={{ backgroundColor: 'var(--page-bg-color)' }}>
          {currentView !== 'kitchen' && (
            <div className="bg-white border-b px-4 py-3 flex justify-around items-center shrink-0">
              <button onClick={() => setCurrentView('menu')} className={`flex flex-col items-center gap-1 ${currentView === 'menu' ? 'text-brand' : 'text-gray-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <span className="text-[10px] font-bold uppercase">Menú</span>
              </button>
              <button onClick={() => setCurrentView('reports')} className={`flex flex-col items-center gap-1 relative ${currentView === 'reports' ? 'text-brand' : 'text-gray-400'}`}>
                {hasReadyPlates && (
                  <span className="absolute -top-1 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-bounce shadow-lg shadow-green-200"></span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <span className="text-[10px] font-bold uppercase">Ventas</span>
              </button>
              <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-brand' : 'text-gray-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M 10.490234 2 C 10.011234 2 9.6017656 2.3385938 9.5097656 2.8085938 L 9.1757812 4.5234375 C 8.3550224 4.8338012 7.5961042 5.2674041 6.9296875 5.8144531 L 5.2851562 5.2480469 C 4.8321563 5.0920469 4.33375 5.2793594 4.09375 5.6933594 L 2.5859375 8.3066406 C 2.3469375 8.7216406 2.4339219 9.2485 2.7949219 9.5625 L 4.1132812 10.708984 C 4.0447181 11.130337 4 11.559284 4 12 C 4 12.440716 4.0447181 12.869663 4.1132812 13.291016 L 2.7949219 14.4375 C 2.4339219 14.7515 2.3469375 15.278359 2.5859375 15.693359 L 4.09375 18.306641 C 4.33275 18.721641 4.8321562 18.908906 5.2851562 18.753906 L 6.9296875 18.1875 C 7.5958842 18.734206 8.3553934 19.166339 9.1757812 19.476562 L 9.5097656 21.191406 C 9.6017656 21.661406 10.011234 22 10.490234 22 L 13.509766 22 C 13.988766 22 14.398234 21.661406 14.490234 21.191406 L 14.824219 19.476562 C 15.644978 19.166199 16.403896 18.732596 17.070312 18.185547 L 18.714844 18.751953 C 19.167844 18.907953 19.66625 18.721641 19.90625 18.306641 L 21.414062 15.691406 C 21.653063 15.276406 21.566078 14.7515 21.205078 14.4375 L 19.886719 13.291016 C 19.955282 12.869663 20 12 C 20 11.559284 19.955282 11.130337 19.886719 10.708984 L 21.205078 9.5625 C 21.566078 9.2485 21.653063 8.7216406 21.414062 8.3066406 L 19.90625 5.6933594 C 19.66725 5.2783594 19.167844 5.0910937 18.714844 5.2460938 L 17.070312 5.8125 C 16.404116 5.2657937 15.644607 4.8336609 14.824219 4.5234375 L 14.490234 2.8085938 C 14.398234 2.3385937 13.988766 2 13.509766 2 L 10.490234 2 z M 12 8 C 14.209 8 16 9.791 16 12 C 16 14.209 14.209 16 12 16 C 9.791 16 8 14.209 8 12 C 8 9.791 9.791 8 12 8 z" /></svg>
                <span className="text-[10px] font-bold uppercase">Ajustes</span>
              </button>
              <button onClick={handleManualSync} className={`flex flex-col items-center gap-1 relative ${isSyncing ? 'text-brand' : 'text-gray-400'}`}>
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${syncStatus === 'online' ? 'bg-green-500' : syncStatus === 'polling' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'
                  }`}></span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span className="text-[10px] font-bold uppercase">{isSyncing ? '...' : 'Sync'}</span>
              </button>
              {currentUser?.role === 'admin' && (
                <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-brand' : 'text-gray-400'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                  <span className="text-[10px] font-bold uppercase">Maestro</span>
                </button>
              )}
              <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span className="text-[10px] font-bold uppercase">Salir</span>
              </button>
            </div>
          )}


          {/* Notificación de Platos EN PREPARACIÓN (Amarillo) */}
          {/* Notificación de Platos EN PREPARACIÓN (Amarillo - Tipo Carrusel) */}
          {currentUser && currentUser.role === 'mesero' && hasPreparingPlates && currentView !== 'kitchen' && (
            <div className="bg-amber-500 text-white py-2 px-4 shadow-lg animate-in slide-in-from-top duration-500 z-[100] shrink-0 border-b border-amber-600 flex items-center justify-between gap-3 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex h-6 w-6 items-center justify-center bg-white text-amber-600 rounded-full animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span className="text-[10px] font-black uppercase tracking-tighter text-amber-50">COCINANDO...</span>
              </div>

              <div className="flex-1 overflow-hidden flex items-center gap-3">
                <div className="animate-marquee whitespace-nowrap text-xs font-bold uppercase italic tracking-widest min-w-[100px] text-white">
                  {preparingPlatesDetails.map((item, idx) => (
                    <span key={idx} className="mr-8">
                      🔥 {item.itemName} ({item.table})
                    </span>
                  ))}
                </div>
              </div>
              {/* No botón de acción para estado 'preparando', solo informativo */}
            </div>
          )}

          {/* Notificación de Platos Listos (Existente - Verde) */}
          {currentUser && (currentUser.role === 'mesero' || currentUser.role === 'admin') && hasReadyPlates && currentView !== 'kitchen' && (
            <div className="bg-green-600 text-white py-2 px-4 shadow-lg animate-in slide-in-from-top duration-500 z-[100] shrink-0 border-b border-green-700 flex items-center justify-between gap-3 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex h-6 w-6 items-center justify-center bg-white text-green-600 rounded-full animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-[10px] font-black uppercase tracking-tighter">¡IR A COCINA!</span>
              </div>

              <div className="flex-1 overflow-hidden flex items-center gap-3">
                <div className="animate-marquee whitespace-nowrap text-xs font-bold uppercase italic tracking-widest min-w-[100px]">
                  {readyPlatesDetails.map((item, idx) => (
                    <span key={idx} className="mr-8">
                      🍴 {item.itemName} ({item.table})
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); handleMarkAllServed(); }}
                className="bg-white text-green-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-90 transition-transform whitespace-nowrap border border-green-500 shrink-0"
              >
                ENTREGADO ✓
              </button>

              <style>{`
                  @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                  }
                  .animate-marquee {
                    display: inline-block;
                    animation: marquee 15s linear infinite;
                  }
                `}</style>
            </div>
          )}
          {(() => {
            if (settings.storeId === 'NEW_STORE') {
              return <RegistrationScreen onRegister={handleRegister} onJoin={handleJoin} />;
            }

            if (isSubscriptionInactive) {
              return (
                <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
                  <KeclickLogo size="text-6xl" />
                  <div className="mt-8 bg-[#111] p-10 rounded-[3rem] border border-red-500/20 max-w-sm shadow-2xl">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">PRUEBA VENCIDA</h2>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8">
                      Tus 5 días de prueba han terminado. Para continuar usando **Keclick PRO**, contacta con soporte para activar tu licencia.
                    </p>
                    <button
                      onClick={() => window.open(`https://wa.me/${settings.targetNumber || '584120000000'}?text=Hola, mi prueba de Keclick (${settings.storeId}) ha vencido. Deseo activar mi plan.`, '_blank')}
                      className="w-full py-4 bg-[#FFD700] text-black font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-transform"
                    >
                      Activar Ahora
                    </button>
                  </div>
                </div>
              );
            }

            switch (currentView) {
              case 'menu': return <MenuScreen menu={menu} cart={cart} onAddItem={handleAddItem} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} onClearCart={handleClearCart} cartItemCount={cart.reduce((acc, item) => acc + item.quantity, 0)} onOpenModifierModal={setModifierModalItem} onOpenPizzaBuilder={setPizzaBuilderItem} onGoToCart={() => setCurrentView('cart')} businessName={businessName} businessLogo={businessLogo} triggerShake={triggerCartShake} showInstallButton={showInstallBtn} onInstallApp={handleInstallClick} activeRate={activeRate} isEditing={!!editingReportId} theme={theme} />;
              case 'cart': return <CartScreen cart={cart} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} onClearCart={handleClearCart} onBackToMenu={() => setCurrentView('menu')} onGoToCheckout={() => setCurrentView('checkout')} onEditItem={(id) => { const item = cart.find(i => i.id === id); if (item) { setEditingCartItemId(id); for (const cat of menu) { const original = cat.items.find(i => i.name === item.name); if (original) { setModifierModalItem(original); break; } } } }} activeRate={activeRate} isEditing={!!editingReportId} isAdmin={currentUser?.role === 'admin'} />;
              case 'checkout': return <CheckoutScreen cart={cart} customerDetails={customerDetails} paymentMethods={['Efectivo', 'Pago Móvil', 'Zelle', 'Divisas']} onUpdateDetails={setCustomerDetails} onBack={() => setCurrentView('cart')} onSubmitOrder={() => setConfirmOrderModalOpen(true)} onEditUserDetails={handleLogout} onClearCart={handleClearCart} activeRate={activeRate} isEditing={!!editingReportId} />;
              case 'settings': {
                return <SettingsScreen
                  settings={settings}
                  onSaveSettings={(s) => {
                    setSettings(s);
                    syncSettings(s as AppSettings);
                  }}
                  onGoToTables={() => setCurrentView('menu')}
                  waiter={currentUser?.name || ''}
                  onLogout={handleLogout}
                  waiterAssignments={{}}
                  onSaveAssignments={{}}
                  storeProfiles={memoizedProfiles}
                  onUpdateStoreProfiles={(profiles) => {
                    const p = Array.isArray(profiles) ? profiles[0] : (typeof profiles === 'function' ? profiles([])[0] : null);
                    if (p) {
                      setBusinessName(p.name);
                      setMenu(p.menu);
                      setModifierGroups(p.modifierGroups);
                      setTheme(p.theme);
                      // Eliminamos el setSettings de aquí ya que SettingsScreen ya se encarga 
                      // de enviar el objeto de settings completo y actualizado.
                    }
                  }}
                  activeTableNumbers={[]}
                  onBackupAllSalesData={() => { }}
                  onClearAllSalesData={() => {
                    if (window.confirm("¿Borrar definitivamente todo el historial?")) {
                      setReports([]);
                    }
                  }}
                  onConnectPrinter={handleConnectPrinter}
                  onDisconnectPrinter={handleDisconnectPrinter}
                  isPrinterConnected={isPrinterConnected}
                  printerName={printerDevice?.name}
                  onPrintTest={handlePrintTest}
                  pizzaIngredients={pizzaIngredients}
                  pizzaBasePrices={pizzaBasePrices}
                  onUpdatePizzaConfig={(ingredients, basePrices) => {
                    setPizzaIngredients(ingredients);
                    setPizzaBasePrices(basePrices);
                  }}
                  onResetApp={() => {
                    if (window.confirm("¿Seguro que quieres cerrar este negocio en este dispositivo? Tendrás que usar un código para volver a entrar.")) {
                      setSettings(prev => ({ ...prev, storeId: 'NEW_STORE' }));
                      setCurrentView('menu');
                    }
                  }}
                />;
              }
              case 'reports': return <ReportsScreen reports={reports} dayClosures={dayClosures} onGoToTables={() => setCurrentView('menu')} onDeleteReports={(ids) => { setReports(prev => prev.filter(r => !ids.includes(r.id))); return true; }} settings={settings} onStartNewDay={handleStartNewDay} currentWaiter={currentUser?.name || ''} onOpenSalesHistory={() => setIsSalesHistoryModalOpen(true)} onReprintSaleRecord={handleReprintSaleRecord} isPrinterConnected={isPrinterConnected} onEditPendingReport={handleEditPendingReport} onVoidReport={handleVoidReport} isAdmin={currentUser?.role === 'admin'} />;
              case 'dashboard': return <AdminDashboard reports={reports} settings={settings} onGoToView={(v) => setCurrentView(v)} onEditOrder={handleEditPendingReport} onVoidOrder={handleVoidReport} onReprintOrder={handleReprintSaleRecord} isPrinterConnected={isPrinterConnected} />;
              case 'kitchen': return <KitchenScreen
                reports={reports}
                settings={settings}
                currentUser={currentUser}
                onUpdateItemStatus={(reportId, itemId, stationId, status) => {
                  let updatedReportToSync: SaleRecord | null = null;
                  const updatedReports = reports.map(r => {
                    if (r.id !== reportId) return r;
                    const updated = {
                      ...r,
                      order: r.order.map((item: any) => {
                        if (item.id !== itemId) return item;
                        const currentStatus = item.kitchenStatus || {};
                        return {
                          ...item,
                          kitchenStatus: { ...currentStatus, [stationId]: status }
                        };
                      })
                    };
                    updatedReportToSync = updated;
                    return updated;
                  });
                  setReports(updatedReports);
                  if (updatedReportToSync) syncSale(updatedReportToSync);
                }}
                onCloseOrder={(reportId) => {
                  if (window.confirm("¿Dar por terminada esta comanda?")) {
                    const updatedReports = reports.map(r => r.id === reportId ? { ...r, closed: true } : r);
                    setReports(updatedReports);
                    const closedReport = updatedReports.find(r => r.id === reportId);
                    if (closedReport) syncSale(closedReport);
                  }
                }}
                onLogout={handleLogout}
              />;
              case 'success': return <SuccessScreen cart={lastSoldRecord?.cart || []} customerDetails={lastSoldRecord?.details || customerDetails} onStartNewOrder={handleStartNewOrder} onReprint={() => handlePrintOrder(undefined, true)} isPrinterConnected={isPrinterConnected} activeRate={activeRate} />;
              default: return null;
            }
          })()}
        </div>
      </div>


      {modifierModalItem && (
        <ProductModifierModal
          item={modifierModalItem}
          initialCartItem={editingCartItemId ? cart.find(i => i.id === editingCartItemId) : null}
          allModifierGroups={modifierGroups}
          onClose={() => { setModifierModalItem(null); setEditingCartItemId(null); }}
          onSubmit={(item, mods, qty) => {
            if (editingCartItemId) {
              setCart(prev => prev.map(i => i.id === editingCartItemId ? { ...i, selectedModifiers: mods, quantity: qty } : i));
              setEditingCartItemId(null);
            } else {
              handleAddItem(item, mods, qty);
            }
            setModifierModalItem(null);
          }}
          activeRate={activeRate}
        />
      )
      }

      {
        pizzaBuilderItem && (
          <PizzaBuilderModal
            item={pizzaBuilderItem}
            onClose={() => setPizzaBuilderItem(null)}
            onSubmit={handleAddPizzaToCart}
            activeRate={activeRate}
            isSpecialPizza={pizzaBuilderItem.isSpecialPizza || false}
            defaultIngredients={pizzaBuilderItem.defaultIngredients || []}
            pizzaIngredients={pizzaIngredients}
            pizzaBasePrices={pizzaBasePrices}
            allModifierGroups={modifierGroups}
          />
        )
      }

      {
        isConfirmOrderModalOpen && (
          <ConfirmOrderModal
            isOpen={isConfirmOrderModalOpen}
            onClose={() => setConfirmOrderModalOpen(false)}
            isPrinterConnected={isPrinterConnected}
            isEdit={!!editingReportId}
            onConfirmPrintAndSend={async () => {
              if (isPrinterConnected) await handlePrintOrder();
              executeSendToWhatsapp();
              finalizeOrder(true);
              setConfirmOrderModalOpen(false);
            }}
            onConfirmPrintOnly={async () => {
              if (isPrinterConnected) await handlePrintOrder();
              finalizeOrder(true);
              setConfirmOrderModalOpen(false);
            }}
            onConfirmSendOnly={() => {
              executeSendToWhatsapp();
              finalizeOrder(true);
              setConfirmOrderModalOpen(false);
            }}
            onConfirmSendUnpaid={async () => {
              if (isPrinterConnected) await handlePrintOrder("POR COBRAR");
              executeSendToWhatsapp(true);
              finalizeOrder(false);
              setConfirmOrderModalOpen(false);
            }}
            userRole={currentUser?.role || 'mesero'}
            waitersCanCharge={settings.waitersCanCharge}
          />
        )
      }

      {
        isSalesHistoryModalOpen && (
          <SalesHistoryModal reports={reports} onClose={() => setIsSalesHistoryModalOpen(false)} />
        )
      }

      {
        pendingVoidReportId && (
          <AdminAuthModal
            validPins={settings.users.filter(u => u.role === 'admin').map(u => u.pin)}
            onClose={() => setPendingVoidReportId(null)}
            onSuccess={executeVoidReport}
            title="Anular Ticket"
          />
        )
      }

      {
        isAdminAuthForClearCart && (
          <AdminAuthModal
            validPins={settings.users.filter(u => u.role === 'admin').map(u => u.pin)}
            onClose={() => setIsAdminAuthForClearCart(false)}
            onSuccess={executeClearCart}
            title="Eliminar Pedido Completo"
          />
        )
      }

      {
        pendingRemoveItemId && (
          <AdminAuthModal
            validPins={settings.users.filter(u => u.role === 'admin').map(u => u.pin)}
            onClose={() => setPendingRemoveItemId(null)}
            onSuccess={executeRemoveItem}
            title="Eliminar Producto del Pedido"
            requireReason={!!(pendingRemoveItemId && cart.find(i => i.id === pendingRemoveItemId)?.isServed)}
          />
        )
      }

      {
        showInstallModal && (
          <InstallPromptModal
            isOpen={showInstallModal}
            onClose={() => setShowInstallModal(false)}
            onInstall={triggerNativeInstall}
            platform={platform}
          />
        )
      }

      {/* ÁREA DE IMPRESIÓN PARA NAVEGADOR (OCULTA) */}
      {
        receiptToPrint && (
          <div id="printable-receipt" className="p-4 bg-white text-black font-mono text-[12px]">
            <div className="text-center font-black text-lg uppercase mb-2 border-b-2 border-dashed border-black pb-2">
              {businessName}
            </div>
            <div className="text-center font-bold mb-4">
              {receiptToPrint.title || 'RECIBO DE PEDIDO'}
            </div>
            <div className="space-y-1 mb-4">
              <div className="flex justify-between"><span>FECHA:</span> <span>{new Date().toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span>HORA:</span> <span>{new Date().toLocaleTimeString()}</span></div>
              <div className="flex justify-between"><span>MESERO:</span> <span>{receiptToPrint.waiter}</span></div>
              <div className="flex justify-between"><span>REF:</span> <span>{receiptToPrint.customer.name}</span></div>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="space-y-3">
              {receiptToPrint.cart.map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex justify-between font-bold">
                    <span>{item.quantity}X {item.name}</span>
                    <span>${((item.price + item.selectedModifiers.reduce((acc, m) => acc + m.option.price, 0)) * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.selectedModifiers.map((mod, midx) => (
                    <div key={midx} className="text-[10px] ml-2 italic">
                      - {mod.option.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="border-t-2 border-dashed border-black mt-4 pt-2">
              <div className="flex justify-between text-lg font-black">
                <span>TOTAL:</span>
                <span>${receiptToPrint.cart.reduce((acc, item) => acc + ((item.price + item.selectedModifiers.reduce((s, m) => s + m.option.price, 0)) * item.quantity), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>METODO:</span>
                <span>{receiptToPrint.customer.paymentMethod}</span>
              </div>
            </div>
            <div className="text-center mt-6 text-[10px]">
              ¡GRACIAS POR SU COMPRA!
            </div>
          </div>
        )
      }
    </>
  );
}

export default App;
