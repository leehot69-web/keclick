
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onEnter: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const logoUrl = 'https://i.ibb.co/9HxvMhx/keclick-logo.png';

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#000000] flex flex-col items-center justify-center overflow-hidden font-sans text-white">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-[#FF0000]/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-[#FFD700]/10 rounded-full blur-[100px]"></div>

      {/* Contenedor del Logo */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 transform ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <div className="w-56 h-56 bg-[#111] rounded-[3rem] shadow-[0_25px_60px_rgba(255,0,0,0.1)] p-4 flex flex-col items-center justify-center mb-8 animate-pulse-slow border border-white/5">
          <div className="text-6xl font-black uppercase tracking-tighter flex items-center mb-2">
            <span className="text-[#FF0000]">Ke</span>
            <span className="text-[#FFD700]">click</span>
          </div>
          <div className="w-12 h-1.5 bg-[#FF0000] rounded-full"></div>
        </div>

        <h1 className="text-white text-3xl font-black uppercase tracking-[0.1em] mb-1 text-center italic">
          <span className="text-[#FF0000]">KE</span><span className="text-[#FFD700]">CLICK</span>
        </h1>
        <p className="text-gray-400 text-[10px] font-black tracking-[0.4em] uppercase">Gestión de Mesas PRO</p>
      </div>

      {/* Botón de Entrada */}
      <div className={`absolute bottom-20 w-full max-w-xs px-6 z-10 transition-all duration-700 delay-500 transform ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <button
          onClick={onEnter}
          className="w-full py-5 font-black text-xl text-black bg-[#FFD700] rounded-[1.5rem] hover:bg-[#FFC000] transition-all transform active:scale-95 shadow-[0_15px_40px_rgba(255,215,0,0.3)] uppercase tracking-widest border-b-6 border-[#CC9900]"
        >
          Entrar al Sistema
        </button>
        <p className="text-gray-600 text-[8px] text-center mt-6 font-black uppercase tracking-widest">
          Control Total • Facturación Flexible
        </p>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
