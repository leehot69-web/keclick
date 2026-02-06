
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
    theme?: string;
}

const MenuScreen: React.FC<MenuScreenProps> = ({
    menu, cart, cartItemCount = 0, onAddItem, onUpdateQuantity, onRemoveItem,
    onOpenModifierModal, onOpenPizzaBuilder, onGoToCart, onClearCart,
    businessName, businessLogo, triggerShake, table, waiter, onDeselectTable, onOpenBarcodeScanner,
    onInstallApp, showInstallButton, activeRate, isEditing = false, theme = 'keclick'
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

    const isMidnight = theme === 'midnight';

    return (
        <div className={`flex flex-col h-full relative overflow-hidden transition-colors duration-500 ${isMidnight ? 'bg-transparent' : 'bg-black'}`}>
            {isPosMode ? (
                <div className={`flex-shrink-0 p-4 border-b flex justify-between items-center z-30 ${isMidnight ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-[#111] border-white/5'}`}>
                    <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
                        <div>
                            <h2 className={`text-xl font-black leading-none mb-1 text-white`}>
                                {table.orderType === 'para llevar' ? `Pedido #${table.number}` : `Mesa ${table.number}`}
                            </h2>
                            {isEditing && <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Editando</span>}
                        </div>

                        <div className="flex gap-2 items-center">
                            {isEditing && onClearCart && (
                                <button
                                    type="button"
                                    onClick={() => onClearCart()}
                                    className={`bg-white/5 text-white border-white/10 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border active:scale-90 transition-all relative z-50 shadow-sm`}
                                >
                                    Abandonar
                                </button>
                            )}
                            {onDeselectTable && (
                                <button onClick={onDeselectTable} className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg active:opacity-70 bg-white/10 text-white`}>
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`shrink-0 py-3 px-4 flex flex-col z-30 relative border-b ${isMidnight ? 'bg-transparent border-white/10' : 'bg-[#111] border-white/5'}`}>
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center text-xl font-black uppercase tracking-tighter italic">
                                    <span className="text-[#FF0000]">KE</span>
                                    <span className="text-[#FFD700]">CLICK</span>
                                </div>
                                <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                                {isEditing && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Edit</span>}
                            </div>

                            {(cartItemCount > 0 || isEditing) && onClearCart && (
                                <button
                                    type="button"
                                    onClick={() => onClearCart()}
                                    className={`${isEditing ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'} px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border active:scale-90 transition-all flex items-center gap-1.5 relative z-[60] shadow-sm`}
                                >
                                    {isEditing ? 'Salir' : 'Nuevo'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Categorías */}
            <div className={`shrink-0 z-20 ${isMidnight ? 'bg-transparent py-4' : 'bg-[#0a0a0a] shadow-lg py-4 border-b border-white/5'}`}>
                <div className="max-w-7xl mx-auto flex gap-3 px-4 py-1 items-center overflow-x-auto md:overflow-visible flex-nowrap md:flex-wrap md:justify-center scrollbar-hide">
                    {menu.map(cat => (
                        <button
                            key={cat.title}
                            onClick={() => scrollToCategory(cat.title)}
                            className={`flex flex-col items-center flex-shrink-0 md:flex-shrink transition-all transform active:scale-95 ${activeCategory === cat.title ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-70'}`}
                        >
                            <div className={`px-4 py-2 rounded-xl border font-black uppercase tracking-widest text-[9px] transition-all whitespace-nowrap ${activeCategory === cat.title
                                ? 'bg-[#FF0000] border-[#FF0000] text-white shadow-[0_0_15px_rgba(255,0,0,0.3)]'
                                : 'bg-white/5 border-white/10 text-white'
                                }`}>
                                {cat.title}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Listado de Productos */}
            <div className={`flex-grow overflow-y-auto scroll-smooth scrollbar-hide ${!isPosMode ? 'pb-24' : 'pb-4'}`}>
                <div className="max-w-7xl mx-auto p-4 lg:p-8">
                    {menu.map(category => (
                        <div key={category.title} ref={el => { categoryRefs.current[category.title] = el; }} className="mb-12">
                            <h2 className={`text-[11px] font-black uppercase tracking-[0.3em] mb-8 px-4 py-2 inline-block rounded-full ${isMidnight ? 'bg-white/5 text-[#00D2FF] border border-white/10' : 'text-[#FFD700] border-l-4 border-[#FF0000] ml-1 bg-white/5 shadow-sm'}`}>
                                {category.title}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                                {category.items.filter(i => i.available).map((item) => {
                                    const hasModifiers = item.modifierGroupTitles && item.modifierGroupTitles.length > 0;
                                    const isPizzaItem = item.isPizza || item.isSpecialPizza;
                                    const cartItemForSimpleProduct = !hasModifiers && !isPizzaItem ? cart.find(ci => ci.name === item.name && ci.selectedModifiers.length === 0 && !ci.isServed) : null;
                                    const quantityInCart = cartItemForSimpleProduct ? cartItemForSimpleProduct.quantity : 0;

                                    return (
                                        <div key={item.name} className={`relative flex flex-col p-5 group transition-all duration-500 ${isMidnight
                                            ? 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] hover:border-white/30 hover:bg-white/10'
                                            : `bg-[#111] rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-t-2 ${isPizzaItem ? 'border-[#FF0000]' : 'border-[#FFD700]'} hover:-translate-y-2 border-x border-b border-white/5`}`}>

                                            <div className="relative z-10 flex-grow flex flex-col overflow-hidden mb-5">
                                                <h3 className={`text-[12px] md:text-sm font-black leading-[1.2] uppercase line-clamp-2 mb-2 transition-colors ${isMidnight ? 'text-white' : 'text-[#f3f3f3] group-hover:text-[#FFD700]'}`}>{item.name}</h3>
                                                {item.description && (
                                                    <p className={`text-[9px] font-medium leading-tight line-clamp-3 italic opacity-60 ${isMidnight ? 'text-blue-100' : 'text-gray-500'}`}>
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="relative z-10 mt-auto shrink-0 space-y-4">
                                                <div>
                                                    <p className={`text-lg font-black leading-none ${isMidnight ? 'text-[#00D2FF] drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]' : 'text-[#FFD700]'}`}>${item.price.toFixed(2)}</p>
                                                    <p className={`text-[9px] font-bold uppercase mt-1 ${isMidnight ? 'text-white/40' : 'text-gray-600'}`}>Bs. {(item.price * activeRate).toFixed(2)}</p>
                                                </div>

                                                {isPizzaItem && onOpenPizzaBuilder ? (
                                                    <button
                                                        onClick={() => onOpenPizzaBuilder(item)}
                                                        className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all ${isMidnight ? 'bg-[#00D2FF] text-[#0a0a12]' : 'bg-[#FF0000] text-white shadow-[0_4px_15px_rgba(255,0,0,0.2)]'}`}
                                                    >
                                                        {isMidnight ? 'Personalizar' : '🍕 Armar Pizza'}
                                                    </button>
                                                ) : hasModifiers ? (
                                                    <button
                                                        onClick={() => onOpenModifierModal(item)}
                                                        className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all ${isMidnight ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20' : 'bg-white/5 text-white border border-white/10 hover:bg-[#FF0000]'}`}
                                                    >
                                                        Pedir
                                                    </button>
                                                ) : (
                                                    quantityInCart > 0 ? (
                                                        <div className={`flex items-center justify-between rounded-2xl p-1 border ${isMidnight ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5'}`}>
                                                            <button onClick={() => onUpdateQuantity(cartItemForSimpleProduct!.id, quantityInCart - 1)} className={`w-9 h-9 flex items-center justify-center rounded-xl shadow-sm font-black active:scale-90 border text-sm ${isMidnight ? 'bg-white/10 border-white/10 text-white' : 'bg-[#111] text-[#FF0000] border-white/5'}`}>-</button>
                                                            <span className={`font-black text-xs ${isMidnight ? 'text-white' : 'text-white'}`}>{quantityInCart}</span>
                                                            <button onClick={() => onUpdateQuantity(cartItemForSimpleProduct!.id, quantityInCart + 1)} className={`w-9 h-9 flex items-center justify-center rounded-xl shadow-sm font-black active:scale-90 border text-sm ${isMidnight ? 'bg-white/10 border-white/10 text-white' : 'bg-[#111] text-[#FFD700] border-white/5'}`}>+</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => onAddItem(item, [], 1)}
                                                            className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all ${isMidnight ? 'bg-[#00D2FF] text-[#0a0a12]' : 'bg-[#FF0000] text-white'}`}
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
                <div className={`absolute left-0 right-0 flex justify-center px-6 z-40 transition-all ${isMidnight ? 'bottom-8' : 'bottom-6'}`}>
                    <button
                        onClick={onGoToCart}
                        className={`w-full h-16 rounded-[2rem] flex items-center justify-between px-8 transform transition-all active:scale-95 ${isMidnight
                            ? 'max-w-xs bg-[#0a0a12]/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                            : `max-w-lg ${isEditing ? 'bg-green-600 border-green-700' : 'bg-gradient-to-r from-[#00D4AA] to-[#00B894] border-[#009977]'} border-b-4 shadow-2xl`}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isMidnight ? 'text-[#00D2FF]' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <span className={`absolute -top-2 -right-3 ${isMidnight ? 'bg-[#00D2FF] text-[#0a0a12]' : (isEditing ? 'bg-green-800' : 'bg-[#051a12]') + ' text-white border-white'} font-black w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg border-2`}>{cartItemCount}</span>
                            </div>
                            <span className={`font-black uppercase tracking-widest text-[10px] ${isMidnight ? 'text-white' : 'text-white'}`}>
                                {isEditing ? 'Ir a Pago' : 'Carrito'}
                            </span>
                        </div>
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isMidnight ? 'bg-white/10' : 'bg-black/10'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default MenuScreen;
