
import React, { useState, useEffect } from 'react';
import { AppSettings, StoreProfile, ThemeName, MenuCategory, MenuItem, ModifierGroup, PizzaIngredient, User, UserRole, KitchenStation } from '../types';
import MenuManagementModal from './MenuManagementModal';
import PriceIncreaseModal from './PriceIncreaseModal';
import UserManagementModal from './UserManagementModal';
import KitchenStationManagementModal from './KitchenStationManagementModal';

interface SettingsScreenProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onGoToTables: () => void;
  waiter: string;
  onLogout: () => void;
  waiterAssignments: any;
  onSaveAssignments: any;
  storeProfiles: StoreProfile[];
  onUpdateStoreProfiles: (profiles: StoreProfile[] | ((current: StoreProfile[]) => StoreProfile[])) => void;
  activeTableNumbers: number[];
  onBackupAllSalesData: () => void;
  onClearAllSalesData: () => void;
  onConnectPrinter: () => void;
  onDisconnectPrinter: () => void;
  isPrinterConnected: boolean;
  printerName?: string;
  onPrintTest: () => void;
  pizzaIngredients: PizzaIngredient[];
  pizzaBasePrices: Record<string, number>;
  onUpdatePizzaConfig: (ingredients: PizzaIngredient[], basePrices: Record<string, number>) => void;
  onResetApp?: () => void;
}

