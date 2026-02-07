
import React from 'react';

interface InstallPromptModalProps {
  onClose: () => void;
  onInstall: () => void;
  platform: 'ios' | 'android' | 'other';
}

const InstallPromptModal: React.FC<InstallPromptModalProps> = ({ onClose, onInstall, platform }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div className="bg-[#051a12] rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-slideInUp overflow-hidden relative" onClick={e => e.stopPropagation()}>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#00D4AA] to-[#FFD700]"></div>
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 sm:hidden"></div>

        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center mx-auto shadow-xl border border-white/10 p-2 transform -rotate-3">
              <img src="https://i.ibb.co/9HxvMhx/keclick-logo.png" alt="Keclick Logo" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#00D4AA] text-[#051a12] p-1.5 rounded-full shadow-lg border-4 border-[#051a12]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Instalar App</h2>
          <p className="text-gray-400 text-sm font-medium mb-8 px-4 leading-relaxed">
            Obtén una experiencia <span className="text-[#00D4AA] font-bold">más rápida y eficiente</span> instalando nuestra App oficial en tu pantalla de inicio.
          </p>

          {platform === 'ios' ? (
            <div className="space-y-4 text-left mb-8 px-2">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm">
                <div className="w-10 h-10 bg-white/10 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-gray-300">1. Toca el botón de <span className="text-blue-400 font-black">COMPARTIR</span> abajo en Safari.</p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm">
                <div className="w-10 h-10 bg-white/10 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-gray-300">2. Selecciona <span className="text-white font-black">"AÑADIR A PANTALLA DE INICIO"</span>.</p>
              </div>
            </div>
          ) : (
            <div className="mb-8 px-2 space-y-4">
              <button
                onClick={onInstall}
                className="w-full py-5 bg-[#00D4AA] text-[#051a12] font-black rounded-2xl shadow-[0_12px_30px_rgba(0,212,170,0.3)] uppercase tracking-widest text-lg transform active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Instalar Ahora
              </button>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Si el botón no funciona:</p>
                <p className="text-xs text-gray-400 leading-tight">
                  Toca los tres puntos <span className="text-white font-black">⋮</span> del navegador y selecciona <span className="text-white font-black">Instalar aplicación</span> o <span className="text-white font-black">Agregar a pantalla de inicio</span>.
                </p>
              </div>
            </div>
          )}

          <button onClick={onClose} className="text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors py-2">
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPromptModal;
