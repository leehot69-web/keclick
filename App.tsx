
import React, { useState, useEffect, useCallback } from 'react';
import { View, MenuItem, StoreProfile, CartItem, CustomerDetails, SelectedModifier, MenuCategory, ModifierGroup, AppSettings, SaleRecord, ThemeName, PizzaConfiguration } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { MARGARITA_MENU_DATA, MARGARITA_MODIFIERS } from './constants';
import MenuScreen from './components/MenuScreen';
import CartScreen from './components/CartScreen';
import CheckoutScreen from './components/CheckoutScreen';
import ProductModifierModal from './components/ProductModifierModal';
import SplashScreen from './components/SplashScreen';
import SettingsScreen from './components/SettingsScreen';
import ReportsScreen from './components/ReportsScreen';
import InstallPromptModal from './components/InstallPromptModal';
import { generateTestPrintCommands, generateReceiptCommands } from './utils/escpos';
import SalesHistoryModal from './components/SalesHistoryModal';
import ConfirmOrderModal from './components/ConfirmOrderModal';
import SuccessScreen from './components/SuccessScreen';
import AdminAuthModal from './components/AdminAuthModal';
import PizzaBuilderModal from './components/PizzaBuilderModal';

function App() {
  // --- ESTADO PERSISTENTE ---
  const [menu, setMenu] = useLocalStorage<MenuCategory[]>('app_menu_v1', MARGARITA_MENU_DATA);
  const [modifierGroups, setModifierGroups] = useLocalStorage<ModifierGroup[]>('app_modifiers_v1', MARGARITA_MODIFIERS);
  const [theme, setTheme] = useLocalStorage<ThemeName>('app_theme_v1', 'margarita');
  const [businessName, setBusinessName] = useLocalStorage<string>('app_business_name_v1', 'Margarita Pizzería');
  const businessLogo = "https://i.imgur.com/TXJrPwn.png";

  const [session, setSession] = useLocalStorage<{ waiter: string, targetNumber: string }>('pos_session_active', {
    waiter: '',
    targetNumber: ''
  });

  const [settings, setSettings] = useLocalStorage<AppSettings>('app_settings_v1', {
    totalTables: 20,
    printerPaperWidth: '58mm',
    exchangeRateBCV: 36.5,
    exchangeRateParallel: 40,
    activeExchangeRate: 'parallel',
    isTrialActive: false,
    operationCount: 0,
    adminPin: '0000'
  });

  const [reports, setReports] = useLocalStorage<SaleRecord[]>('app_sales_reports', []);
  const [cart, setCart] = useLocalStorage<CartItem[]>('active_cart_data', []);
  const [editingReportId, setEditingReportId] = useLocalStorage<string | null>('active_editing_report_id', null);
  const [currentView, setCurrentView] = useState<View>('menu');
  const [isAppReady, setIsAppReady] = useState(false);
  const [triggerCartShake, setTriggerCartShake] = useState(false);
  const [modifierModalItem, setModifierModalItem] = useState<MenuItem | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [isSalesHistoryModalOpen, setIsSalesHistoryModalOpen] = useState(false);
  const [isConfirmOrderModalOpen, setConfirmOrderModalOpen] = useState(false);
  const [pendingVoidReportId, setPendingVoidReportId] = useState<string | null>(null);
  const [pizzaBuilderItem, setPizzaBuilderItem] = useState<MenuItem | null>(null);

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
    const CHUNK_SIZE = 256;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await characteristic.writeValue(chunk);
      await new Promise(resolve => setTimeout(resolve, 50));
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

  const handlePrintOrder = async (overrideStatus?: string) => {
    if (!printerCharacteristic) {
      console.warn("Impresora no conectada. No se pudo imprimir.");
      return;
    }
    try {
      const customDetails = overrideStatus ? { ...customerDetails, paymentMethod: overrideStatus } : customerDetails;
      const commands = generateReceiptCommands(cart, customDetails, { ...settings, businessName: businessName }, session.waiter);
      const data = textEncoder.encode(commands);
      await sendDataToPrinter(printerCharacteristic, data);
    } catch (error) {
      console.error("Error al imprimir recibo:", error);
    }
  };

  const handleReprintSaleRecord = async (sale: SaleRecord) => {
    if (!printerCharacteristic) return;
    try {
      const customerDetailsForReprint: CustomerDetails = {
        name: sale.customerName || (sale.tableNumber > 0 ? `Ref: ${sale.tableNumber}` : 'Pedido Directo'),
        paymentMethod: sale.notes || 'No especificado',
        phone: '',
        instructions: '',
      };
      const commands = generateReceiptCommands(sale.order as CartItem[], customerDetailsForReprint, { ...settings, businessName: businessName }, sale.waiter);
      const data = textEncoder.encode(commands);
      await sendDataToPrinter(printerCharacteristic, data);
    } catch (error) {
      console.error("Error al re-imprimir recibo:", error);
    }
  };

  const handleEditPendingReport = (report: SaleRecord, targetView: View = 'cart') => {
    const mappedOrder = (report.order as CartItem[]).map(item => ({
      ...item,
      notes: 'original'
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
    setReports(prev => prev.map(r => r.id === pendingVoidReportId ? { ...r, notes: 'ANULADO', total: 0, type: 'refund' } : r));
    setPendingVoidReportId(null);
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const waiter = formData.get('waiter') as string;
    const targetNumber = formData.get('targetNumber') as string;
    if (waiter.trim() && targetNumber.trim()) {
      setSession({ waiter: waiter.trim(), targetNumber: targetNumber.replace(/\D/g, '') });
      setCurrentView('menu');
    }
  };

  const handleLogout = () => {
    setSession({ waiter: '', targetNumber: '' });
    setCurrentView('menu');
  };

  const handleStartNewDay = () => {
    if (window.confirm("¿Estás seguro de finalizar tu jornada actual?")) {
      setCart([]);
      setSession({ waiter: '', targetNumber: '' });
      setCurrentView('menu');
    }
  };

  const handleUpdateQuantity = (cartItemId: string, newQuantity: number) => {
    const item = cart.find(i => i.id === cartItemId);
    if (item?.notes === 'original' && newQuantity < item.quantity) {
      alert("No puedes reducir la cantidad de un producto ya servido.");
      return;
    }

    if (newQuantity <= 0) {
      setCart(prev => prev.filter(i => i.id !== cartItemId));
    } else {
      setCart(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity: newQuantity } : i));
    }
    setTriggerCartShake(true);
    setTimeout(() => setTriggerCartShake(false), 500);
  };

  const handleAddItem = (item: MenuItem, selectedModifiers: SelectedModifier[], quantity: number) => {
    const hasModifiers = item.modifierGroupTitles && item.modifierGroupTitles.length > 0;
    if (!hasModifiers) {
      const existingItem = cart.find(cartItem => cartItem.name === item.name && cartItem.selectedModifiers.length === 0 && cartItem.notes !== 'original');
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
      selectedModifiers: selectedModifiers
    }]);
    setTriggerCartShake(true);
    setTimeout(() => setTriggerCartShake(false), 500);
  };

  // Función para agregar pizza al carrito
  const handleAddPizzaToCart = (item: MenuItem, pizzaConfig: PizzaConfiguration, quantity: number) => {
    // Calcular precio total de la pizza
    let totalPrice = pizzaConfig.basePrice;
    pizzaConfig.ingredients.forEach(sel => {
      // Si es pizza especial y el ingrediente está en defaultIngredients, no cobra
      if (pizzaConfig.isSpecialPizza && item.defaultIngredients?.includes(sel.ingredient.name)) {
        return;
      }
      const ingPrice = sel.ingredient.prices[pizzaConfig.size];
      if (sel.half === 'left' || sel.half === 'right') {
        totalPrice += ingPrice / 2;
      } else {
        totalPrice += ingPrice;
      }
    });

    // Clasificar ingredientes por posición
    const leftIngs = pizzaConfig.ingredients.filter(i => i.half === 'left').map(i => i.ingredient.name);
    const rightIngs = pizzaConfig.ingredients.filter(i => i.half === 'right').map(i => i.ingredient.name);
    const fullIngs = pizzaConfig.ingredients.filter(i => i.half === 'full').map(i => i.ingredient.name);

    // Crear nombre descriptivo completo para cocina
    let pizzaName = pizzaConfig.isSpecialPizza && pizzaConfig.specialPizzaName
      ? `${pizzaConfig.specialPizzaName} (Familiar)`
      : `Pizza ${pizzaConfig.size}`;

    // Crear modificadores visuales detallados para el carrito y cocina
    const modifiers: SelectedModifier[] = [];

    // Modificador de tamaño (siempre primero)
    modifiers.push({
      groupTitle: 'Tamaño',
      option: { name: pizzaConfig.size, price: 0 }
    });

    // Ingredientes en toda la pizza
    if (fullIngs.length > 0) {
      modifiers.push({
        groupTitle: '🍕 TODA LA PIZZA',
        option: { name: fullIngs.join(', '), price: 0 }
      });
    }

    // Ingredientes en mitad izquierda
    if (leftIngs.length > 0) {
      modifiers.push({
        groupTitle: '◐ MITAD IZQUIERDA',
        option: { name: leftIngs.join(', '), price: 0 }
      });
    }

    // Ingredientes en mitad derecha
    if (rightIngs.length > 0) {
      modifiers.push({
        groupTitle: '◑ MITAD DERECHA',
        option: { name: rightIngs.join(', '), price: 0 }
      });
    }

    // Si es pizza especial, agregar nota de ingredientes incluidos
    if (pizzaConfig.isSpecialPizza && item.defaultIngredients && item.defaultIngredients.length > 0) {
      modifiers.push({
        groupTitle: '✓ INGREDIENTES BASE',
        option: { name: item.defaultIngredients.join(', '), price: 0 }
      });
    }

    const newCartItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: pizzaName,
      price: totalPrice,
      quantity: quantity,
      selectedModifiers: modifiers,
      pizzaConfig: pizzaConfig,
      notes: pizzaConfig.isSpecialPizza ? item.description : undefined // Guardar descripción original
    };

    setCart(prev => [...prev, newCartItem]);
    setTriggerCartShake(true);
    setTimeout(() => setTriggerCartShake(false), 500);
    setPizzaBuilderItem(null);
  };

  // Función corregida: Garantiza el reset total del estado
  const handleClearCart = useCallback(() => {
    const isEditing = !!editingReportId;
    const msg = isEditing
      ? "¿Seguro que deseas ABANDONAR la edición actual? Se perderán los cambios no guardados."
      : "¿Seguro que deseas borrar todo el pedido actual y empezar de cero?";

    if (window.confirm(msg)) {
      setCart([]);
      setEditingReportId(null);
      setCustomerDetails({ name: '', phone: '', paymentMethod: 'Efectivo', instructions: '' });
      setCurrentView('menu');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingReportId]);

  const finalizeOrder = (isPaid: boolean = true) => {
    const cartTotal = cart.reduce((acc, item) => {
      const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
      return acc + ((item.price + modTotal) * item.quantity);
    }, 0);

    const newReport: SaleRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      tableNumber: parseInt(customerDetails.name) || 0,
      waiter: session.waiter,
      total: cartTotal,
      order: [...cart],
      type: 'sale',
      notes: isPaid ? customerDetails.paymentMethod : 'PENDIENTE',
      customerName: customerDetails.name
    };

    setReports(prev => {
      const filtered = editingReportId ? prev.filter(r => r.id !== editingReportId) : prev;
      return [newReport, ...filtered];
    });

    setEditingReportId(null);
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
    let message = "";

    if (isEdit) {
      message = isUnpaid ? `*♻️ ACTUALIZACIÓN DE PENDIENTE*\n\n` : `*✅ CUENTA COBRADA / CERRADA*\n\n`;
    } else {
      message = isUnpaid ? `*⚠️ NUEVO PEDIDO (POR COBRAR)*\n\n` : `*🔔 NUEVO PEDIDO*\n\n`;
    }

    message += `*🤵 Mesero:* ${session.waiter}\n`;
    message += `*📍 Referencia:* ${customerDetails.name}\n`;
    if (customerDetails.instructions) message += `*📝 Nota:* ${customerDetails.instructions}\n`;
    message += `\n*🛒 DETALLE:* \n`;

    cart.forEach(item => {
      message += `▪️ *${item.quantity}x ${item.name}* ${item.notes === 'original' ? '_(Ya servido)_' : ''}\n`;

      if (item.selectedModifiers.length > 0) {
        // Agrupar modificadores por grupo para que sea claro (Mitades, etc)
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

    message += `\n*💰 TOTAL: $${cartTotal.toFixed(2)}*\n`;
    message += `*💳 Estado:* ${isUnpaid ? 'PENDIENTE' : customerDetails.paymentMethod}\n`;
    window.open(`https://wa.me/${session.targetNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isAppReady && (!session.waiter || !session.targetNumber)) {
    return (
      <div className="h-full w-full bg-black p-2 box-border">
        <div className="h-full w-full bg-white rounded-[38px] flex flex-col relative overflow-hidden" style={{ backgroundColor: 'var(--page-bg-color)' }}>
          <div className="h-full w-full flex flex-col items-center justify-center p-8 overflow-y-auto">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-10 shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-gray-100 p-2">
              <img src={businessLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black mb-1 uppercase text-center tracking-tight text-gray-800">{businessName}</h1>
            <p className="text-gray-400 text-center mb-10 text-[11px] font-bold uppercase tracking-widest max-w-[280px]">Configura tus datos para comenzar</p>
            <form onSubmit={handleRegister} className="w-full space-y-5">
              <input name="waiter" type="text" required placeholder="Tu Nombre" className="w-full p-5 bg-white border border-gray-400 text-black rounded-[22px] font-bold outline-none" />
              <input name="targetNumber" type="tel" required placeholder="WhatsApp Cocina" className="w-full p-5 bg-white border border-gray-400 text-black rounded-[22px] font-bold outline-none" />
              <button type="submit" className="w-full py-5 bg-[var(--brand-color)] text-white font-black rounded-[22px] uppercase tracking-widest mt-4">Comenzar Jornada</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!isAppReady) return <SplashScreen onEnter={() => setIsAppReady(true)} />;

  return (
    <>
      <div className="h-full w-full bg-black p-2 box-border">
        <div className="h-full w-full bg-white rounded-[38px] flex flex-col relative overflow-hidden" style={{ backgroundColor: 'var(--page-bg-color)' }}>
          <div className="bg-white border-b px-4 py-3 flex justify-around items-center shrink-0">
            <button onClick={() => setCurrentView('menu')} className={`flex flex-col items-center gap-1 ${currentView === 'menu' ? 'text-brand' : 'text-gray-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <span className="text-[10px] font-bold uppercase">Menú</span>
            </button>
            <button onClick={() => setCurrentView('reports')} className={`flex flex-col items-center gap-1 ${currentView === 'reports' ? 'text-brand' : 'text-gray-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span className="text-[10px] font-bold uppercase">Ventas</span>
            </button>
            <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-brand' : 'text-gray-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M 10.490234 2 C 10.011234 2 9.6017656 2.3385938 9.5097656 2.8085938 L 9.1757812 4.5234375 C 8.3550224 4.8338012 7.5961042 5.2674041 6.9296875 5.8144531 L 5.2851562 5.2480469 C 4.8321563 5.0920469 4.33375 5.2793594 4.09375 5.6933594 L 2.5859375 8.3066406 C 2.3469375 8.7216406 2.4339219 9.2485 2.7949219 9.5625 L 4.1132812 10.708984 C 4.0447181 11.130337 4 11.559284 4 12 C 4 12.440716 4.0447181 12.869663 4.1132812 13.291016 L 2.7949219 14.4375 C 2.4339219 14.7515 2.3469375 15.278359 2.5859375 15.693359 L 4.09375 18.306641 C 4.33275 18.721641 4.8321562 18.908906 5.2851562 18.753906 L 6.9296875 18.1875 C 7.5958842 18.734206 8.3553934 19.166339 9.1757812 19.476562 L 9.5097656 21.191406 C 9.6017656 21.661406 10.011234 22 10.490234 22 L 13.509766 22 C 13.988766 22 14.398234 21.661406 14.490234 21.191406 L 14.824219 19.476562 C 15.644978 19.166199 16.403896 18.732596 17.070312 18.185547 L 18.714844 18.751953 C 19.167844 18.907953 19.66625 18.721641 19.90625 18.306641 L 21.414062 15.691406 C 21.653063 15.276406 21.566078 14.7515 21.205078 14.4375 L 19.886719 13.291016 C 19.955282 12.869663 20 12 C 20 11.559284 19.955282 11.130337 19.886719 10.708984 L 21.205078 9.5625 C 21.566078 9.2485 21.653063 8.7216406 21.414062 8.3066406 L 19.90625 5.6933594 C 19.66725 5.2783594 19.167844 5.0910937 18.714844 5.2460938 L 17.070312 5.8125 C 16.404116 5.2657937 15.644607 4.8336609 14.824219 4.5234375 L 14.490234 2.8085938 C 14.398234 2.3385937 13.988766 2 13.509766 2 L 10.490234 2 z M 12 8 C 14.209 8 16 9.791 16 12 C 16 14.209 14.209 16 12 16 C 9.791 16 8 14.209 8 12 C 8 9.791 9.791 8 12 8 z" /></svg>
              <span className="text-[10px] font-bold uppercase">Ajustes</span>
            </button>
          </div>

          {(() => {
            switch (currentView) {
              case 'menu': return <MenuScreen menu={menu} cart={cart} onAddItem={handleAddItem} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={(id) => setCart(prev => prev.filter(i => i.id !== id))} onClearCart={handleClearCart} cartItemCount={cart.reduce((acc, item) => acc + item.quantity, 0)} onOpenModifierModal={setModifierModalItem} onOpenPizzaBuilder={setPizzaBuilderItem} onGoToCart={() => setCurrentView('cart')} businessName={businessName} businessLogo={businessLogo} triggerShake={triggerCartShake} showInstallButton={showInstallBtn} onInstallApp={handleInstallClick} activeRate={activeRate} isEditing={!!editingReportId} />;
              case 'cart': return <CartScreen cart={cart} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={(id) => setCart(prev => prev.filter(i => i.id !== id))} onClearCart={handleClearCart} onBackToMenu={() => setCurrentView('menu')} onGoToCheckout={() => setCurrentView('checkout')} onEditItem={(id) => { const item = cart.find(i => i.id === id); if (item) { setEditingCartItemId(id); for (const cat of menu) { const original = cat.items.find(i => i.name === item.name); if (original) { setModifierModalItem(original); break; } } } }} activeRate={activeRate} isEditing={!!editingReportId} />;
              case 'checkout': return <CheckoutScreen cart={cart} customerDetails={customerDetails} paymentMethods={['Efectivo', 'Pago Móvil', 'Zelle', 'Divisas']} onUpdateDetails={setCustomerDetails} onBack={() => setCurrentView('cart')} onSubmitOrder={() => setConfirmOrderModalOpen(true)} onEditUserDetails={handleLogout} onClearCart={handleClearCart} activeRate={activeRate} isEditing={!!editingReportId} />;
              case 'settings': return <SettingsScreen settings={settings} onSaveSettings={setSettings} onGoToTables={() => setCurrentView('menu')} waiter={session.waiter} onLogout={handleLogout} waiterAssignments={{}} onSaveAssignments={{}} storeProfiles={[{ id: 'main', name: businessName, logo: businessLogo, menu: menu, whatsappNumber: session.targetNumber, modifierGroups: modifierGroups, theme: theme, paymentMethods: [] }]} onUpdateStoreProfiles={(profiles) => { const p = Array.isArray(profiles) ? profiles[0] : (typeof profiles === 'function' ? profiles([])[0] : null); if (p) { setBusinessName(p.name); setMenu(p.menu); setModifierGroups(p.modifierGroups); setTheme(p.theme); } }} activeTableNumbers={[]} onBackupAllSalesData={() => { }} onClearAllSalesData={() => { if (window.confirm("¿Borrar definitivamente todo el historial?")) { setReports([]); } }} onConnectPrinter={handleConnectPrinter} onDisconnectPrinter={handleDisconnectPrinter} isPrinterConnected={isPrinterConnected} printerName={printerDevice?.name} onPrintTest={handlePrintTest} />;
              case 'reports': return <ReportsScreen reports={reports} onGoToTables={() => setCurrentView('menu')} onDeleteReports={(ids) => { setReports(prev => prev.filter(r => !ids.includes(r.id))); return true; }} settings={settings} onStartNewDay={handleStartNewDay} currentWaiter={session.waiter} onOpenSalesHistory={() => setIsSalesHistoryModalOpen(true)} onReprintSaleRecord={handleReprintSaleRecord} isPrinterConnected={isPrinterConnected} onEditPendingReport={handleEditPendingReport} onVoidReport={handleVoidReport} />;
              case 'success': return <SuccessScreen cart={cart} customerDetails={customerDetails} onStartNewOrder={handleStartNewOrder} onReprint={handlePrintOrder} isPrinterConnected={isPrinterConnected} activeRate={activeRate} />;
              default: return null;
            }
          })()}
        </div>
      </div>

      {modifierModalItem && (
        <ProductModifierModal item={modifierModalItem} initialCartItem={editingCartItemId ? cart.find(i => i.id === editingCartItemId) : null} allModifierGroups={modifierGroups} onClose={() => { setModifierModalItem(null); setEditingCartItemId(null); }} onSubmit={(item, mods, qty) => { if (editingCartItemId) { setCart(prev => prev.map(i => i.id === editingCartItemId ? { ...i, selectedModifiers: mods, quantity: qty } : i)); setEditingCartItemId(null); } else { handleAddItem(item, mods, qty); } setModifierModalItem(null); }} activeRate={activeRate} />
      )}
      {pizzaBuilderItem && (
        <PizzaBuilderModal
          item={pizzaBuilderItem}
          onClose={() => setPizzaBuilderItem(null)}
          onSubmit={handleAddPizzaToCart}
          activeRate={activeRate}
          isSpecialPizza={pizzaBuilderItem.isSpecialPizza || false}
          defaultIngredients={pizzaBuilderItem.defaultIngredients || []}
        />
      )}
      {isConfirmOrderModalOpen && (
        <ConfirmOrderModal isOpen={isConfirmOrderModalOpen} onClose={() => setConfirmOrderModalOpen(false)} isPrinterConnected={isPrinterConnected} isEdit={!!editingReportId} onConfirmPrintAndSend={async () => { if (isPrinterConnected) await handlePrintOrder(); executeSendToWhatsapp(); finalizeOrder(true); setConfirmOrderModalOpen(false); }} onConfirmPrintOnly={async () => { if (isPrinterConnected) await handlePrintOrder(); finalizeOrder(true); setConfirmOrderModalOpen(false); }} onConfirmSendOnly={() => { executeSendToWhatsapp(); finalizeOrder(true); setConfirmOrderModalOpen(false); }} onConfirmSendUnpaid={async () => { if (isPrinterConnected) await handlePrintOrder("POR COBRAR"); executeSendToWhatsapp(true); finalizeOrder(false); setConfirmOrderModalOpen(false); }} />
      )}
      {isSalesHistoryModalOpen && <SalesHistoryModal reports={reports} onClose={() => setIsSalesHistoryModalOpen(false)} />}
      {pendingVoidReportId && (
        <AdminAuthModal adminPin={settings.adminPin || '0000'} onClose={() => setPendingVoidReportId(null)} onSuccess={executeVoidReport} />
      )}
    </>
  );
}

export default App;
