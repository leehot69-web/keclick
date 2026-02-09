
import React, { useState, useMemo } from 'react';
import { SaleRecord, CartItem, OrderItem } from '../types';

interface SalesHistoryModalProps {
  reports: SaleRecord[];
  onClose: () => void;
}

type AggregatedSales = {
  [productName: string]: {
    totalQuantity: number;
    sales: {
      quantity: number;
      customer: string;
    }[];
  };
};

const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({ reports, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const aggregatedData = useMemo(() => {
    const dailyReports = reports.filter(r => r.date === selectedDate && r.notes !== 'ANULADO');
    const aggregation: AggregatedSales = {};

    for (const report of dailyReports) {
      for (const item of report.order as (CartItem | OrderItem)[]) {
        if (!aggregation[item.name]) {
          aggregation[item.name] = { totalQuantity: 0, sales: [] };
        }
        aggregation[item.name].totalQuantity += item.quantity;
        aggregation[item.name].sales.push({
          quantity: item.quantity,
          customer: report.customerName || `Ref: ${report.tableNumber}`,
        });
      }
    }
    return aggregation;
  }, [reports, selectedDate]);

  const adjustDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const topProducts = useMemo(() => {
    return (Object.entries(aggregatedData) as [string, AggregatedSales[string]][])
      .sort(([, a], [, b]) => b.totalQuantity - a.totalQuantity);
  }, [aggregatedData]);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4 backdrop-blur-2xl" onClick={onClose}>
      <div className="bg-[#12110e] border border-white/10 rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white italic">Inventario de Ventas</h2>
            <p className="text-[10px] font-black text-[#f2a60d] uppercase tracking-widest mt-1">Top Productos del Día</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined font-black">close</span>
          </button>
        </header>

        {/* Date Selector */}
        <div className="px-8 py-6 bg-black/40 border-b border-white/5 flex items-center justify-between">
          <button onClick={() => adjustDate(-1)} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-[#f2a60d] active:scale-90 transition-transform">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">{isToday ? 'Ventas de Hoy' : 'Historial'}</p>
            <p className="text-2xl font-black text-white tabular-nums tracking-tighter">{selectedDate}</p>
          </div>
          <button onClick={() => adjustDate(1)} disabled={isToday} className={`w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-[#f2a60d] active:scale-90 transition-transform ${isToday ? 'opacity-10' : ''}`}>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-8 space-y-4 scrollbar-hide">
          {topProducts.length === 0 ? (
            <div className="py-24 text-center">
              <span className="material-symbols-outlined text-6xl text-white/5 mb-4 block">inventory_2</span>
              <p className="text-white/20 italic text-sm font-medium tracking-wide font-sans">No se encontraron ventas para esta fecha</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {topProducts.map(([productName, data], idx) => {
                const maxQty = topProducts[0][1].totalQuantity;
                const percentage = (data.totalQuantity / maxQty) * 100;

                return (
                  <div key={productName} className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 hover:bg-white/[0.05] transition-all group">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-[#f2a60d] border border-white/10">#{idx + 1}</span>
                        <h3 className="font-black text-white text-base uppercase tracking-tight truncate max-w-[200px]">{productName}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Items</p>
                        <p className="text-2xl font-black text-[#f2a60d] tabular-nums tracking-tighter">{data.totalQuantity}</p>
                      </div>
                    </div>

                    <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="absolute h-full bg-gradient-to-r from-[#f2a60d]/40 to-[#f2a60d] transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(242,166,13,0.3)]"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center shrink-0">
          <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em]">Análisis de Inventario Real-Time</p>
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryModal;
