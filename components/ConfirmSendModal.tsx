import React, { useState, useEffect } from 'react';
import { Table, OrderItem, StoreProfile } from '../types';

// --- TEXT MESSAGE GENERATORS ---

const generateAdminTextMessage = (table: Table, waiter: string): string => {
  const orderIdentifier = table.orderCode || (table.orderType === 'para llevar' ? `LL-${table.number}` : `M-${table.number}`);
  const activeOrder = table.order.filter(i => i.status !== 'cancelled');
  const orderTotal = activeOrder.reduce((acc, item) => {
    const modifiersTotal = item.selectedModifiers.reduce((modAcc, mod) => modAcc + mod.option.price, 0);
    return acc + (item.price + modifiersTotal) * item.quantity;
  }, 0);

  let message = `*RESUMEN DE PEDIDO*\n\n`;
  message += `*Pedido:* ${orderIdentifier}\n`;
  if (table.customerName) {
    message += `*Cliente:* ${table.customerName}\n`;
  }
  message += `*Mesonero:* ${waiter}\n`;
  message += `*Total:* Bs. ${orderTotal.toFixed(2)}\n\n`;
  message += `_La comanda oficial fue enviada a cocina._`;
  return encodeURIComponent(message);
};

const generateKitchenDetailedTextMessage = (table: Table, waiter: string, isCancellation: boolean, itemToCancel?: OrderItem): string => {
  const { number, orderType, orderCode, observations } = table;
  const orderIdentifier = orderCode || (orderType === 'para llevar' ? `LL-${number}` : `M-${number}`);
  let message = '';
  const itemsToSend: OrderItem[] = [];
  const isInitialOrder = !table.lastSentOrder || table.lastSentOrder.length === 0;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });


  if (isCancellation && itemToCancel) {
    message += `*--- ‼️ CANCELACIÓN ‼️ ---*\n`;
    message += `*HORA: ${timeStr}*\n\n`;
    itemsToSend.push(itemToCancel);
  } else {
    message += isInitialOrder ? `*--- NUEVO PEDIDO ---*\n` : `*--- ADICIONAL ---*\n`;
    message += `*HORA: ${timeStr}*\n\n`;

    if (isInitialOrder) {
      itemsToSend.push(...table.order.filter(i => i.status !== 'cancelled'));
    } else {
      const lastSentMap = new Map<string, OrderItem>();
      (table.lastSentOrder || []).forEach(item => lastSentMap.set(item.id, item));
      table.order.filter(i => i.status !== 'cancelled').forEach(item => {
        const lastItem = lastSentMap.get(item.id);
        if (!lastItem) {
          itemsToSend.push(item);
        } else if (item.quantity > lastItem.quantity) {
          itemsToSend.push({ ...item, quantity: item.quantity - lastItem.quantity });
        }
      });
    }
  }

  message += `*Pedido:* ${orderIdentifier}\n`;
  if (table.customerName) {
    message += `*Cliente:* ${table.customerName}\n`;
  }
  message += `*Mesonero:* ${waiter}\n\n`;

  if (itemsToSend.length === 0 && !isCancellation) {
    return encodeURIComponent(`*Pedido:* ${orderIdentifier}\n*Mesonero:* ${waiter}\n\nNo hay productos nuevos para enviar a cocina.`);
  }

  message += '*--- PRODUCTOS ---*\n';
  itemsToSend.forEach(item => {
    message += `*${item.quantity}x ${item.name}*\n`;
    if (item.selectedModifiers.length > 0) {
      item.selectedModifiers.forEach(mod => {
        message += `  - ${mod.option.name}\n`;
      });
    }
  });

  if (observations?.trim()) {
    message += `\n*--- OBSERVACIONES ---*\n`;
    message += `${observations.trim()}`;
  }

  return encodeURIComponent(message);
};

// --- COMPONENT ---

interface ConfirmSendModalProps {
  table: Table;
  waiter: string;
  storeProfile: StoreProfile;
  isCancellation?: boolean;
  itemToCancel?: OrderItem;
  onClose: () => void;
  onLockOrder: () => void;
  onFinalizeOrder: () => void;
}

