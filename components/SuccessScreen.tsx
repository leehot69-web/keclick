
import React from 'react';
import { CartItem, CustomerDetails } from '../types';

interface SuccessScreenProps {
  cart: CartItem[];
  customerDetails: CustomerDetails;
  onStartNewOrder: () => void;
  onReprint: () => void;
  isPrinterConnected: boolean;
  activeRate: number;
  settings: any;
}

const SuccessScreen: React.FC<SuccessScreenProps & { theme?: string }> = ({
  cart,
  customerDetails,
  onStartNewOrder,
  onReprint,
  isPrinterConnected,
  activeRate,
  settings,
  theme = 'keclick'
}) => {
  const isBrutalist = theme === 'brutalist';
  const isMidnight = theme === 'midnight';

  const total = cart.reduce((acc, item) => {
    const modTotal = item.selectedModifiers.reduce((s, m) => s + m.option.price, 0);
    return acc + ((item.price + modTotal) * item.quantity);
  }, 0);

  return (
    <div className={`flex flex-col items-center justify-center h-full p-8 text-center relative overflow-hidden ${isBrutalist ? 'bg-[#121212]' : (isMidnight ? 'bg-transparent' : 'bg-black')}`}>
      {isBrutalist && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-crimson/5 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber/5 blur-[100px] rounded-full pointer-events-none"></div>
        </>
      )}

      <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 relative z-10 ${isBrutalist ? 'bg-white/[0.03] border border-white/10 shadow-[0_0_50px_rgba(220,20,60,0.15)]' : 'bg-[#111] border border-[#FF0000]/20 shadow-xl'}`}>
        <span className={`material-symbols-outlined text-4xl ${isBrutalist ? 'text-[--brand-color]' : 'text-[#FF0000]'}`}>check_circle</span>
      </div>

      <h2 className={`text-3xl mb-3 z-10 ${isBrutalist ? 'text-white font-light tracking-tight' : 'text-white font-black uppercase'}`}>
        {isBrutalist ? <><span className="font-semibold block">Pedido</span> <span className="opacity-50">Registrado</span></> : '¡Pedido Registrado!'}
      </h2>
      <p className={`mb-10 text-[10px] font-medium uppercase tracking-[0.3em] leading-relaxed max-w-xs z-10 ${isBrutalist ? 'text-white/30' : 'text-gray-400'}`}>
        El pedido se ha procesado con éxito.<br />Procesando en cocina ahora mismo.
      </p>

      {/* Resumen del Pedido */}
      <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border relative overflow-hidden mb-12 text-left z-10 ${isBrutalist ? 'bg-white/[0.03] backdrop-blur-xl border-white/[0.08] shadow-2xl' : 'bg-[#111] border-white/5 shadow-2xl'}`}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-[9px] font-bold uppercase text-white/20 tracking-[0.25em]">Resumen de Venta</h3>
          <span className="text-[10px] font-bold text-[--brand-color] uppercase tracking-widest">{customerDetails.paymentMethod}</span>
        </div>

        <div className="flex justify-between items-center mb-6">
          <span className="text-[11px] font-medium text-white/40 uppercase tracking-widest">Referencia</span>
          <span className="text-sm font-semibold text-white uppercase tracking-tight">{customerDetails.name}</span>
        </div>

        <div className="flex justify-between items-end pt-8 border-t border-white/5">
          <span className="text-[11px] font-medium text-white/40 uppercase tracking-widest mb-2">Total Final</span>
          <div className="text-right">
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-white/20 text-sm font-light tracking-wider">$</span>
              <span className={`text-4xl leading-none ${isBrutalist ? 'text-white font-semibold tracking-tighter' : 'text-[#FFD700] font-black'}`}>
                {isBrutalist ? (
                  <>
                    <span>{Math.floor(total)}</span>
                    <span className="text-2xl opacity-30">.{((total % 1) * 100).toFixed(0).padStart(2, '0')}</span>
                  </>
                ) : total.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] font-medium text-white/20 uppercase tracking-widest mt-2">Bs. {(total * activeRate).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4 z-10">
        <button
          onClick={onStartNewOrder}
          className={`group relative w-full h-16 rounded-[2.2rem] font-bold uppercase tracking-[0.35em] text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center overflow-hidden z-10 text-white`}
        >
          <div className={`absolute inset-0 transition-transform group-hover:scale-110 ${isBrutalist ? 'bg-gradient-to-br from-[#DC143C] to-[#FF2400]' : 'bg-[#FF0000]'}`}></div>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="relative">Nuevo Pedido</span>
        </button>

        {isPrinterConnected && (
          <button
            onClick={onReprint}
            className={`w-full h-14 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all flex items-center justify-center gap-3 border ${isBrutalist
              ? 'bg-white/[0.05] text-white/40 border-white/10'
              : 'bg-white/5 text-gray-300 border-white/5'}`}
          >
            <span className="material-symbols-outlined text-lg">print</span>
            Re-imprimir Recibo
          </button>
        )}

        {settings?.isWhatsAppEnabled && customerDetails.phone && (
          <button
            onClick={() => {
              const totalStr = total.toFixed(2);
              const msg = `*RECIBO DE VENTA - ${settings.businessName}*\n\nHola *${customerDetails.name}*, aquí tienes tu recibo:\n\n*Items:*\n${cart.map(i => `• ${i.quantity}x ${i.name} - $${(i.price * i.quantity).toFixed(2)}`).join('\n')}\n\n*TOTAL: $${totalStr}*\n*Método: ${customerDetails.paymentMethod}*\n\n¡Gracias por tu preferencia!`;
              window.open(`https://wa.me/${customerDetails.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            className={`w-full h-14 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all flex items-center justify-center gap-3 border ${isBrutalist
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-green-600/10 text-green-500 border-green-600/20'}`}
          >
            <span className="material-symbols-outlined text-lg">chat</span>
            Enviar por WhatsApp
          </button>
        )}
      </div>
    </div>
  );
};

export default SuccessScreen;
