
import React from 'react';
import { CartItem, CustomerDetails } from '../types';

interface CheckoutScreenProps {
    cart: CartItem[];
    customerDetails: CustomerDetails;
    paymentMethods: string[];
    onUpdateDetails: (details: CustomerDetails | ((prev: CustomerDetails) => CustomerDetails)) => void;
    onBack: () => void;
    onSubmitOrder: () => void;
    onEditUserDetails: () => void;
    onClearCart?: () => void;
    activeRate: number;
    isEditing?: boolean;
    settings?: any;
}

const CheckoutScreen: React.FC<CheckoutScreenProps & { theme?: string }> = ({
    cart, customerDetails, paymentMethods, onUpdateDetails, onBack, onSubmitOrder, onEditUserDetails, onClearCart, activeRate, isEditing = false, theme = 'keclick', settings
}) => {
    const isBrutalist = theme === 'brutalist';
    const isMidnight = theme === 'midnight';

    const cartTotal = cart.reduce((acc, item) => {
        const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
        return acc + ((item.price + modTotal) * item.quantity);
    }, 0);

    const total = cartTotal;

    const handleChange = (field: keyof CustomerDetails, value: any) => {
        onUpdateDetails(prev => ({ ...prev, [field]: value }));
    };

    const isFormComplete = customerDetails.name.trim() !== '';

    return (
        <div className={`flex flex-col h-full overflow-hidden ${isBrutalist ? 'bg-[#121212]' : (isMidnight ? 'bg-transparent' : 'bg-black')}`}>
            <header className={`p-4 flex-shrink-0 z-20 flex items-center justify-between border-b ${isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border-white/5' : (isMidnight ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-[#111] border-white/10')}`}>
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 rounded-full active:bg-white/10 transition-all mr-2">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <div className="flex flex-col">
                        <h1 className={`text-xl font-bold text-white leading-none ${isBrutalist ? 'tracking-tight' : ''}`}>{isEditing ? 'Cobrar Cuenta' : 'Finalizar Pedido'}</h1>
                        {isEditing && <span className="text-[9px] font-bold text-amber-500 uppercase mt-1 tracking-widest">Cerrando cuenta pendiente</span>}
                    </div>
                </div>

                {isEditing && onClearCart && (
                    <button
                        onClick={onClearCart}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all active:scale-95 ${isBrutalist ? 'bg-white/5 border-white/10 text-white/60' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                    >
                        Abandonar
                    </button>
                )}
            </header>

            <div className="flex-grow overflow-y-auto p-5 space-y-6 relative scrollbar-hide">
                {isBrutalist && (
                    <>
                        <div className="fixed top-1/4 right-0 w-64 h-64 bg-crimson/[0.05] blur-[120px] rounded-full pointer-events-none"></div>
                        <div className="fixed bottom-1/4 left-0 w-64 h-64 bg-amber/[0.05] blur-[120px] rounded-full pointer-events-none"></div>
                    </>
                )}

                {/* Resumen de Pedido */}
                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border-white/[0.08] shadow-2xl' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-white/30 font-bold uppercase text-[9px] tracking-[0.2em]">Resumen del Pedido</h2>
                        <span className={`text-[8px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${isBrutalist ? 'bg-white/10 text-white border border-white/10' : 'bg-white/5 text-zinc-400'}`}>
                            {cart.reduce((a, c) => a + c.quantity, 0)} Items
                        </span>
                    </div>
                    <div className="space-y-5">
                        {cart.map(item => {
                            const unitPrice = item.price + item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
                            return (
                                <div key={item.id} className="flex flex-col gap-1 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <span className={`text-base mr-3 ${isBrutalist ? 'text-[--accent-color] font-light' : 'text-[#FFD700] font-black'}`}>{item.quantity}x</span>
                                            <span className={`text-sm text-white ${isBrutalist ? 'font-medium tracking-tight' : 'font-bold'}`}>{item.name}</span>
                                        </div>
                                        <span className={`text-base text-white ${isBrutalist ? 'font-light tracking-tighter' : 'font-black'}`}>
                                            ${(unitPrice * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                    {item.notes && (
                                        <div className="flex items-start gap-2 ml-9">
                                            <span className="material-symbols-outlined text-[14px] text-white/20">edit_note</span>
                                            <span className="text-[10px] text-white/40 italic">"{item.notes}"</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Datos del Cliente */}
                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border-white/[0.08] shadow-2xl' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isBrutalist ? 'bg-white/5 border border-white/10 text-[--brand-color]' : 'bg-red-500/10 text-red-500'}`}>
                            <span className="material-symbols-outlined text-xl">person</span>
                        </div>
                        <h2 className={`text-lg text-white ${isBrutalist ? 'font-light tracking-tight' : 'font-black uppercase'}`}>Identificación</h2>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 ml-1">Nombre o Referencia <span className="text-[--brand-color]">*</span></label>
                            <input
                                type="text"
                                value={customerDetails.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className={`w-full p-4 rounded-2xl outline-none transition-all placeholder:text-white/10 text-sm ${isBrutalist ? 'bg-black/40 border border-white/10 text-white focus:border-[--brand-color]/50 focus:bg-black/60 shadow-inner' : 'bg-white/5 border border-white/5 text-white'}`}
                                placeholder="Ej: Mesa 5 / Juan"
                            />
                        </div>

                        {!isEditing && settings?.isWhatsAppEnabled && (
                            <div>
                                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 ml-1">Teléfono (WhatsApp)</label>
                                <input
                                    type="tel"
                                    value={customerDetails.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className={`w-full p-4 rounded-2xl outline-none transition-all placeholder:text-white/10 text-sm ${isBrutalist ? 'bg-black/40 border border-white/10 text-white focus:border-[--brand-color]/50 focus:bg-black/60 shadow-inner' : 'bg-white/5 border border-white/5 text-white'}`}
                                    placeholder="Ej: 0412 1234567"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 ml-1">Instrucciones Especiales</label>
                            <textarea
                                value={customerDetails.instructions || ''}
                                onChange={(e) => handleChange('instructions', e.target.value)}
                                className={`w-full p-4 rounded-2xl outline-none transition-all placeholder:text-white/10 text-sm min-h-[100px] resize-none ${isBrutalist ? 'bg-black/40 border border-white/10 text-white focus:border-[--brand-color]/50 focus:bg-black/60 shadow-inner' : 'bg-white/5 border border-white/5 text-white'}`}
                                placeholder="Ej: Sin pepinillos, cuenta dividida, etc..."
                            />
                        </div>
                    </div>
                </div>

                {/* Método de Pago */}
                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border-white/[0.08] shadow-2xl' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isBrutalist ? 'bg-white/5 border border-white/10 text-green-400' : 'bg-green-500/10 text-green-500'}`}>
                            <span className="material-symbols-outlined text-xl">payments</span>
                        </div>
                        <h2 className={`text-lg text-white ${isBrutalist ? 'font-light tracking-tight' : 'font-black uppercase'}`}>Método de Pago</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map(method => (
                            <button
                                key={method}
                                onClick={() => handleChange('paymentMethod', method)}
                                className={`p-4 rounded-2xl border text-xs font-bold transition-all uppercase tracking-widest ${customerDetails.paymentMethod === method
                                    ? (isBrutalist ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-transparent shadow-lg shadow-green-900/40' : 'bg-green-600 text-white border-green-700 shadow-md')
                                    : (isBrutalist ? 'bg-white/5 text-white/40 border-white/5 hover:border-white/10' : 'bg-white/5 text-white/40 border-white/5')
                                    }`}
                            >
                                {method}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-20"></div> {/* Spacer for bottom button */}
            </div>

            <div className={`flex-shrink-0 p-8 pt-6 pb-10 z-30 border-t relative overflow-hidden ${isBrutalist ? 'bg-[#121212]/95 backdrop-blur-2xl border-white/10' : 'bg-[#111] border-white/5'}`}>
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex flex-col gap-1">
                        <span className="text-white/30 font-semibold uppercase tracking-[0.3em] text-[10px]">Total de Cuenta</span>
                    </div>
                    <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-white/30 text-sm font-light tracking-wider">$</span>
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

                <button
                    onClick={onSubmitOrder}
                    disabled={!isFormComplete}
                    className={`group relative w-full h-16 rounded-[2.2rem] font-bold uppercase tracking-[0.3em] text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center overflow-hidden z-10 ${isFormComplete ? 'text-white' : 'opacity-40 grayscale cursor-not-allowed text-white/50'}`}
                >
                    <div className={`absolute inset-0 transition-transform group-hover:scale-110 ${isBrutalist ? 'bg-gradient-to-br from-[#DC143C] to-[#FF2400]' : (isEditing ? 'bg-blue-600' : 'bg-green-600')}`}></div>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center justify-center gap-4">
                        <span>{isEditing ? 'PROCESAR COBRO' : 'Confirmar y Enviar Pedido'}</span>
                        <span className="material-symbols-outlined text-xl">send</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default CheckoutScreen;