const ConfirmSendModal: React.FC<ConfirmSendModalProps> = ({ table, waiter, storeProfile, isCancellation = false, itemToCancel, onClose, onLockOrder, onFinalizeOrder }) => {
  // New Initial Step: 'confirm_lock' ensures user clicks a button to lock order BEFORE messaging starts.
  const [step, setStep] = useState<'confirm_lock' | 'to_admin' | 'to_kitchen' | 'awaiting_confirmation'>('confirm_lock');
  const [kitchenMessage, setKitchenMessage] = useState('');

  useEffect(() => {
    const textMessage = generateKitchenDetailedTextMessage(table, waiter, isCancellation, itemToCancel);
    setKitchenMessage(textMessage);
  }, [table, waiter, isCancellation, itemToCancel]);

  // NEW FUNCTION: Locks the order first, then proceeds to messaging
  const handleLockAndProceed = () => {
    // 1. Lock the order in the system immediately (Updates lastSentOrder snapshot, prevents editing)
    onLockOrder();

    // 2. Determine next step (Admin or Kitchen)
    if (storeProfile.adminWhatsappNumber) {
      setStep('to_admin');
    } else {
      setStep('to_kitchen');
    }
  };

  const handleSendToAdmin = () => {
    if (!storeProfile.adminWhatsappNumber) {
      setStep('to_kitchen');
      return;
    };
    const textMessage = generateAdminTextMessage(table, waiter);
    window.open(`https://wa.me/${storeProfile.adminWhatsappNumber}?text=${textMessage}`, '_blank');
    setStep('to_kitchen');
  };

  const performSendAction = async () => {
    if (!storeProfile.kitchenWhatsappNumber) return;
    window.open(`https://wa.me/${storeProfile.kitchenWhatsappNumber}?text=${kitchenMessage}`, '_blank');
  };

  const handleSendToKitchen = () => {
    performSendAction();
    setStep('awaiting_confirmation');
  };

  const handleFinalConfirmation = () => {
    // This action actually marks the table as 'Occupied/En Cocina' status
    onFinalizeOrder();
    onClose();
  };


  const renderContent = () => {
    // STEP 1: CONFIRMATION & LOCKING (New Step)
    if (step === 'confirm_lock') {
      return (
        <>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[var(--brand-color)] bg-opacity-10 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--brand-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {isCancellation ? '¿Confirmar Cancelación?' : '¿Confirmar Pedido?'}
            </h2>
            <p className="text-gray-600 mb-6">
              Al continuar, este pedido se <strong>bloqueará</strong> para evitar modificaciones.
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={handleLockAndProceed}
              className="w-full py-4 font-bold text-white bg-[var(--brand-color)] rounded-xl hover:bg-[var(--brand-color-dark)] transition-all transform active:scale-95 shadow-lg shadow-[var(--brand-shadow-color)] flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              BLOQUEAR Y ENVIAR
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Volver / Seguir Editando
            </button>
          </div>
        </>
      );
    }

    // STEP 2: SEND TO ADMIN
    if (step === 'to_admin') {
      return (
        <>
          <h2 className="text-2xl font-bold text-[var(--brand-color)] mb-4">Paso 1: Notificar a Admin</h2>
          <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="mt-4 text-gray-600">Se enviará un resumen de texto rápido a la administración como registro.</p>
          </div>
          <div className="mt-auto flex flex-col sm:flex-row gap-4 pt-4 border-t border-[var(--border-color)]">
            {/* Note: Cancel is removed here because the order is already locked. We force them forward or close. */}
            <button onClick={handleFinalConfirmation} className="w-full sm:w-auto flex-1 py-3 font-bold text-[var(--text-primary-color)] bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Saltar</button>
            <button onClick={handleSendToAdmin} className="w-full sm:w-auto flex-1 py-3 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">Enviar a Admin</button>
          </div>
        </>
      );
    }

    // STEP 3: SEND TO KITCHEN
    if (step === 'to_kitchen') {
      return (
        <>
          <h2 className="text-2xl font-bold text-[var(--brand-color)] mb-4">{storeProfile.adminWhatsappNumber ? 'Paso 2: Enviar a Cocina' : 'Enviar Pedido a Cocina'}</h2>

          <div className="flex-grow overflow-y-auto pr-2 mb-4 bg-gray-100 p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-center font-semibold text-gray-600 mb-2">Vista Previa del Mensaje</p>
            <pre className="text-xs sm:text-sm text-left text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
              {decodeURIComponent(kitchenMessage)}
            </pre>
          </div>

          <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-800">Instrucción</h3>
            <p className="text-sm text-blue-700 mt-1">Presiona el botón de abajo para abrir WhatsApp y enviar este mensaje de texto a <strong>Cocina</strong>.</p>
          </div>
          <div className="mt-auto flex flex-col sm:flex-row gap-4 pt-4 border-t border-[var(--border-color)]">
            <button onClick={handleFinalConfirmation} className="w-full sm:w-auto flex-1 py-3 font-bold text-[var(--text-primary-color)] bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cerrar sin Enviar</button>
            <button onClick={handleSendToKitchen} className="w-full sm:w-auto flex-1 py-3 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">Abrir WhatsApp</button>
          </div>
        </>
      );
    }

    // STEP 4: DONE
    if (step === 'awaiting_confirmation') {
      return (
        <>
          <h2 className="text-2xl font-bold text-green-600 mb-4">¡Proceso Finalizado!</h2>
          <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-green-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-gray-600">
              El pedido ha sido procesado.
            </p>
          </div>
          <div className="mt-auto flex flex-col sm:flex-row gap-4 pt-4 border-t border-[var(--border-color)]">
            <button onClick={performSendAction} className="w-full sm:w-auto flex-1 py-3 font-bold text-[var(--text-primary-color)] bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Reintentar WhatsApp</button>
            <button onClick={handleFinalConfirmation} className="w-full sm:w-auto flex-1 py-3 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">¡Listo, ya lo envié!</button>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default ConfirmSendModal;