
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

    const isBrutalist = theme === 'brutalist';
    const isMidnight = theme === 'midnight';

    return (
        <div className={`flex flex-col h-full relative overflow-hidden transition-colors duration-500 ${isMidnight ? 'bg-transparent' : (isBrutalist ? 'bg-[#121212]' : 'bg-black')}`}>
            {/* Background Glows for Brutalist (fixed positions) */}
            {isBrutalist && (
                <>
                    <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-crimson/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                    <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                </>
            )}

            {isPosMode ? (
                <div className={`flex-shrink-0 p-4 border-b flex justify-between items-center z-30 ${isMidnight ? 'bg-white/5 backdrop-blur-xl border-white/10' : (isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border-white/5' : 'bg-[#111] border-white/5')}`}>
                    <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
                        <div>
                            <h2 className={`text-xl font-bold leading-none mb-1 text-white ${isBrutalist ? 'tracking-tight' : 'font-black'}`}>
                                {table.orderType === 'para llevar' ? `Pedido #${table.number}` : `Mesa ${table.number}`}
                            </h2>
                            {isEditing && <span className={`text-[10px] uppercase tracking-widest ${isBrutalist ? 'text-amber-400 font-semibold' : 'text-amber-500 font-black'}`}>Editando</span>}
                        </div>

                        <div className="flex gap-2 items-center">
                            {isEditing && onClearCart && (
                                <button
                                    type="button"
                                    onClick={() => onClearCart()}
                                    className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest border active:scale-90 transition-all z-50 shadow-sm ${isBrutalist ? 'bg-white/5 border-white/10 text-white/70 font-semibold' : 'bg-white/5 text-white border-white/10 font-black'}`}
                                >
                                    Abandonar
                                </button>
                            )}
                            {onDeselectTable && (
                                <button onClick={onDeselectTable} className={`px-4 py-2 text-xs uppercase tracking-widest rounded-xl active:opacity-70 transition-all ${isBrutalist ? 'bg-white/10 text-white font-semibold border border-white/10' : 'bg-white/10 text-white font-black'}`}>
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`shrink-0 py-3 px-4 flex flex-col z-30 relative border-b ${isMidnight ? 'bg-transparent border-white/10' : (isBrutalist ? 'bg-white/[0.02] backdrop-blur-md border-white/5' : 'bg-[#111] border-white/5')}`}>
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center text-xl uppercase tracking-tighter italic">
                                    <span className="text-[#FF0000] font-black">KE</span>
                                    <span className={`font-black ${isBrutalist ? 'text-[#FFD700]' : 'text-[#FFD700]'}`}>CLICK</span>
                                </div>
                                <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                                {isEditing && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Edit</span>}
                            </div>

                            {(cartItemCount > 0 || isEditing) && onClearCart && (
                                <button
                                    type="button"
                                    onClick={() => onClearCart()}
                                    className={`px-5 py-2 rounded-full text-[10px] uppercase tracking-widest border active:scale-90 transition-all flex items-center gap-1.5 z-[60] shadow-sm ${isEditing ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'} ${isBrutalist ? 'font-semibold' : 'font-black'}`}
                                >
                                    {isEditing ? 'Salir' : 'Nuevo'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Categorías */}
            <div className={`shrink-0 z-20 ${isMidnight ? 'bg-transparent py-4' : (isBrutalist ? 'bg-white/[0.01] backdrop-blur-sm py-4 border-b border-white/5' : 'bg-[#0a0a0a] shadow-lg py-4 border-b border-white/5')}`}>
                <div className="max-w-7xl mx-auto flex gap-3 px-4 py-1 items-center overflow-x-auto md:overflow-visible flex-nowrap md:flex-wrap md:justify-center scrollbar-hide">
                    {menu.map(cat => (
                        <button
                            key={cat.title}
                            onClick={() => scrollToCategory(cat.title)}
                            className={`flex flex-col items-center flex-shrink-0 md:flex-shrink transition-all transform active:scale-95 ${activeCategory === cat.title ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-70'}`}
                        >
                            <div className={`px-5 py-2.5 rounded-2xl border transition-all whitespace-nowrap ${activeCategory === cat.title
                                ? (isBrutalist ? 'bg-gradient-to-br from-[#FFBF00] to-[#FFD700] border-transparent text-black font-bold shadow-[0_0_15px_rgba(255,191,0,0.3)]' : 'bg-[#FF0000] border-[#FF0000] text-white shadow-[0_0_15px_rgba(255,0,0,0.3)] font-black')
                                : 'bg-white/5 border-white/10 text-white font-semibold'
                                } uppercase tracking-widest text-[9px]`}>
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
                        <div key={category.title} ref={el => { categoryRefs.current[category.title] = el; }} className="mb-14">
                            <div className="flex items-center gap-4 mb-8">
                                <h2 className={`text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-xl ${isMidnight
                                    ? 'bg-white/5 text-[#00D2FF] border border-white/10'
                                    : (isBrutalist ? 'bg-white/[0.05] text-white border border-white/10' : 'text-[#FFD700] border-l-4 border-[#FF0000] ml-1 bg-white/5 shadow-sm')
                                    }`}>
                                    {category.title}
                                </h2>
                                {isBrutalist && <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent"></div>}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                                {category.items.filter(i => i.available).map((item) => {
                                    const hasModifiers = item.modifierGroupTitles && item.modifierGroupTitles.length > 0;
                                    const isPizzaItem = item.isPizza || item.isSpecialPizza;
                                    const cartItemForSimpleProduct = !hasModifiers && !isPizzaItem ? cart.find(ci => ci.name === item.name && ci.selectedModifiers.length === 0 && !ci.isServed && ci.notes !== 'original') : null;
                                    const quantityInCart = cartItemForSimpleProduct ? cartItemForSimpleProduct.quantity : 0;

                                    return (
                                        <div key={item.name} className={`relative flex flex-col p-6 group transition-all duration-500 overflow-hidden ${isMidnight
                                            ? 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] hover:border-white/30 hover:bg-white/10'
                                            : (isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-[2rem] hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-1 shadow-2xl shadow-black/20' : `bg-[#111] rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-t-2 ${isPizzaItem ? 'border-[#FF0000]' : 'border-[#FFD700]'} hover:-translate-y-2 border-x border-b border-white/5`)
                                            }`}>

                                            {isBrutalist && <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#DC143C] animate-pulse"></div>
                                            </div>}

                                            <div className="relative z-10 flex-grow flex flex-col mb-5">
                                                <h3 className={`text-[12px] md:text-[13px] leading-[1.3] uppercase line-clamp-2 mb-2 transition-colors ${isMidnight ? 'text-white font-black' : (isBrutalist ? 'text-white/90 font-semibold tracking-tight' : 'text-[#f3f3f3] font-black group-hover:text-[#FFD700]')}`}>{item.name}</h3>
                                                {item.description && (
                                                    <p className={`text-[9px] font-normal leading-relaxed line-clamp-3 opacity-40 ${isMidnight ? 'text-blue-100 italic' : (isBrutalist ? 'text-white' : 'text-zinc-500 italic')}`}>
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="relative z-10 mt-auto shrink-0 space-y-5">
                                                <div>
                                                    <div className="flex items-baseline gap-0.5">
                                                        <span className={`text-[10px] opacity-40 ${isBrutalist ? 'font-light' : 'font-black'}`}>$</span>
                                                        <p className={`text-xl leading-none ${isMidnight ? 'text-[#00D2FF] drop-shadow-[0_0_8px_rgba(0,210,255,0.4)] font-black' : (isBrutalist ? 'text-white font-light tracking-tighter' : 'text-[#FFD700] font-black')}`}>
                                                            {isBrutalist ? (
                                                                <>
                                                                    <span className="font-semibold">{Math.floor(item.price)}</span>
                                                                    <span className="text-sm opacity-30">.{((item.price % 1) * 100).toFixed(0).padStart(2, '0')}</span>
                                                                </>
                                                            ) : item.price.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <p className={`text-[8px] uppercase mt-1 tracking-widest ${isMidnight ? 'text-white/40 font-bold' : (isBrutalist ? 'text-white/20 font-medium' : 'text-gray-600 font-bold')}`}>Bs. {(item.price * activeRate).toFixed(2)}</p>
                                                </div>

                                                {isPizzaItem && onOpenPizzaBuilder ? (
                                                    <button
                                                        onClick={() => onOpenPizzaBuilder(item)}
                                                        className={`w-full py-3.5 rounded-2xl text-[9px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all ${isMidnight ? 'bg-[#00D2FF] text-[#0a0a12] font-black' : (isBrutalist ? 'bg-gradient-to-br from-[#DC143C] to-[#FF2400] text-white font-bold shadow-crimson/20' : 'bg-[#FF0000] text-white shadow-[0_4px_15px_rgba(255,0,0,0.2)] font-black')}`}
                                                    >
                                                        {isMidnight ? 'Personalizar' : '🍕 Armar Pizza'}
                                                    </button>
                                                ) : hasModifiers ? (
                                                    <button
                                                        onClick={() => onOpenModifierModal(item)}
                                                        className={`w-full py-3.5 rounded-2xl text-[9px] uppercase tracking-[0.2em] transition-all active:scale-95 ${isMidnight ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20 font-black' : (isBrutalist ? 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 font-bold' : 'bg-white/5 text-white border border-white/10 hover:bg-[#FF0000] font-black')}`}
                                                    >
                                                        Personalizar
                                                    </button>
                                                ) : (
                                                    quantityInCart > 0 ? (
                                                        <div className={`flex items-center justify-between rounded-2xl p-1 border ${isMidnight ? 'bg-white/5 border-white/10' : (isBrutalist ? 'bg-white/[0.03] border-white/10 shadow-inner' : 'bg-black/20 border-white/5')}`}>
                                                            <button onClick={() => onUpdateQuantity(cartItemForSimpleProduct!.id, quantityInCart - 1)} className={`w-9 h-9 flex items-center justify-center rounded-xl shadow-sm active:scale-90 border text-sm transition-all ${isMidnight ? 'bg-white/10 border-white/10 text-white font-black' : (isBrutalist ? 'bg-white/5 border-white/5 text-white/40 hover:text-white font-light' : 'bg-[#111] text-[#FF0000] border-white/5 font-black')}`}>
                                                                <span className="material-symbols-outlined text-sm">remove</span>
                                                            </button>
                                                            <span className={`text-xs text-white ${isBrutalist ? 'font-light' : 'font-black'}`}>{quantityInCart}</span>
                                                            <button onClick={() => onUpdateQuantity(cartItemForSimpleProduct!.id, quantityInCart + 1)} className={`w-9 h-9 flex items-center justify-center rounded-xl shadow-sm active:scale-90 border text-sm transition-all ${isMidnight ? 'bg-white/10 border-white/10 text-white font-black' : (isBrutalist ? 'bg-gradient-to-br from-[#FFBF00] to-[#FFD700] border-transparent text-black font-bold' : 'bg-[#111] text-[#FFD700] border-white/5 font-black')}`}>
                                                                <span className="material-symbols-outlined text-sm">add</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => onAddItem(item, [], 1)}
                                                            className={`w-full py-3.5 rounded-2xl text-[9px] uppercase tracking-[0.2em] shadow-md active:scale-95 transition-all ${isMidnight ? 'bg-[#00D2FF] text-[#0a0a12] font-black' : (isBrutalist ? 'bg-gradient-to-br from-[#DC143C] to-[#FF2400] text-white font-bold shadow-crimson/20' : 'bg-[#FF0000] text-white font-black')}`}
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
                        className={`w-full max-w-lg h-20 rounded-[2.5rem] flex items-center justify-between px-10 transform transition-all active:scale-95 shadow-2xl ${isMidnight
                            ? 'bg-[#0a0a12]/80 backdrop-blur-2xl border border-white/20'
                            : (isBrutalist ? 'bg-gradient-to-br from-[#DC143C] to-[#FF2400] text-white shadow-crimson/30' : `bg-gradient-to-r ${isEditing ? 'from-green-600 to-green-700' : 'from-[#00D4AA] to-[#00B894]'} border-b-4 border-black/20 text-white`)}`}
                    >
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <span className="material-symbols-outlined text-2xl">shopping_cart</span>
                                <span className={`absolute -top-3 -right-4 font-black w-7 h-7 rounded-full flex items-center justify-center text-[10px] shadow-xl border-2 ${isBrutalist ? 'bg-white text-crimson border-white' : 'bg-black text-white border-white'}`}>{cartItemCount}</span>
                            </div>
                            <span className={`uppercase tracking-[0.3em] text-[10px] ${isBrutalist ? 'font-bold' : 'font-black'}`}>
                                {isEditing ? 'Ir a Pago' : 'Ver Carrito'}
                            </span>
                        </div>
                        <div className={`flex items-center justify-center w-12 h-12 rounded-2xl ${isMidnight ? 'bg-white/10' : (isBrutalist ? 'bg-white/10' : 'bg-black/10')}`}>
                            <span className="material-symbols-outlined text-2xl">keyboard_double_arrow_right</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default MenuScreen;
