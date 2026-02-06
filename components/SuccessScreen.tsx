
import React from 'react';
import { CartItem, CustomerDetails } from '../types';

interface SuccessScreenProps {
  cart: CartItem[];
  customerDetails: CustomerDetails;
  onStartNewOrder: () => void;
  onReprint: () => void;
  isPrinterConnected: boolean;
  activeRate: number;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  cart,
  customerDetails,
  onStartNewOrder,
  onReprint,
  isPrinterConnected,
  activeRate
}) => {
  const total = cart.reduce((acc, item) => {
    const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
    return acc + ((item.price + modTotal) * item.quantity);
  }, 0);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black p-6 text-center">
      <div className="w-20 h-20 bg-[#111] rounded-full flex items-center justify-center mb-6 border border-[#FF0000]/20 shadow-xl shadow-red-900/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#FF0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-white mb-2 uppercase">¡Pedido Registrado!</h2>
      <p className="text-gray-400 mb-8 text-[11px] font-bold uppercase tracking-widest leading-relaxed max-w-xs">El pedido se ha procesado con éxito.<br />Puedes re-imprimir el recibo si lo deseas.</p>

      {/* Resumen del Pedido */}
      <div className="w-full max-w-sm bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-2xl mb-8 text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF0000]/5 rounded-full blur-2xl"></div>
        <h3 className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] mb-4">Resumen de Venta</h3>
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">Referencia:</span>
          <span className="text-sm font-black text-white uppercase">{customerDetails.name}</span>
        </div>
        <div className="flex justify-between items-end pt-4 border-t border-white/5">
          <span className="text-sm font-black text-white uppercase tracking-tighter mb-1">Total Final:</span>
          <div className="text-right">
            <span className="text-3xl font-black text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.2)] leading-none">${total.toFixed(2)}</span>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Bs. {(total * activeRate).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={onStartNewOrder}
          className="w-full py-5 bg-[#FF0000] text-white rounded-2xl font-black uppercase shadow-xl shadow-red-900/10 tracking-widest transform active:scale-95 transition-all text-sm"
        >
          Nuevo Pedido
        </button>
        <button
          onClick={onReprint}
          disabled={!isPrinterConnected}
          className="w-full py-4 bg-white/5 text-gray-300 rounded-2xl font-black uppercase tracking-widest transform active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed border border-white/5 text-[10px]"
          title={!isPrinterConnected ? "Conecta una impresora para re-imprimir" : "Re-imprimir recibo"}
        >
          Re-imprimir Recibo
        </button>
      </div>
    </div>
  );
};

export default SuccessScreen;
