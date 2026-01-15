
import React from 'react';
import { Table, WaiterAssignments } from '../types';

interface PendingPaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  waiter: string;
  waiterAssignments: WaiterAssignments;
  onSelectTable: (tableNumber: number) => void;
}

const PendingPaymentsModal: React.FC<PendingPaymentsModalProps> = ({ isOpen, onClose, tables, waiter, waiterAssignments, onSelectTable }) => {
  if (!isOpen) return null;

  const assignedTableNumbers = new Set(waiterAssignments[waiter] || []);
  const pendingTables = tables.filter(
    t => t.status === 'no pagada' && assignedTableNumbers.has(t.number)
  );

  const calculateTotal = (table: Table) => {
    return table.order.reduce((acc, item) => {
      const modifiersTotal = item.selectedModifiers.reduce((modAcc, mod) => modAcc + mod.option.price, 0);
      return acc + (item.price + modifiersTotal) * item.quantity;
    }, 0);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-[var(--brand-color)] mb-4">Cuentas por Cobrar</h2>
        <p className="text-gray-500 mb-6">Listado de tus mesas con pagos pendientes.</p>

        <div className="flex-grow overflow-y-auto pr-2 space-y-3">
          {pendingTables.length > 0 ? (
            pendingTables
              .sort((a, b) => (a.sentToKitchenAt ? new Date(a.sentToKitchenAt).getTime() : 0) - (b.sentToKitchenAt ? new Date(b.sentToKitchenAt).getTime() : 0))
              .map(table => {
                const total = calculateTotal(table);
                const sentAtTime = table.sentToKitchenAt
                  ? new Date(table.sentToKitchenAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                  : 'N/A';

                return (
                  <button
                    key={table.number}
                    onClick={() => onSelectTable(table.number)}
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg transition-colors text-left"
                  >
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">
                        {table.orderType === 'para llevar' ? `Para Llevar #${table.number}` : `Mesa ${table.number}`}
                      </h3>
                      <p className="text-sm text-gray-500">Enviado: {sentAtTime}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl text-[var(--brand-color)]">${total.toFixed(2)}</p>
                    </div>
                  </button>
                )
              })
          ) : (
            <div className="text-center py-10 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-bold text-gray-600">¡Todo al día!</h3>
              <p className="mt-1">No tienes cuentas pendientes por cobrar.</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 font-bold text-white bg-[var(--brand-color)] rounded-lg hover:bg-[var(--brand-color-dark)] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingPaymentsModal;
