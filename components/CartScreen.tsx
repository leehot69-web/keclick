
import React from 'react';
import { CartItem, Table, AppSettings, OrderItem, ModifierGroup, MenuCategory } from '../types';

interface CartScreenProps {
    // Delivery Mode Props
    cart?: CartItem[];
    onUpdateQuantity: (id: string, qty: number) => void;
    onRemoveItem: (id: string) => void;
    onClearCart?: () => void;
    onBackToMenu: () => void;
    onGoToCheckout?: () => void;
    onEditItem: (id: string) => void;
    menu?: MenuCategory[];
    allModifierGroups?: ModifierGroup[];
    activeRate: number;
    isEditing?: boolean;

    // POS Mode Props
    table?: Table | null;
    waiter?: string;
    settings?: AppSettings;
    onOpenConfirmPayModal?: (table: Table) => void;
    onFreeTable?: (table: Table) => void;
    onOpenConfirmSendModal?: (table: Table) => void;
    onOpenMoveTableModal?: (table: Table) => void;
    onOpenPendingPaymentsModal?: () => void;
    onPrintComanda?: (table: Table) => void;
    isPrinterConnected?: boolean;
    isAdmin?: boolean;
}

const CartScreen: React.FC<CartScreenProps & { theme?: string }> = (props) => {
    const { activeRate, isEditing = false, isAdmin = false, theme = 'keclick' } = props;
    const isPosMode = props.table !== undefined;
    const isBrutalist = theme === 'brutalist';
    const isMidnight = theme === 'midnight';

    // --- MODO DELIVERY / POS SIMPLE ---
    const { cart, onUpdateQuantity, onRemoveItem, onBackToMenu, onGoToCheckout, onEditItem, onClearCart } = props;
    if (!cart) return null;

    const total = cart.reduce((acc, item) => {
        const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
        return acc + ((item.price + modTotal) * item.quantity);
    }, 0);

    if (cart.length === 0) {
        return (
            <div className={`flex flex-col h-full overflow-hidden ${isBrutalist ? 'bg-[#121212]' : (isMidnight ? 'bg-transparent' : 'bg-black')}`}>
                <header className={`p-4 flex items-center border-b flex-shrink-0 z-10 ${isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border-white/5' : 'bg-black border-white/10'}`}>
                    <button onClick={onBackToMenu} className="p-2 rounded-full active:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <h1 className="ml-4 text-xl font-bold text-white">Tu Carrito</h1>
                </header>
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center relative">
                    {isBrutalist && (
                        <>
                            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-crimson/5 blur-[80px] rounded-full pointer-events-none"></div>
                            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-amber/5 blur-[80px] rounded-full pointer-events-none"></div>
                        </>
                    )}
                    <div className={`w-36 h-36 rounded-full flex items-center justify-center mb-8 ${isBrutalist ? 'bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl' : 'bg-white/5'}`}>
                        <span className={`material-symbols-outlined text-5xl ${isBrutalist ? 'text-white/20' : 'text-zinc-700'}`}>shopping_cart_off</span>
                    </div>
                    <h2 className={`text-2xl mb-2 text-white ${isBrutalist ? 'font-light tracking-tight' : 'font-black'}`}>Carrito vacío</h2>
                    <p className="text-white/40 mb-10 text-sm">¡Aún no has agregado nada!</p>
                    <button onClick={onBackToMenu} className={`px-10 py-4 font-bold rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs ${isBrutalist ? 'bg-[--red-gradient] text-white' : 'bg-[var(--brand-color)] text-white'}`}>Explorar Menú</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full overflow-hidden ${isBrutalist ? 'bg-[#121212]' : (isMidnight ? 'bg-transparent' : 'bg-black')}`}>
            <header className={`p-4 flex-shrink-0 z-20 flex items-center justify-between border-b ${isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border-white/5' : (isMidnight ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-[#111] border-white/10')}`}>
                <div className="flex items-center">
                    <button onClick={onBackToMenu} className="p-2 rounded-full active:bg-white/10 transition-all mr-2">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <div className="flex flex-col">
                        <h1 className={`text-xl font-bold text-white leading-none ${isBrutalist ? 'tracking-tight' : ''}`}>Tu Pedido</h1>
                        {isEditing && <span className="text-[9px] font-bold text-amber-500 uppercase mt-1 tracking-widest">Editando Comanda</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onClearCart && (
                        <button
                            type="button"
                            onClick={() => onClearCart()}
                            className={`p-2 rounded-xl transition-all flex items-center gap-2 px-4 relative z-50 group ${isBrutalist ? 'bg-white/[0.05] border border-white/10 text-white/60 hover:text-white' : 'text-red-600 bg-red-500/10 hover:bg-red-500/20'}`}
                        >
                            <span className="material-symbols-outlined text-xl">delete_sweep</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">{isEditing ? 'Abandonar' : 'Limpiar'}</span>
                        </button>
                    )}
                </div>
            </header>

            <div className={`flex-grow overflow-y-auto p-5 space-y-5 scrollbar-hide relative`}>
                {isBrutalist && (
                    <>
                        <div className="fixed top-1/3 left-0 w-64 h-64 bg-crimson/[0.03] blur-[120px] rounded-full pointer-events-none"></div>
                        <div className="fixed bottom-1/3 right-0 w-64 h-64 bg-amber/[0.03] blur-[120px] rounded-full pointer-events-none"></div>
                    </>
                )}

                {cart.map(item => {
                    const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
                    const unitPrice = item.price + modTotal;
                    const isOriginalItem = item.notes === 'original' || item.isOriginal || false;
                    const isLocked = (item.isServed || isOriginalItem) && !isAdmin;

                    return (
                        <div key={item.id} className={`p-6 rounded-[2rem] border transition-all flex flex-col relative overflow-hidden group ${isBrutalist
                            ? 'bg-white/[0.03] backdrop-blur-xl border-white/[0.08] shadow-2xl'
                            : (isLocked ? 'bg-[#1a1a00] border-amber-900/30' : 'bg-white/5 border-white/5 shadow-xl')}`}>

                            {isBrutalist && <div className="absolute top-0 right-0 p-4 opacity-50"><div className="w-1 h-1 rounded-full bg-white/20"></div></div>}

                            <div className="flex justify-between items-start mb-4">
                                <div className="max-w-[75%]">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`text-base ${isBrutalist ? 'text-[--accent-color] font-light' : 'text-[#FFD700] font-black'} shrink-0`}>{item.quantity}x</span>
                                        <h3 className={`text-[15px] text-white leading-tight ${isBrutalist ? 'font-semibold tracking-tight' : 'font-bold'}`}>{item.name}</h3>
                                        {item.isServed ? (
                                            <span className="bg-purple-500/10 text-purple-500 text-[8px] font-bold px-2 py-0.5 rounded-full border border-purple-500/20 uppercase tracking-tighter">Entregado</span>
                                        ) : item.isOriginal ? (
                                            (() => {
                                                const statuses = Object.values(item.kitchenStatus || {});
                                                if (statuses.includes('ready')) return <span className="bg-green-500/10 text-green-500 text-[8px] font-bold px-2 py-0.5 rounded-full border border-green-500/20 uppercase tracking-tighter">Listo</span>;
                                                if (statuses.includes('preparing')) return <span className="bg-amber-500/10 text-amber-500 text-[8px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-tighter">Preparando</span>;
                                                return <span className="bg-blue-500/10 text-blue-500 text-[8px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-tighter">Enviado</span>;
                                            })()
                                        ) : (
                                            <span className="bg-white/5 text-white/30 text-[8px] font-bold px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-tighter">Nuevo</span>
                                        )}
                                    </div>
                                    {item.selectedModifiers.length > 0 && (
                                        <div className="mt-2 space-y-1 pl-7">
                                            {(() => {
                                                const groups: Record<string, string[]> = {};
                                                item.selectedModifiers.forEach(m => {
                                                    if (!groups[m.groupTitle]) groups[m.groupTitle] = [];
                                                    groups[m.groupTitle].push(m.option.name);
                                                });
                                                return Object.entries(groups).map(([groupTitle, options]) => (
                                                    <p key={groupTitle} className="text-[10px] text-white/30 leading-tight">
                                                        <span className="font-bold uppercase text-[8px] text-white/20 mr-2 tracking-widest">{groupTitle}:</span>
                                                        <span className="font-medium text-white/50">{options.join(', ')}</span>
                                                    </p>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                    {item.notes && (
                                        <div className={`mt-4 p-3 rounded-2xl border flex gap-3 items-start ${isBrutalist ? 'bg-white/[0.02] border-white/5' : 'bg-red-500/5 border-red-500/10'}`}>
                                            <span className="material-symbols-outlined text-sm text-[--brand-color] opacity-50">edit_note</span>
                                            <p className={`text-[10px] leading-tight ${isBrutalist ? 'text-white/40 font-normal italic' : 'text-red-400 font-bold'}`}>"{item.notes}"</p>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className={`leading-none text-lg ${isBrutalist ? 'text-white font-light tracking-tighter' : 'text-white font-black'}`}>
                                        {isBrutalist ? (
                                            <>
                                                <span className="text-white/30 text-xs">$</span>
                                                <span className="font-semibold">{Math.floor(unitPrice * item.quantity)}</span>
                                                <span className="text-sm opacity-30">.{(((unitPrice * item.quantity) % 1) * 100).toFixed(0).padStart(2, '0')}</span>
                                            </>
                                        ) : `$${(unitPrice * item.quantity).toFixed(2)}`}
                                    </p>
                                    <p className="text-[9px] font-medium text-white/20 uppercase tracking-widest mt-1">Bs. {((unitPrice * item.quantity) * activeRate).toFixed(2)}</p>
                                </div>
                            </div>

                            <div className={`flex justify-between items-center mt-5 pt-5 border-t ${isBrutalist ? 'border-white/5' : 'border-white/5'}`}>
                                <div className="flex items-center gap-1">
                                    {!isOriginalItem && (
                                        <button onClick={() => onRemoveItem(item.id)} className={`text-[9px] uppercase tracking-[0.2em] px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-2 ${isBrutalist ? 'bg-white/5 text-white/30 hover:text-white/60' : 'text-red-500 font-black'}`}>
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                            {item.isServed && !isAdmin ? 'Eliminar (PIN)' : 'Eliminar'}
                                        </button>
                                    )}
                                    {!isOriginalItem && !item.isServed && (
                                        <button onClick={() => onEditItem(item.id)} className={`text-[9px] uppercase tracking-[0.2em] px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-2 ${isBrutalist ? 'bg-white/5 text-white/30 hover:text-white/60' : 'text-blue-500 font-black'}`}>
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                            Editar
                                        </button>
                                    )}
                                    {isOriginalItem && <span className="text-[9px] font-black text-white/20 uppercase tracking-widest px-3 italic">Registro Bloqueado</span>}
                                </div>
                                <div className={`flex items-center gap-4 p-1.5 rounded-2xl border border-white/5 ${isBrutalist ? 'bg-black/20' : 'bg-white/5'}`}>
                                    {isLocked || isOriginalItem ? (
                                        <div className="flex items-center gap-3 px-3">
                                            <span className="material-symbols-outlined text-lg text-white/20">lock</span>
                                            <span className={`font-medium text-white text-base ${isOriginalItem ? 'opacity-40' : ''}`}>{item.quantity}</span>
                                            <span className="material-symbols-outlined text-lg text-white/20">lock</span>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${isBrutalist ? 'bg-white/5 text-white/40 hover:text-white border border-white/10' : 'bg-white rounded-md shadow-sm text-gray-600 font-black border'}`}>
                                                <span className="material-symbols-outlined text-lg">remove</span>
                                            </button>
                                            <span className={`font-light text-white w-6 text-center text-base`}>{item.quantity}</span>
                                            <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${isBrutalist ? 'bg-gradient-to-br from-[#FFBF00] to-[#FFD700] text-black shadow-lg shadow-amber/20' : 'bg-white rounded-md shadow-sm text-gray-600 font-black border'}`}>
                                                <span className="material-symbols-outlined text-lg">add</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className={`flex-shrink-0 p-8 pt-6 pb-10 z-30 border-t relative overflow-hidden ${isBrutalist ? 'bg-[#121212]/95 backdrop-blur-2xl border-white/10' : 'bg-[#111] border-white/5'}`}>
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex flex-col gap-1">
                        <span className="text-white/30 font-semibold uppercase tracking-[0.3em] text-[10px]">Total de Cuenta</span>
                        <p className="text-[10px] font-medium text-white/10 uppercase tracking-[0.4em] transition-all">Impuestos incluidos</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-white/20 text-sm font-light tracking-wider">$</span>
                            <span className={`text-4xl leading-none transition-all ${isBrutalist ? 'text-white font-light tracking-tighter' : 'text-white font-black'}`}>
                                {isBrutalist ? (
                                    <>
                                        <span className="font-semibold">{Math.floor(total)}</span>
                                        <span className="text-2xl opacity-30">.{((total % 1) * 100).toFixed(0).padStart(2, '0')}</span>
                                    </>
                                ) : total.toFixed(2)}
                            </span>
                        </div>
                        <p className="text-[11px] font-medium text-white/20 uppercase tracking-widest mt-2 leading-none">Bs. {(total * activeRate).toFixed(2)}</p>
                    </div>
                </div>

                {onGoToCheckout && (
                    <button
                        onClick={onGoToCheckout}
                        className={`group relative w-full h-16 rounded-[2.2rem] font-bold uppercase tracking-[0.35em] text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center overflow-hidden z-10 ${isEditing ? 'text-white' : 'text-white'}`}
                    >
                        <div className={`absolute inset-0 transition-transform group-hover:scale-110 ${isBrutalist ? 'bg-gradient-to-br from-[#DC143C] to-[#FF2400]' : (isEditing ? 'bg-green-600' : 'bg-[var(--brand-color)]')}`}></div>
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center justify-center gap-4">
                            <span>{isEditing ? 'Confirmar Pago' : 'Proceder al Pago'}</span>
                            <span className="material-symbols-outlined text-xl">keyboard_double_arrow_right</span>
                        </div>
                        {isBrutalist && <div className="absolute inset-0 shadow-[0_0_30px_rgba(220,20,60,0.4)] opacity-50"></div>}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CartScreen;
