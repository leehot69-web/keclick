
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
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
    cart, customerDetails, paymentMethods, onUpdateDetails, onBack, onSubmitOrder, onEditUserDetails, onClearCart, activeRate, isEditing = false
}) => {

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
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            <header className="p-4 bg-white shadow-sm flex-shrink-0 z-10 flex items-center justify-between">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-gray-800 leading-none">{isEditing ? 'Cobrar Cuenta' : 'Finalizar Pedido'}</h1>
                        {isEditing && <span className="text-[10px] font-black text-amber-500 uppercase mt-1">Cerrando cuenta pendiente</span>}
                    </div>
                </div>

                {isEditing && onClearCart && (
                    <button
                        onClick={onClearCart}
                        className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200 active:scale-95 transition-all"
                    >
                        Abandonar
                    </button>
                )}
            </header>

            <div className="flex-grow overflow-y-auto p-4 space-y-6">

                {/* Datos del Cliente */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
                    <div className="flex items-center">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[var(--brand-color)]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            Datos de la Mesa / Cliente
                        </h2>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre o Referencia <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={customerDetails.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-[var(--brand-color)] focus:border-[var(--brand-color)] outline-none transition-all"
                            placeholder="Ej: Mesa 5 / Juan"
                        />
                    </div>

                    {!isEditing && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono (Opcional)</label>
                            <input
                                type="tel"
                                value={customerDetails.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full p-3 bg-white border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-[var(--brand-color)] focus:border-[var(--brand-color)] outline-none transition-all"
                                placeholder="Ej: 0412 1234567"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nota del Pedido</label>
                        <input
                            type="text"
                            value={customerDetails.instructions || ''}
                            onChange={(e) => handleChange('instructions', e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-[var(--brand-color)] focus:border-[var(--brand-color)] outline-none transition-all"
                            placeholder="Ej: Sin pepinillos, cuenta dividida..."
                        />
                    </div>
                </div>

                {/* Método de Pago */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                        Método de Pago Recibido
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map(method => (
                            <button
                                key={method}
                                onClick={() => handleChange('paymentMethod', method)}
                                className={`p-3 rounded-lg border text-sm font-semibold transition-all ${customerDetails.paymentMethod === method
                                        ? 'bg-green-600 text-white border-green-700 shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {method}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 flex-shrink-0">
                <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                    <span>Monto Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <span className="font-bold text-gray-800 text-lg">Total a Recibir</span>
                    <div className="text-right">
                        <span className="font-black text-3xl text-gray-900">${total.toFixed(2)}</span>
                        <p className="text-sm font-bold text-gray-500">Bs. {(total * activeRate).toFixed(2)}</p>
                    </div>
                </div>

                <button
                    onClick={onSubmitOrder}
                    disabled={!isFormComplete}
                    className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isFormComplete
                            ? (isEditing ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-green-600 text-white shadow-green-200')
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    <span>{isEditing ? 'PROCESAR COBRO' : 'Finalizar Pedido'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default CheckoutScreen;
