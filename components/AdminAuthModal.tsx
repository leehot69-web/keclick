
import React, { useState, useRef, useEffect } from 'react';

interface AdminAuthModalProps {
  validPins: string[];
  onClose: () => void;
  onSuccess: (reason?: string) => void;
  title?: string;
  requireReason?: boolean;
}

const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ validPins, onClose, onSuccess, title = "Autorización Requerida", requireReason = false }) => {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input when the modal opens
    inputRef.current?.focus();
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and limit to 4 digits
    if (/^\d*$/.test(value) && value.length <= 4) {
      setPin(value);
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (requireReason && !reason.trim()) {
      setError('Debe indicar un motivo para esta acción.');
      return;
    }

    if (validPins.includes(pin)) {
      onSuccess(reason);
    } else {
      setError('PIN incorrecto. Intente de nuevo.');
      setPin(''); // Clear input on error
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm border border-black/5"
        style={{ backgroundColor: 'var(--page-bg-color)', color: 'var(--text-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-500/10">
            <svg className="h-7 w-7 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black leading-6 mt-6 uppercase tracking-tighter" id="modal-title">
            {title}
          </h3>
          <p className="text-xs font-bold opacity-60 mt-3 uppercase tracking-widest">
            Autorización de Seguridad Requerida
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">

          {requireReason && (
            <div>
              <label htmlFor="reason" className="block text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">
                Motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-black/5 border border-black/10 rounded-2xl focus:outline-none focus:border-red-500 text-sm font-bold"
                placeholder="Indique el motivo..."
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="admin-pin" className="block text-[10px] font-black uppercase tracking-widest opacity-70 mb-2 text-center">
              Ingrese PIN Admin
            </label>
            <input
              ref={inputRef}
              id="admin-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={handlePinChange}
              className="w-full px-4 py-4 text-center text-2xl tracking-[0.8em] font-black bg-black/5 border border-black/10 rounded-[1.5rem] focus:outline-none focus:border-red-500 transition-all placeholder:tracking-normal placeholder:font-normal"
              placeholder="••••"
              maxLength={4}
              autoComplete="off"
            />
            {error && <p className="mt-3 text-[10px] font-black uppercase text-center text-red-600 animate-pulse">{error}</p>}
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={pin.length < 4 || (requireReason && !reason.trim())}
              className="w-full py-5 bg-[#FF0000] text-white font-black rounded-2xl uppercase tracking-widest text-sm shadow-xl shadow-red-500/20 active:scale-95 transition-all disabled:bg-gray-400 disabled:shadow-none"
            >
              Confirmar
            </button>
            <button
              onClick={onClose}
              type="button"
              className="w-full py-4 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAuthModal;
