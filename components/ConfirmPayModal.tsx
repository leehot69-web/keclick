
import React from 'react';
import { Table, OrderItem, AppSettings } from '../types';

interface ConfirmPayModalProps {
  table: Table;
  settings: AppSettings;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmPayModal: React.FC<ConfirmPayModalProps> = ({ table, settings, onClose, onConfirm }) => {
  const calculateTotal = (order: OrderItem[]) => {
    const activeOrder = order.filter(item => item.status !== 'cancelled');
    return activeOrder.reduce((acc, item) => {
      const modifiersTotal = item.selectedModifiers.reduce((modAcc, mod) => modAcc + mod.option.price, 0);
      return acc + (item.price + modifiersTotal) * item.quantity;
    }, 0);
  };

  const total = calculateTotal(table.order);
  const paidAmount = table.paidAmount || 0;
  const pendingAmount = total - paidAmount;

  const handleConfirm = () => {
    onConfirm();
  };

  const activeOrderItems = table.order.filter(item => item.status !== 'cancelled');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[var(--brand-color)] text-[var(--text-on-brand-bg)] p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">Mesa {table.number} - Pago</h2>
          <p className="font-semibold opacity-80">COMPLETANDO</p>
        </div>

        <div className="p-6">
          <h3 className="font-bold text-lg mb-4 text-[var(--text-primary-color)]">Resumen del Pedido</h3>
          <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2">
            {activeOrderItems.map(item => {
              const modifiersTotal = item.selectedModifiers.reduce((acc, mod) => acc + mod.option.price, 0);
              const itemTotal = (item.price + modifiersTotal) * item.quantity;
              return (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="text-[var(--text-secondary-color)]">{item.quantity} x {item.name}</span>
                  <span className="font-semibold text-[var(--text-primary-color)]">${itemTotal.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 border-t border-[var(--border-color)] py-4">
            <div className="flex justify-between items-center text-lg">
              <span className="text-[var(--text-secondary-color)]">Total del Pedido:</span>
              <span className="font-bold text-[var(--text-primary-color)]">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-lg text-green-600">
              <span className="">Monto Pagado:</span>
              <span className="font-bold">-${paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xl text-[var(--brand-color)] pt-2 mt-2 border-t border-[var(--border-color)]">
              <span className="font-bold">Total a Pagar:</span>
              <div className="text-right">
                <span className="font-black text-3xl">${pendingAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={onClose}
              className="w-full sm:w-auto flex-1 py-3 font-bold text-[var(--text-primary-color)] bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="w-full sm:w-auto flex-1 py-3 font-bold text-white bg-[var(--brand-color)] rounded-lg hover:bg-[var(--brand-color-dark)] transition-colors"
            >
              Confirmar y Pagar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPayModal;
