
import React, { useState, useRef } from 'react';
import { MenuCategory, MenuItem, Table, CartItem, SelectedModifier } from '../types';

interface MenuScreenProps {
    menu: MenuCategory[];
    onAddItem: (item: MenuItem, selectedModifiers: SelectedModifier[], quantity: number) => void;
    onUpdateQuantity: (id: string, qty: number) => void;
    onRemoveItem: (id: string) => void;
    cart: CartItem[];
    onOpenModifierModal: (item: MenuItem) => void;
    onOpenPizzaBuilder?: (item: MenuItem) => void;
    onGoToCart: () => void;
    onClearCart?: () => void;
    cartItemCount?: number;
    businessName?: string;
    businessLogo?: string;
    triggerShake?: boolean;
    onInstallApp?: () => void;
    showInstallButton?: boolean;
    table?: Table | null;
    waiter?: string;
    onDeselectTable?: () => void;
    onOpenBarcodeScanner?: () => void;
    activeRate: number;
    isEditing?: boolean;
}

const MenuScreen: React.FC<MenuScreenProps> = ({
    menu, cart, cartItemCount = 0, onAddItem, onUpdateQuantity, onRemoveItem,
    onOpenModifierModal, onOpenPizzaBuilder, onGoToCart, onClearCart,
    businessName, businessLogo, triggerShake, table, waiter, onDeselectTable, onOpenBarcodeScanner,
    onInstallApp, showInstallButton, activeRate, isEditing = false
}) => {
    const [activeCategory, setActiveCategory] = useState<string | null>(menu[0]?.title || null);
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const scrollToCategory = (title: string) => {
        setActiveCategory(title);
        const element = categoryRefs.current[title];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const isPosMode = table !== undefined && table !== null;

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-[#051a12] to-[#0a3d2c] relative overflow-hidden">
            {isPosMode ? (
                <div className="flex-shrink-0 p-4 bg-white border-b border-gray-100 flex justify-between items-center z-30">
                    <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-gray-800 leading-none mb-1">
                                {table.orderType === 'para llevar' ? `Pedido #${table.number}` : `Mesa ${table.number}`}
                            </h2>
                            {isEditing && <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Editando</span>}
                        </div>

                        <div className="flex gap-2 items-center">
                            {isEditing && onClearCart && (
                                <button
                                    type="button"
                                    onClick={() => onClearCart()}
                                    onTouchEnd={(e) => { e.preventDefault(); onClearCart(); }}
                                    className="bg-amber-50 text-amber-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200 active:scale-90 transition-all relative z-50 shadow-sm"
                                >
                                    Abandonar
                                </button>
                            )}
                            {onDeselectTable && (
                                <button onClick={onDeselectTable} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-lg active:bg-gray-200">
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="shrink-0 bg-white py-2 px-4 flex flex-col z-30 relative border-b border-gray-100">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {businessLogo && (
                                    <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 p-0.5 overflow-hidden">
                                        <img src={businessLogo} alt="Logo" className="w-full h-full object-contain" />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <h1 className="text-base font-black text-gray-800 tracking-tight leading-none uppercase">
                                        {businessName}
                                    </h1>
                                    {isEditing && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Editando Cuenta</span>}
                                </div>
                            </div>

                            {/* BOTÓN NUEVO PEDIDO / ABANDONAR */}
                            {(cartItemCount > 0 || isEditing) && onClearCart && (
                                <button
                                    type="button"
                                    onClick={() => onClearCart()}
                                    onTouchEnd={(e) => { e.preventDefault(); onClearCart(); }}
                                    className={`${isEditing ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'} px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border active:scale-90 transition-all flex items-center gap-1.5 relative z-[60] shadow-sm`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    {isEditing ? 'Abandonar' : 'Nuevo'}
                                </button>
                            )}
                        </div>

                        {showInstallButton && onInstallApp && (
                            <div className="mt-2 p-2.5 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl flex items-center justify-between shadow-xl animate-pulse-slow border border-gray-700 max-w-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-inner p-1">
                                        <img src={businessLogo} alt="App Icon" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-white">
                                        <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-0.5">Versión App Disponible</p>
                                        <p className="text-[9px] font-medium text-gray-400">Instala para uso offline</p>
                                    </div>
                                </div>
                                <button onClick={onInstallApp} className="bg-[#00D4AA] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg">Instalar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Categorías */}
            <div className="shrink-0 bg-[#041510] shadow-lg z-20">
                <div className="max-w-7xl mx-auto flex overflow-x-auto py-4 px-4 gap-3 scrollbar-hide md:justify-center">
                    {menu.map(cat => (
                        <button
                            key={cat.title}
                            onClick={() => scrollToCategory(cat.title)}
                            className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat.title
                                ? 'bg-[#00D4AA] text-white shadow-[0_8px_20px_rgba(0,212,170,0.3)] scale-105'
                                : 'bg-white/10 text-white/60 border border-white/5'
                                }`}
                        >
                            {cat.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Listado de Productos */}
            <div className={`flex-grow overflow-y-auto scroll-smooth scrollbar-hide ${!isPosMode ? 'pb-24' : 'pb-4'}`}>
                <div className="max-w-7xl mx-auto p-4 lg:p-8">
                    {menu.map(category => (
                        <div key={category.title} ref={el => { categoryRefs.current[category.title] = el; }} className="mb-12">
                            <h2 className="text-[11px] font-black text-[#00D4AA] uppercase tracking-[0.3em] mb-6 px-1 border-l-4 border-[#FFD700] pl-3">{category.title}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                                {category.items.filter(i => i.available).map((item) => {
                                    const hasModifiers = item.modifierGroupTitles && item.modifierGroupTitles.length > 0;
                                    const isPizzaItem = item.isPizza || item.isSpecialPizza;
                                    const cartItemForSimpleProduct = !hasModifiers && !isPizzaItem ? cart.find(ci => ci.name === item.name && ci.selectedModifiers.length === 0) : null;
                                    const quantityInCart = cartItemForSimpleProduct ? cartItemForSimpleProduct.quantity : 0;

                                    return (
                                        <div key={item.name} className={`bg-white rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex flex-col p-4 border-t-4 ${isPizzaItem ? 'border-[#FF6B35]' : 'border-[#FFD700]'} min-h-[180px] justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_45_rgba(0,212,170,0.25)] group`}>
                                            <div className="flex-grow flex flex-col overflow-hidden mb-4">
                                                <h3 className={`text-[11px] md:text-xs font-black text-gray-900 leading-[1.2] uppercase line-clamp-2 mb-1 ${isPizzaItem ? 'group-hover:text-[#FF6B35]' : 'group-hover:text-[#00D4AA]'} transition-colors`}>{item.name}</h3>
                                                {item.description && (
                                                    <p className="text-[9px] text-gray-400 font-medium leading-tight line-clamp-2 italic opacity-80">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-auto shrink-0">
                                                <div className="mb-3">
                                                    <p className="text-base font-black text-gray-900 leading-none">${item.price.toFixed(2)}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Bs. {(item.price * activeRate).toFixed(2)}</p>
                                                </div>

                                                {isPizzaItem && onOpenPizzaBuilder ? (
                                                    <button
                                                        onClick={() => onOpenPizzaBuilder(item)}
                                                        className="w-full bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all hover:shadow-lg"
                                                    >
                                                        🍕 {item.isPizza ? 'Armar Pizza' : 'Personalizar'}
                                                    </button>
                                                ) : hasModifiers ? (
                                                    <button
                                                        onClick={() => onOpenModifierModal(item)}
                                                        className="w-full bg-[#0a3d2c] text-white py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all hover:bg-[#00D4AA]"
                                                    >
                                                        Pedir
                                                    </button>
                                                ) : (
                                                    quantityInCart > 0 ? (
                                                        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-1 border border-gray-100">
                                                            <button onClick={() => onUpdateQuantity(cartItemForSimpleProduct!.id, quantityInCart - 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-red-600 font-black active:bg-gray-100 border text-sm">-</button>
                                                            <span className="font-black text-gray-800 text-xs">{quantityInCart}</span>
                                                            <button onClick={() => onUpdateQuantity(cartItemForSimpleProduct!.id, quantityInCart + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-green-600 font-black active:bg-gray-100 border text-sm">+</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => onAddItem(item, [], 1)}
                                                            className="w-full bg-[#0a3d2c] text-white py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all hover:bg-[#00D4AA]"
                                                        >
                                                            Agregar
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {!isPosMode && cartItemCount > 0 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 z-40">
                    <button
                        onClick={onGoToCart}
                        className={`w-full max-w-lg h-16 ${isEditing ? 'bg-green-600 border-green-700' : 'bg-gradient-to-r from-[#00D4AA] to-[#00B894] border-[#009977]'} rounded-2xl flex items-center justify-between px-7 shadow-2xl shadow-black/40 transform transition-all active:scale-95 border-b-4 ${triggerShake ? 'shake-animation' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <span className={`absolute -top-1.5 -right-2 ${isEditing ? 'bg-green-800' : 'bg-[#051a12]'} text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg border-2 border-white`}>{cartItemCount}</span>
                            </div>
                            <span className="text-white font-black uppercase tracking-widest text-xs">
                                {isEditing ? 'Ir a Cobrar Cuenta' : 'Ver Mi Carrito'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default MenuScreen;