const StoreProfileEditor: React.FC<{
  profile: StoreProfile;
  onUpdate: (updatedProfile: StoreProfile) => void;
  onPermanentSave: (updatedProfile: StoreProfile) => void;
  onOpenPriceIncreaseModal: (profile: StoreProfile) => void;
  pizzaIngredients: PizzaIngredient[];
  pizzaBasePrices: Record<string, number>;
  onUpdatePizzaConfig: (ingredients: PizzaIngredient[], basePrices: Record<string, number>) => void;
  kitchenStations: KitchenStation[];
}> = ({ profile, onUpdate, onPermanentSave, onOpenPriceIncreaseModal, pizzaIngredients, pizzaBasePrices, onUpdatePizzaConfig, kitchenStations = [] }) => {
  const [isMenuModalOpen, setMenuModalOpen] = useState(false);
  const themes: { name: ThemeName, label: string }[] = [
    { name: 'keclick', label: 'Keclick' },
    { name: 'manga', label: 'Manga' },
    { name: 'red', label: 'Rojo' },
    { name: 'blue', label: 'Azul' },
    { name: 'dark', label: 'Oscuro' }
  ];

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-16 h-16 bg-[#111] rounded-2xl border border-white/10 overflow-hidden p-2 flex items-center justify-center">
          {profile.logo ? <img src={profile.logo} alt="logo" className="w-full h-full object-contain" /> : <div className="text-white font-black">LOGO</div>}
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Marca Keclick</h3>
          <p className="text-[10px] text-gray-400 uppercase font-black">Personaliza tu App</p>
        </div>
      </div>

      <div className="space-y-3 font-sans">
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Nombre Comercial</label>
          <input type="text" value={profile.name} onChange={(e) => onUpdate({ ...profile, name: e.target.value })} className="w-full p-3 bg-white border border-gray-100 rounded-xl font-bold text-black focus:border-[#FF0000] outline-none" placeholder="Ej: Pizza House" />
        </div>

        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Logo del Negocio (Subir Imagen)</label>
          <div className="flex gap-2">
            <label className="w-full flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-gray-100 rounded-2xl cursor-pointer hover:border-[#FF0000] hover:bg-red-50/30 transition-all group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1 text-gray-300 group-hover:text-[#FF0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-[10px] font-black text-gray-400 group-hover:text-[#FF0000] uppercase tracking-tighter">Seleccionar Foto</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      onUpdate({ ...profile, logo: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMenuModalOpen(true)} className="py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all">Gestionar Menú</button>
        <button onClick={() => onOpenPriceIncreaseModal(profile)} className="py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all">Precios %</button>
      </div>

      <div className="pt-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Tema Visual</label>
        <div className="flex gap-2">
          {themes.map(t => (
            <button key={t.name} onClick={() => onUpdate({ ...profile, theme: t.name })} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${profile.theme === t.name ? 'border-[#FF0000] bg-red-50 text-[#FF0000]' : 'border-gray-100 bg-white text-gray-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isMenuModalOpen && (
        <MenuManagementModal
          menu={profile.menu}
          modifierGroups={profile.modifierGroups}
          kitchenStations={kitchenStations}
          onSave={(newMenu, newGroups) => {
            const updated = { ...profile, menu: newMenu, modifierGroups: newGroups };
            onPermanentSave(updated); // Guardar inmediatamente en el padre
          }}
          onClose={() => setMenuModalOpen(false)}
          pizzaIngredients={pizzaIngredients}
          pizzaBasePrices={pizzaBasePrices}
          onUpdatePizzaConfig={onUpdatePizzaConfig}
        />
      )}
    </div>
  );
};

const SettingsScreen: React.FC<SettingsScreenProps> = (props) => {
  const {
    settings, onSaveSettings, onGoToTables, waiter, onLogout,
    storeProfiles, onUpdateStoreProfiles, onClearAllSalesData,
    isPrinterConnected, printerName, onConnectPrinter, onDisconnectPrinter, onPrintTest,
    pizzaIngredients, pizzaBasePrices, onUpdatePizzaConfig, onResetApp
  } = props;

  const [localSettings, setLocalSettings] = useState(settings);
  const [localStoreProfiles, setLocalStoreProfiles] = useState(storeProfiles);

  const [priceIncreaseModalStore, setPriceIncreaseModalStore] = useState<StoreProfile | null>(null);
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [isStationModalOpen, setStationModalOpen] = useState(false);

  // isDirty calculado en tiempo real
  const isDirty = React.useMemo(() => {
    return JSON.stringify(localSettings) !== JSON.stringify(settings) ||
      JSON.stringify(localStoreProfiles) !== JSON.stringify(storeProfiles);
  }, [localSettings, localStoreProfiles, settings, storeProfiles]);

  // RE-SINCRONIZACIÓN: Si las props cambian (porque se guardó o cargó de DB) 
  // y no estamos editando algo nuevo, actualizamos el estado local.
  useEffect(() => {
    if (!isDirty) {
      setLocalSettings(settings);
      setLocalStoreProfiles(storeProfiles);
    }
  }, [settings, storeProfiles, isDirty]);

  const handleSave = () => {
    const mainProfile = localStoreProfiles.find(p => p.id === 'main');
    const finalSettings = {
      ...localSettings,
      targetNumber: mainProfile ? mainProfile.whatsappNumber : localSettings.targetNumber
    };

    onSaveSettings(finalSettings);
    onUpdateStoreProfiles(localStoreProfiles);
    alert("✅ Configuración guardada correctamente.");
  };

  const handleProfileUpdate = (updatedProfile: StoreProfile) => {
    setLocalStoreProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
    if (updatedProfile.id === 'main') {
      setLocalSettings(prev => ({ ...prev, targetNumber: updatedProfile.whatsappNumber }));
    }
  };

  const handlePermanentProfileUpdate = (updatedProfile: StoreProfile) => {
    setLocalStoreProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
    if (updatedProfile.id === 'main') {
      const newSettings = { ...localSettings, targetNumber: updatedProfile.whatsappNumber };
      setLocalSettings(newSettings);
      onSaveSettings(newSettings);
    }
    props.onUpdateStoreProfiles([updatedProfile]);
  };

  const handleTestWhatsApp = () => {
    const num = localSettings.targetNumber.replace(/\D/g, '');
    if (!num) { alert("Ingresa un número primero"); return; }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent('Prueba de conexión desde Keclick 🚀')}`, '_blank');
  };

  const handlePriceIncrease = (percentage: number, categoryTitle: string) => {
    if (!priceIncreaseModalStore) return;
    const updatedProfiles = JSON.parse(JSON.stringify(localStoreProfiles));
    const profileToUpdate = updatedProfiles.find((p: StoreProfile) => p.id === priceIncreaseModalStore.id);
    if (profileToUpdate) {
      profileToUpdate.menu.forEach((cat: MenuCategory) => {
        if (categoryTitle === "TODAS LAS CATEGORÍAS" || cat.title === categoryTitle) {
          cat.items.forEach((item: MenuItem) => {
            item.price = parseFloat((item.price * (1 + percentage / 100)).toFixed(2));
          });
        }
      });
      setLocalStoreProfiles(updatedProfiles);
    }
    setPriceIncreaseModalStore(null);
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col bg-white">
      <header className="p-4 flex items-center justify-between border-b">
        <button onClick={onGoToTables} className="p-2 bg-gray-100 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Ajustes</h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Sesión Activa</p>
            <p className="text-lg font-black text-red-800">{waiter}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-3 bg-white text-red-600 rounded-xl border border-red-100 shadow-sm active:scale-95 transition-all"
            title="Cerrar Sesión"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {localStoreProfiles.map(profile => (
          <StoreProfileEditor
            key={profile.id}
            profile={profile}
            onUpdate={handleProfileUpdate}
            onPermanentSave={handlePermanentProfileUpdate}
            onOpenPriceIncreaseModal={setPriceIncreaseModalStore}
            pizzaIngredients={pizzaIngredients}
            pizzaBasePrices={pizzaBasePrices}
            onUpdatePizzaConfig={onUpdatePizzaConfig}
            kitchenStations={localSettings.kitchenStations || []}
          />
        ))}
        <div className="bg-[#111] p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest">Estado del Servicio</h3>
            <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${settings.isLicenseActive ? 'bg-green-500/10 text-green-500' : 'bg-[#FF0000]/10 text-[#FF0000]'}`}>
              {settings.isLicenseActive ? 'Licencia Activa ✅' : 'Periodo de Prueba'}
            </span>
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Registrado como:</p>
            <p className="text-lg font-black text-white italic tracking-tighter uppercase">{settings.businessName}</p>
          </div>

          {!settings.isLicenseActive && (
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] text-gray-400 leading-tight">
                Días de cortesía restantes: <br />
                <span className="text-white font-bold">Vence el {settings.trialStartDate ? new Date(new Date(settings.trialStartDate).getTime() + (5 * 24 * 60 * 60 * 1000)).toLocaleDateString() : 'próximamente'}</span>
              </p>
            </div>
          )}


          <div className="bg-black/40 p-3 rounded-xl border border-white/5 mt-2">
            <p className="text-[7px] text-gray-500 leading-tight uppercase font-bold text-center">
              Este sistema opera bajo licencia de uso de plataforma.<br />
              El volumen de ventas se sincroniza con la central para la facturación del servicio técnico y mantenimiento.
            </p>
          </div>

          <div className="flex justify-between items-center opacity-30 pt-2">
            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Ref: {settings.storeId}</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 px-1 uppercase text-xs tracking-widest">Hardware de Impresión</h3>

          {/* Card de Impresión USB/Cable (PC) */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-blue-800 uppercase text-[10px]">Modo Sistema (Cable):</span>
              <span className="font-black px-2 py-0.5 rounded-full text-[10px] uppercase bg-blue-100 text-blue-700">
                LISTO / ACTIVO
              </span>
            </div>
            <p className="text-[9px] text-blue-500 font-medium leading-tight">
              Si usas una impresora con cable USB en tu PC, el sistema usará el diálogo de impresión de Windows automáticamente.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-gray-600 uppercase text-[10px]">Bluetooth (Solo Teléfonos):</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${isPrinterConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isPrinterConnected ? `Conectada: ${printerName}` : 'No conectada'}
              </span>
            </div>
            {isPrinterConnected ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={onPrintTest} className="py-2.5 bg-blue-500 text-white rounded-lg font-bold text-xs uppercase">Prueba BT</button>
                <button onClick={onDisconnectPrinter} className="py-2.5 bg-gray-600 text-white rounded-lg font-bold text-xs uppercase">Desconectar</button>
              </div>
            ) : (
              <button onClick={onConnectPrinter} className="w-full py-3.5 bg-gray-800 text-white rounded-lg font-bold text-xs uppercase">Buscar Impresora BT</button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 px-1 uppercase text-xs tracking-widest">Finanzas y Staff</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-xl border">
              <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Tasa Paralelo</label>
              <input type="number" value={localSettings.exchangeRateParallel} onChange={(e) => setLocalSettings({ ...localSettings, exchangeRateParallel: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent font-bold text-black outline-none" />
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border">
              <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">Tasa BCV</label>
              <input type="number" value={localSettings.exchangeRateBCV} onChange={(e) => setLocalSettings({ ...localSettings, exchangeRateBCV: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent font-bold text-black outline-none" />
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border">
            <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">WhatsApp de Pedidos (Cocina)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={localSettings.targetNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setLocalSettings({ ...localSettings, targetNumber: val });
                  setLocalStoreProfiles(prev => prev.map(p => p.id === 'main' ? { ...p, whatsappNumber: val } : p));
                }}
                className="flex-grow bg-transparent font-bold text-black outline-none"
                placeholder="Ej: 584120000000"
              />
              <button
                onClick={handleTestWhatsApp}
                className="px-3 py-1 bg-green-500 text-white text-[9px] font-black rounded-lg shadow-sm active:scale-95"
              >
                PROBAR
              </button>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-gray-800 text-[10px] uppercase">WhatsApp a Cocina</span>
              <span className="text-[9px] text-gray-500 font-medium">Auto-enviar pedido al WhatsApp</span>
            </div>
            <button
              onClick={() => setLocalSettings({ ...localSettings, isWhatsAppEnabled: !localSettings.isWhatsAppEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.isWhatsAppEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.isWhatsAppEnabled ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-gray-800 text-[10px] uppercase">Meseros pueden cobrar</span>
              <span className="text-[9px] text-gray-500 font-medium">Permite a meseros finalizar ventas</span>
            </div>
            <button
              onClick={() => setLocalSettings({ ...localSettings, waitersCanCharge: !localSettings.waitersCanCharge })}
              className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.waitersCanCharge ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.waitersCanCharge ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          <button onClick={() => setUserModalOpen(true)} className="w-full py-4 text-blue-600 font-bold bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center gap-2 uppercase text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Gestionar Usuarios
          </button>

          {onResetApp && (
            <button
              onClick={onResetApp}
              className="w-full py-4 text-white font-black bg-red-600 rounded-2xl shadow-lg uppercase text-[10px] tracking-widest active:scale-95 transition-all"
            >
              🚀 CAMBIAR DE NEGOCIO (DESCONECTAR)
            </button>
          )}

          <button onClick={() => setStationModalOpen(true)} className="w-full py-4 text-emerald-600 font-bold bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center gap-2 uppercase text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Estaciones de Cocina
          </button>

          {/* Acceso a KeMaster para Administradores */}
          <button
            onClick={() => window.open('/kemaster.html', '_blank')}
            className="w-full py-4 text-amber-700 font-bold bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center gap-2 uppercase text-[10px] tracking-[0.2em] shadow-sm active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Abrir KeMaster (Panel General)
          </button>

          <div className="pt-4 mt-4 border-t border-gray-100 italic text-[10px] text-gray-400 text-center uppercase tracking-widest pb-4">
            Keclick Software v2.0
          </div>
        </div>

        {/* BOTÓN DE GUARDAR: AHORA DENTRO DEL SCROLL PARA QUE NO TAPE NADA */}
        <div className="pt-6 pb-20">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`w-full py-5 font-black rounded-3xl shadow-2xl uppercase tracking-[0.2em] transition-all transform active:scale-95 ${isDirty
              ? 'bg-[#FF0000] text-white shadow-red-500/20'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              }`}
          >
            {isDirty ? '✓ Guardar Cambios' : 'Sin Cambios'}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-6 uppercase font-bold tracking-widest opacity-30">
            ID de Tienda: {settings.storeId}
          </p>
        </div>
      </div>

      {priceIncreaseModalStore && (
        <PriceIncreaseModal
          storeProfile={priceIncreaseModalStore}
          onClose={() => setPriceIncreaseModalStore(null)}
          onConfirm={handlePriceIncrease}
        />
      )}

      {isUserModalOpen && (
        <UserManagementModal
          users={localSettings.users}
          kitchenStations={localSettings.kitchenStations || []}
          onSave={(updatedUsers) => {
            setLocalSettings(prev => ({ ...prev, users: updatedUsers }));
            setUserModalOpen(false);
          }}
          onClose={() => setUserModalOpen(false)}
        />
      )}

      {isStationModalOpen && (
        <KitchenStationManagementModal
          stations={localSettings.kitchenStations}
          onSave={(updatedStations) => {
            setLocalSettings(prev => ({ ...prev, kitchenStations: updatedStations }));
            setStationModalOpen(false);
          }}
          onClose={() => setStationModalOpen(false)}
        />
      )}
    </div>
  );
};

export default SettingsScreen;
